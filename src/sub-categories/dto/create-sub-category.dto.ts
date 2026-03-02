import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
import { SubCategoryStatus } from '../entities/sub-category.entity';

export class CreateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SubCategoryStatus)
  @IsNotEmpty()
  status: SubCategoryStatus;

  @IsInt()
  @IsNotEmpty()
  categoryId: number;
}
