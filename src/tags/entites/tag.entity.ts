// src/tags/entities/tag.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Icon } from '../../icons/entities/icon.entity';
import { Bundle } from '../../bundles/entities/bundle.entity';

export enum TaggableType {
  ICON = 'ICON',
  BUNDLE = 'BUNDLE',
}

@Entity({ name: 'tags' })
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  taggable_id: number;

  @Column({ type: 'enum', enum: TaggableType })
  taggable_type: TaggableType;

  @Column({ length: 191 })
  name: string;

  @ManyToOne(() => Icon, (icon) => icon.tags, { nullable: true })
  icon: Icon;

  @ManyToOne(() => Bundle, (bundle) => bundle.tags, { nullable: true })
  bundle: Bundle;
}
