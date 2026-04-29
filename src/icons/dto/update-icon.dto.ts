import { IsEnum, IsInt, IsOptional, IsString, IsArray } from 'class-validator';
import { IconStyle } from '../entities/icon.entity';

export class UpdateIconDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsInt()
  @IsOptional()
  categoryId?: number;

  @IsInt()
  @IsOptional()
  subCategoryId?: number;

  @IsEnum(IconStyle)
  @IsOptional()
  style?: IconStyle;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
