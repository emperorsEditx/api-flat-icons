import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Icon, IconStatus, IconStyle, IconType } from './entities/icon.entity';
import { Tag, TaggableType } from '../tags/entites/tag.entity';
import { R2Service } from '../r2/r2.service';
import { User } from '../user/entities/user.entity';
import { UpdateIconDto } from './dto/update-icon.dto';
import Anthropic from '@anthropic-ai/sdk';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

export interface AiFillResult {
  description: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
}

export interface AiFillBulkResponse {
  perIcon: { id: number; status: string; data: AiFillResult | null; error: string | null }[];
  packSummary: AiFillResult;
}

@Injectable()
export class IconsService {
  private readonly anthropic: Anthropic;

  constructor(
    @InjectRepository(Icon)
    private readonly iconRepository: Repository<Icon>,
    private readonly dataSource: DataSource,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly r2Service: R2Service,
  ) {
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  /* -----------------------------------------------------
     STEP 5 — GET PENDING ICONS (GROUPED BY USER)
  ----------------------------------------------------- */
  async getPendingIcons() {
    const iconRepo = this.dataSource.getRepository(Icon);

    const pendingIcons = await iconRepo.find({
      where: { status: IconStatus.PENDING },
      order: { created_at: 'DESC' }
    });

    const groups: Record<number, Icon[]> = {};
    for (const icon of pendingIcons) {
      const uid = icon.created_by || 0;
      if (!groups[uid]) groups[uid] = [];
      groups[uid].push(icon);
    }

    const userRepo = this.dataSource.getRepository(User);
    const userIds = Object.keys(groups).map(Number);
    let users: User[] = [];
    if (userIds.length > 0) {
      users = await userRepo.find({ where: userIds.map(id => ({ id })) });
    }

    return Object.keys(groups).map(userId => {
      const numId = Number(userId);
      const user = users.find(u => u.id === numId);
      return {
        userId: numId,
        userName: user ? user.name : `User ${numId}`,
        icons: groups[numId]
      };
    });
  }

  /* -----------------------------------------------------
     STEP 6 — APPROVE ICONS (BULK)
  ----------------------------------------------------- */
  async approveIcons(ids: number[]) {
    if (!ids || ids.length === 0) return { success: false, message: 'No IDs provided' };

    const iconRepo = this.dataSource.getRepository(Icon);
    const icons = await iconRepo.find({ where: ids.map(id => ({ id })) });

    let count = 0;
    for (const icon of icons) {
      // If icon is still DRAFT, we must publish it first
      if (icon.status === IconStatus.DRAFT) {
        if (!icon.category_id) {
          console.warn(`Skipping approval for icon ${icon.id}: Missing Category`);
          continue;
        }

        const filename = icon.path.split('/').pop();
        const finalKey = `icons/${icon.style}/${icon.category_id}/${icon.id}-${filename}`;

        // Move file (Copy + Delete)
        await this.r2Service.copyObject(icon.path, finalKey);
        await this.r2Service.deleteObject(icon.path);

        icon.path = finalKey;
      }

      icon.status = IconStatus.ACTIVE;
      icon.approved = true;
      await iconRepo.save(icon);
      count++;
    }

    return { success: true, count };
  }


  /* -----------------------------------------------------
     STEP 1 — TEMP UPLOAD (CREATE DB ENTRY DRAFT)
  ----------------------------------------------------- */
  async uploadTempIcon(file: UploadedFile, userId: number) {
    if (!file) {
      throw new BadRequestException('File not provided');
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const key = `temp/icons/${userId}/${filename}`;

    // Upload to R2
    await this.r2Service.putObject(key, file.buffer, file.mimetype);

    // CREATE DB ENTRY IMMEADIATELY AS DRAFT
    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = iconRepo.create({
      title: file.originalname,
      path: key,
      type: IconType.SVG,
      status: IconStatus.DRAFT,
      created_by: userId,
      style: IconStyle.OUTLINE
    });

    return await iconRepo.save(icon);
  }

  /* -----------------------------------------------------
     STEP 2 — GET DRAFTS (FROM DB)
  ----------------------------------------------------- */
  async getDrafts(userId: number) {
    const iconRepo = this.dataSource.getRepository(Icon);
    return iconRepo.find({
      where: {
        created_by: userId,
        status: IconStatus.DRAFT
      },
      relations: ['tags'],
      order: { created_at: 'DESC' }
    });
  }

  /* -----------------------------------------------------
     STEP 3 — UPDATE DRAFT METADATA
  ----------------------------------------------------- */
  async update(id: number, updateIconDto: UpdateIconDto) {
    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = await iconRepo.findOne({ where: { id } });

    // DEBUG: log incoming payload for troubleshooting live update issues
    try {
      console.log(`[IconsService.update] incoming id=${id} payload=`, updateIconDto);
    } catch (e) {
      // ignore logging errors
    }

    if (!icon) {
      throw new BadRequestException('Icon not found');
    }

    if (updateIconDto.title) icon.title = updateIconDto.title;
    if (updateIconDto.description !== undefined) icon.description = updateIconDto.description;
    if (updateIconDto.metaTitle !== undefined) icon.metaTitle = updateIconDto.metaTitle;
    if (updateIconDto.metaDescription !== undefined) icon.metaDescription = updateIconDto.metaDescription;
    if (updateIconDto.categoryId !== undefined) icon.category_id = updateIconDto.categoryId;
    if (updateIconDto.subCategoryId !== undefined) icon.sub_category_id = updateIconDto.subCategoryId;
    if (updateIconDto.style) icon.style = updateIconDto.style;

    // Handle Tags if provided
    if (updateIconDto.tags) {
      await this.tagRepository.delete({ taggable_id: id, taggable_type: TaggableType.ICON });

      const newTags = updateIconDto.tags.map((tagName: string) => {
        return this.tagRepository.create({
          taggable_id: id,
          taggable_type: TaggableType.ICON,
          name: tagName,
          icon: icon
        });
      });

      await this.tagRepository.save(newTags);
    }

    const saved = await iconRepo.save(icon);
    // DEBUG: log saved fields to verify persistence
    try {
      console.log(`[IconsService.update] saved id=${saved.id} description=${saved.description} metaTitle=${saved.metaTitle} metaDescription=${saved.metaDescription}`);
    } catch (e) {
      // ignore logging errors
    }
    return saved;
  }

  /* -----------------------------------------------------
     STEP 4 — PUBLISH (MOVE FILE + UPDATE STATUS)
  ----------------------------------------------------- */
  async publish(id: number) {
    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = await iconRepo.findOne({ where: { id } });

    if (!icon) throw new BadRequestException('Icon not found');
    if (icon.status !== IconStatus.DRAFT) throw new BadRequestException('Icon is not a draft');
    if (!icon.category_id || !icon.sub_category_id) throw new BadRequestException('Category and SubCategory are required');

    // CONSTRUCT FINAL PATH
    const filename = icon.path.split('/').pop();
    const finalKey = `icons/${icon.style}/${icon.category_id}/${icon.id}-${filename}`;

    // Copy in R2
    await this.r2Service.copyObject(icon.path, finalKey);
    // Delete original temp
    await this.r2Service.deleteObject(icon.path);

    icon.path = finalKey;
    icon.status = IconStatus.PENDING;

    return await iconRepo.save(icon);
  }

  /* -----------------------------------------------------
     OPTIONAL — DELETE DRAFT (CANCEL)
  ----------------------------------------------------- */
  async deleteDraft(id: number) {
    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = await iconRepo.findOne({ where: { id } });

    if (icon) {
      // Delete file from R2
      await this.r2Service.deleteObject(icon.path);
      await iconRepo.remove(icon);
    }
    return { success: true };
  }

  /* -----------------------------------------------------
      EXISTING — GET ICONS FROM DB
   ----------------------------------------------------- */
  async getIcons(categoryId: number, style?: IconStyle) {
    const iconRepo = this.dataSource.getRepository(Icon);

    return iconRepo.find({
      where: {
        category_id: categoryId,
        ...(style ? { style } : {}),
        status: IconStatus.ACTIVE
      },
      order: { id: 'DESC' },
    });
  }

  /* -----------------------------------------------------
     STEP 7 — GET ALL APPROVED ICONS (PUBLIC)
  ----------------------------------------------------- */
  async findAllApproved(style?: IconStyle) {
    const iconRepo = this.dataSource.getRepository(Icon);
    const query = iconRepo.createQueryBuilder('icon')
      .where('icon.approved = :approved', { approved: true })
      .andWhere('icon.status = :status', { status: IconStatus.ACTIVE });

    if (style) {
      query.andWhere('icon.style = :style', { style });
    }

    return query.orderBy('icon.created_at', 'DESC').getMany();
  }

  /* -----------------------------------------------------
     STEP 8 — GET GLOBAL ICON STATS
  ----------------------------------------------------- */
  async getGlobalStats() {
    const iconRepo = this.dataSource.getRepository(Icon);
    const stats = await iconRepo.createQueryBuilder('icon')
      .select('icon.status', 'status')
      .addSelect('COUNT(icon.id)', 'count')
      .groupBy('icon.status')
      .getRawMany();

    const counts = {
      draft: 0,
      underReview: 0,
      approved: 0,
    };

    stats.forEach(stat => {
      const count = Number(stat.count) || 0;
      switch (stat.status) {
        case IconStatus.DRAFT:
          counts.draft += count;
          break;
        case IconStatus.PENDING:
          counts.underReview += count;
          break;
        case IconStatus.ACTIVE:
          counts.approved += count;
          break;
      }
    });

    return counts;
  }

  /* -----------------------------------------------------
     STEP 9 — REPLACE FILE
  ----------------------------------------------------- */
  async replaceFile(id: number, file: UploadedFile) {
    if (!file) throw new BadRequestException('File not provided');

    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = await iconRepo.findOne({ where: { id } });

    if (!icon) throw new BadRequestException('Icon not found');

    const filename = `${Date.now()}-${file.originalname}`;
    const newKey = `temp/icons/${icon.created_by}/${filename}`;

    // Upload to R2
    await this.r2Service.putObject(newKey, file.buffer, file.mimetype);

    // Delete old path from R2 to prevent orphans
    if (icon.path && icon.path.startsWith('temp/')) {
      await this.r2Service.deleteObject(icon.path);
    }

    icon.path = newKey;
    icon.title = file.originalname;

    return await iconRepo.save(icon);
  }

  /* -----------------------------------------------------
     STEP 10 — AI FILL METADATA (SINGLE ICON)
  ----------------------------------------------------- */
  async aiFillMetadata(iconId: number): Promise<AiFillResult> {
    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = await iconRepo.findOne({ where: { id: iconId } });

    if (!icon) throw new BadRequestException('Icon not found');

    // Fetch the file from R2 via its public URL
    const fileUrl = `https://pub-e598b9aaee344c728dd117b85cd19c87.r2.dev/${icon.path}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new BadRequestException(`Failed to fetch icon file: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const isSvg = icon.path.endsWith('.svg');

    const imageContent = isSvg
      ? { type: 'text' as const, text: `SVG icon:\n${Buffer.from(buffer).toString('utf-8')}` }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/png' as const,
            data: Buffer.from(buffer).toString('base64'),
          },
        };

    const aiResponse = await this.anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            imageContent,
            {
              type: 'text',
              text: `You are an SEO expert for an icon library. Analyze this icon carefully and return ONLY a valid JSON object with these exact fields:
{
  "description": "1-2 sentence description of what the icon depicts and its primary use case in UI/UX design",
  "metaTitle": "SEO meta title under 60 characters, format: '[Icon Name] Icon - Free SVG & PNG Download'",
  "metaDescription": "SEO meta description under 155 characters describing the icon and its use cases",
  "tags": ["tag1", "tag2", "tag3"] // array of 6-10 relevant lowercase single-word tags
}
Return ONLY the raw JSON object. No explanation, no markdown code fences, no preamble.`,
            },
          ],
        },
      ],
    });

    const rawText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text.trim() : '';

    try {
      return JSON.parse(rawText) as AiFillResult;
    } catch {
      // Strip accidental markdown fences if Claude added them
      const cleaned = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      return JSON.parse(cleaned) as AiFillResult;
    }
  }

  /* -----------------------------------------------------
     STEP 11 — AI FILL METADATA (BULK)
  ----------------------------------------------------- */
  async aiFillBulk(ids: number[]): Promise<AiFillBulkResponse> {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No icon IDs provided');
    }

    // Step A — fill each icon individually in parallel
    const settled = await Promise.allSettled(
      ids.map(id => this.aiFillMetadata(id))
    );

    const perIcon = ids.map((id, index) => {
      const result = settled[index];
      if (result.status === 'fulfilled') {
        return { id, status: 'fulfilled', data: result.value, error: null };
      } else {
        const err = result.reason as Error;
        console.error(`[aiFillBulk] Failed for icon ${id}:`, err.message);
        return { id, status: 'rejected', data: null, error: err.message };
      }
    });

    // Step B — generate a pack-level summary from the successful per-icon results
    const packSummary = await this.aiFillPackSummary(perIcon);

    return { perIcon, packSummary };
  }

  /* -----------------------------------------------------
     STEP 12 — AI PACK SUMMARY (from per-icon results)
  ----------------------------------------------------- */
  private async aiFillPackSummary(
    perIcon: { id: number; status: string; data: AiFillResult | null; error: string | null }[]
  ): Promise<AiFillResult> {
    const successful = perIcon.filter(r => r.status === 'fulfilled' && r.data);
    const count = successful.length;

    // Fallback if everything failed
    if (count === 0) {
      return {
        description: 'A collection of icons.',
        metaTitle: `Icon Pack - Free SVG & PNG Download`,
        metaDescription: 'Download this icon pack in SVG and PNG format for your UI/UX projects.',
        tags: ['icon', 'pack', 'svg', 'ui', 'design'],
      };
    }

    // Build a condensed summary of all per-icon results for the prompt
    const iconSummaries = successful.map((r, i) =>
      `Icon ${i + 1}: ${r.data!.description} Tags: ${r.data!.tags.join(', ')}`
    ).join('\n');

    // Collect and deduplicate all tags across icons
    const allTags = Array.from(
      new Set(successful.flatMap(r => r.data!.tags))
    ).slice(0, 15);

    const prompt = `You are an SEO expert for an icon library. Below are descriptions of ${count} icons that belong to the same pack uploaded together.

${iconSummaries}

Based on these icons as a group, generate a SINGLE pack-level summary. Return ONLY a valid JSON object with these exact fields:
{
  "description": "2-3 sentence description summarising what this pack of ${count} icons covers and their primary use cases in UI/UX design",
  "metaTitle": "SEO meta title under 60 characters for the pack, e.g. '${count} UI Icons Pack - Free SVG & PNG Download'",
  "metaDescription": "SEO meta description under 155 characters describing the pack and its use cases",
  "tags": ${JSON.stringify(allTags.slice(0, 10))}
}
Return ONLY the raw JSON object. No explanation, no markdown code fences, no preamble.`;

    const aiResponse = await this.anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text.trim() : '';

    try {
      return JSON.parse(rawText) as AiFillResult;
    } catch {
      const cleaned = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      try {
        return JSON.parse(cleaned) as AiFillResult;
      } catch {
        // Last-resort fallback if parsing still fails
        return {
          description: `A pack of ${count} icons for UI/UX design projects.`,
          metaTitle: `${count} Icons Pack - Free SVG & PNG Download`,
          metaDescription: `Download this pack of ${count} icons in SVG and PNG format for your design projects.`,
          tags: allTags.slice(0, 10),
        };
      }
    }
  }
}