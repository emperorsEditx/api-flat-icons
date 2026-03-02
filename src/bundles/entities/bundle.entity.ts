// src/bundles/entities/bundle.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { IconBundle } from '../../icon-bundles/entities/icon-bundle.entity';
import { Tag } from '../../tags/entites/tag.entity';

export enum BundleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity({ name: 'bundles' })
export class Bundle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191 })
  title: string;

  @Column({ nullable: true })
  category_id: number;

  @ManyToOne(() => Category, (category) => category.bundles)
  category: Category;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: false })
  is_paid: boolean;

  @Column({ type: 'float', default: 0 })
  price: number;

  @Column({ type: 'enum', enum: BundleStatus, default: BundleStatus.ACTIVE })
  status: BundleStatus;

  @Column({ nullable: true })
  created_by: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  deleted_at: Date;

  @OneToMany(() => IconBundle, (iconBundle) => iconBundle.bundle)
  iconBundles: IconBundle[];

  @OneToMany(() => Tag, (tag) => tag.bundle)
  tags: Tag[];
}
