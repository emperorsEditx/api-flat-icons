import { Test, TestingModule } from '@nestjs/testing';
import { IconsService } from './icons.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Icon, IconStatus } from './entities/icon.entity';
import { Tag } from '../tags/entites/tag.entity';
import { DataSource } from 'typeorm';

describe('IconsService', () => {
  let service: IconsService;
  let dataSourceMock: any;

  const mockIconRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockTagRepo = {};

  beforeEach(async () => {
    mockIconRepo.createQueryBuilder.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    });

    dataSourceMock = {
      getRepository: jest.fn().mockReturnValue(mockIconRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IconsService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: getRepositoryToken(Icon), useValue: mockIconRepo },
        { provide: getRepositoryToken(Tag), useValue: mockTagRepo },
      ],
    }).compile();

    service = module.get<IconsService>(IconsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('approveIcons', () => {
    it('should update icons status to ACTIVE and approved to true', async () => {
      const ids = [1, 2];
      await service.approveIcons(ids);

      const queryBuilder = mockIconRepo.createQueryBuilder();
      expect(queryBuilder.update).toHaveBeenCalledWith(Icon);
      expect(queryBuilder.set).toHaveBeenCalledWith({
        status: IconStatus.ACTIVE,
        approved: true,
      });
      expect(queryBuilder.whereInIds).toHaveBeenCalledWith(ids);
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });
});
