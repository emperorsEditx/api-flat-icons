// src/categories/entities/category.entity.ts
import { Bundle } from '../../bundles/entities/bundle.entity';
import { Icon } from '../../icons/entities/icon.entity';
import { SubCategory } from '../../sub-categories/entities/sub-category.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191 })
  name: string;

  @Column({ type: 'enum', enum: CategoryStatus, default: CategoryStatus.ACTIVE })
  status: CategoryStatus;

  @OneToMany(() => Icon, (icon) => icon.category)
  icons: Icon[];

  @OneToMany(() => Bundle, (bundle) => bundle.category)
  bundles: Bundle[];

  @OneToMany(() => SubCategory, (subCategory) => subCategory.category)
  subCategories: SubCategory[];
}
