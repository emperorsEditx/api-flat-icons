import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/create-bundle.dto';

@Controller('bundles')
export class BundlesController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Post()
  create(@Body() createBundleDto: CreateBundleDto, @Body('userId') userId?: number) {
    return this.bundlesService.create(createBundleDto, userId);
  }

  @Get()
  findAll() {
    return this.bundlesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bundlesService.findOne(+id);
  }

  @Post(':id/icons')
  addIcon(@Param('id') id: string, @Body('iconId') iconId: number) {
    return this.bundlesService.addIconToBundle(+id, iconId);
  }

  @Delete(':id/icons/:iconId')
  removeIcon(@Param('id') id: string, @Param('iconId') iconId: string) {
    return this.bundlesService.removeIconFromBundle(+id, +iconId);
  }
}
