import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IconsController } from './icons.controller';
import { IconsService } from './icons.service';
import { Icon } from './entities/icon.entity';
import { Tag } from '../tags/entites/tag.entity';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [TypeOrmModule.forFeature([Icon, Tag]), R2Module],
  controllers: [IconsController],
  providers: [IconsService]
})
export class IconsModule { }
