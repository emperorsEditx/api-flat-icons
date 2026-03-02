import { Category } from '../../categories/entities/category.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

export enum SubCategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'sub_categories' })
export class SubCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191 })
  name: string;

  @Column({ type: 'enum', enum: SubCategoryStatus, default: SubCategoryStatus.ACTIVE })
  status: SubCategoryStatus;

  @Column()
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.subCategories, { onDelete: 'CASCADE' })
  category: Category;
}
