import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubCategory } from './entities/sub-category.entity';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
  ) {}

  async create(createSubCategoryDto: CreateSubCategoryDto): Promise<SubCategory> {
    const subCategory = this.subCategoryRepository.create(createSubCategoryDto);
    return await this.subCategoryRepository.save(subCategory);
  }

  async findAll(): Promise<SubCategory[]> {
    return await this.subCategoryRepository.find({ relations: ['category'] });
  }

  async findOne(id: number): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepository.findOne({
        where: { id },
        relations: ['category']
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
    return subCategory;
  }

  async update(id: number, updateSubCategoryDto: UpdateSubCategoryDto): Promise<SubCategory> {
    const subCategory = await this.findOne(id);
    Object.assign(subCategory, updateSubCategoryDto);
    return await this.subCategoryRepository.save(subCategory);
  }

  async remove(id: number): Promise<void> {
    const subCategory = await this.findOne(id);
    await this.subCategoryRepository.remove(subCategory);
  }
}
