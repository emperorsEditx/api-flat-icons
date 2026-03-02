import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum } from 'class-validator';
import { BundleStatus } from '../entities/bundle.entity';

export class CreateBundleDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  category_id?: number;

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsEnum(BundleStatus)
  status?: BundleStatus;
}
