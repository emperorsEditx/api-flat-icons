import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entites/tag.entity';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async findAllUnique() {
    // Return unique tag names
    const result = await this.tagRepository
      .createQueryBuilder('tag')
      .select('DISTINCT(tag.name)', 'name')
      .getRawMany();
    
    return result.map(r => r.name);
  }
}
