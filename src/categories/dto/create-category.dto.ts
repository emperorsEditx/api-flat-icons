import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CategoryStatus } from '../entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CategoryStatus)
  @IsNotEmpty()
  status: CategoryStatus;
}
