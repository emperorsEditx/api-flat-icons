import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  UploadedFiles,
  UseInterceptors,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IconsService } from './icons.service';
import { IconStyle } from './entities/icon.entity';
import { UpdateIconDto } from './dto/update-icon.dto';

interface TempIconResponse {
  tempName: string;
  originalName: string;
  previewUrl: string;
}
@Controller('icons')
export class IconsController {
  constructor(private readonly iconsService: IconsService) { }

  /* -----------------------------------------------------
     STEP 1 — TEMP UPLOAD (MULTI FILE)
  ----------------------------------------------------- */
  @Post('temp-upload')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'image/svg+xml' ||
          file.mimetype === 'image/png'
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Only SVG or PNG files are allowed'),
            false,
          );
        }
      },
    }),
  )
  async tempUpload(
    @UploadedFiles()
    files: { originalname: string; buffer: Buffer; mimetype: string }[],
    @Body('createdBy') createdBy: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploaded: TempIconResponse[] = [];

    for (const file of files) {
      const tempIcon: any = await this.iconsService.uploadTempIcon(
        file,
        Number(createdBy),
      );
      // Construct response to match frontend expectations or return full icon
      uploaded.push({
        tempName: tempIcon.title, // or ID + name depending on needs
        originalName: tempIcon.title,
        previewUrl: tempIcon.path
      });
    }

    return uploaded;
  }

  /* -----------------------------------------------------
     STEP 2 — GET GLOBAL STATS
  ----------------------------------------------------- */
  @Get('stats')
  async getStats() {
    return this.iconsService.getGlobalStats();
  }

  /* -----------------------------------------------------
     STEP 3 — GET DRAFTS
  ----------------------------------------------------- */
  @Get('drafts/:userId')
  async getDrafts(@Param('userId') userId: string) {
    return this.iconsService.getDrafts(Number(userId));
  }

  // Legacy endpoint support (optional, can redirect to drafts)
  @Get('temp/:userId')
  async getTempIcons(@Param('userId') userId: string) {
    return this.iconsService.getDrafts(Number(userId));
  }

  /* -----------------------------------------------------
     STEP 4 — UPDATE DRAFT METADATA
  ----------------------------------------------------- */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateIconDto: UpdateIconDto) {
    return this.iconsService.update(+id, updateIconDto);
  }

  /* -----------------------------------------------------
     STEP 5 — PUBLISH (FINAL)
  ----------------------------------------------------- */
  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    return this.iconsService.publish(+id);
  }

  /* -----------------------------------------------------
     STEP 6 — GET PENDING (ADMIN VIEW)
  ----------------------------------------------------- */
  @Get('pending')
  async getPending() {
    return this.iconsService.getPendingIcons();
  }

  /* -----------------------------------------------------
     STEP 7 — APPROVE (ADMIN ACTION)
  ----------------------------------------------------- */
  @Post('approve')
  async approve(@Body('ids') ids: number[]) {
    return this.iconsService.approveIcons(ids);
  }

  /* -----------------------------------------------------
     OPTIONAL — DELETE DRAFT
  ----------------------------------------------------- */
  @Delete('drafts/:id')
  async deleteDraft(@Param('id') id: string) {
    return this.iconsService.deleteDraft(+id);
  }

  /* -----------------------------------------------------
     STEP 8 — GET ALL APPROVED ICONS (PUBLIC)
  ----------------------------------------------------- */
  @Get('approved')
  async getApprovedIcons(@Query('style') style?: IconStyle) {
    return this.iconsService.findAllApproved(style);
  }
}
