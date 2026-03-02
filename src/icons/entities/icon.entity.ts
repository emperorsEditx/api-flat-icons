// src/icons/entities/icon.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { SubCategory } from '../../sub-categories/entities/sub-category.entity';
import { IconBundle } from '../../icon-bundles/entities/icon-bundle.entity';
import { Tag } from '../../tags/entites/tag.entity';

export enum IconType {
  SVG = 'SVG',
  PNG = 'PNG',
}

export enum IconStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  CANCELLED = 'CANCELLED',
}

export enum IconStyle {
  OUTLINE = 'OUTLINE',
  FILL = 'FILL',
}

@Entity({ name: 'icons' })
export class Icon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191 })
  title: string;

  @Column({ length: 191 })
  path: string;

  @Column({ type: 'enum', enum: IconType, default: IconType.SVG })
  type: IconType;

  @Column({ type: 'enum', enum: IconStatus, default: IconStatus.PENDING })
  status: IconStatus;

  @Column({ default: false })
  approved: boolean;

  @Column({ default: false })
  need_to_improve: boolean;

  @Column({ type: 'enum', enum: IconStyle, default: IconStyle.OUTLINE })
  style: IconStyle;

  @Column({ nullable: true })
  category_id: number;

  @ManyToOne(() => Category, (category) => category.icons)
  category: Category;

  @Column({ nullable: true })
  sub_category_id: number;

  @ManyToOne(() => SubCategory, { nullable: true })
  subCategory: SubCategory;

  @Column({ nullable: true })
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;

  @OneToMany(() => IconBundle, (iconBundle) => iconBundle.icon)
  iconBundles: IconBundle[];

  @OneToMany(() => Tag, (tag) => tag.icon)
  tags: Tag[];
}
