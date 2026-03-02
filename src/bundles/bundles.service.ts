import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bundle } from './entities/bundle.entity';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { IconBundle } from '../icon-bundles/entities/icon-bundle.entity';

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(Bundle)
    private readonly bundleRepository: Repository<Bundle>,
    @InjectRepository(IconBundle)
    private readonly iconBundleRepository: Repository<IconBundle>,
  ) {}

  async create(createBundleDto: CreateBundleDto, userId?: number) {
    const bundle = this.bundleRepository.create({
      ...createBundleDto,
      created_by: userId,
    });
    return this.bundleRepository.save(bundle);
  }

  async findAll() {
    return this.bundleRepository.find({
      relations: ['iconBundles', 'iconBundles.icon'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const bundle = await this.bundleRepository.findOne({
      where: { id },
      relations: ['iconBundles', 'iconBundles.icon'],
    });
    if (!bundle) throw new NotFoundException(`Bundle #${id} not found`);
    return bundle;
  }

  async addIconToBundle(bundleId: number, iconId: number) {
    // Check if relation exists
    const exists = await this.iconBundleRepository.findOne({
      where: { bundle_id: bundleId, icon_id: iconId },
    });
    
    if (exists) return exists;

    const iconBundle = this.iconBundleRepository.create({
      bundle_id: bundleId,
      icon_id: iconId,
    });
    return this.iconBundleRepository.save(iconBundle);
  }

  async removeIconFromBundle(bundleId: number, iconId: number) {
    await this.iconBundleRepository.delete({
      bundle_id: bundleId,
      icon_id: iconId,
    });
    return { success: true };
  }
}
