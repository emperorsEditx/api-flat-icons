import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Icon, IconStatus, IconStyle, IconType } from './entities/icon.entity';
import { Tag, TaggableType } from '../tags/entites/tag.entity';
import { R2Service } from '../r2/r2.service';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class IconsService {
  constructor(
    @InjectRepository(Icon)
    private readonly iconRepository: Repository<Icon>,
    private readonly dataSource: DataSource,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly r2Service: R2Service,
  ) { }

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

    return Object.keys(groups).map(userId => ({
      userId: Number(userId),
      icons: groups[Number(userId)]
    }));
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
      // Store the R2 Key purely? Or the full URL? 
      // Existing code seemed to store relative path. Let's store the Key.
      // Frontend might expect a full URL.
      // We can store the Key and have a getter or return full URL in API.
      // For now, let's store the Key to be clean.
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
  async update(id: number, updateIconDto: any) {
    const iconRepo = this.dataSource.getRepository(Icon);
    const icon = await iconRepo.findOne({ where: { id } });

    if (!icon) {
      throw new BadRequestException('Icon not found');
    }

    if (updateIconDto.title) icon.title = updateIconDto.title;
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

    return await iconRepo.save(icon);
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
}
