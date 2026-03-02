// src/icon-bundles/entities/icon-bundle.entity.ts
import { Entity, Column, ManyToOne, PrimaryColumn } from 'typeorm';
import { Icon } from '../../icons/entities/icon.entity';
import { Bundle } from '../../bundles/entities/bundle.entity';

@Entity({ name: 'icon_bundles' })
export class IconBundle {
  @PrimaryColumn()
  icon_id: number;

  @PrimaryColumn()
  bundle_id: number;

  @ManyToOne(() => Icon, (icon) => icon.iconBundles)
  icon: Icon;

  @ManyToOne(() => Bundle, (bundle) => bundle.iconBundles)
  bundle: Bundle;
}
