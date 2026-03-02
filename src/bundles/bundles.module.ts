import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BundlesService } from './bundles.service';
import { BundlesController } from './bundles.controller';
import { Bundle } from './entities/bundle.entity';
import { IconBundle } from '../icon-bundles/entities/icon-bundle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bundle, IconBundle])],
  controllers: [BundlesController],
  providers: [BundlesService],
  exports: [BundlesService]
})
export class BundlesModule {}
