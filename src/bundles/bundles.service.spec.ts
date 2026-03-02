import { Test, TestingModule } from '@nestjs/testing';
import { BundlesService } from './bundles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bundle } from './entities/bundle.entity';
import { IconBundle } from '../icon-bundles/entities/icon-bundle.entity';

describe('BundlesService', () => {
  let service: BundlesService;

  const mockBundleRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((bundle) => Promise.resolve({ id: 1, ...bundle })),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockIconBundleRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BundlesService,
        { provide: getRepositoryToken(Bundle), useValue: mockBundleRepo },
        { provide: getRepositoryToken(IconBundle), useValue: mockIconBundleRepo },
      ],
    }).compile();

    service = module.get<BundlesService>(BundlesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a bundle', async () => {
    const dto = { title: 'Test Bundle' };
    const result = await service.create(dto);
    expect(result).toEqual({ id: 1, title: 'Test Bundle' });
    expect(mockBundleRepo.create).toHaveBeenCalledWith(expect.objectContaining(dto));
  });

  it('should add icon to bundle', async () => {
    mockIconBundleRepo.findOne.mockResolvedValue(null);
    mockIconBundleRepo.create.mockReturnValue({ bundle_id: 1, icon_id: 2 });
    mockIconBundleRepo.save.mockResolvedValue({ bundle_id: 1, icon_id: 2 });

    const result = await service.addIconToBundle(1, 2);
    expect(result).toEqual({ bundle_id: 1, icon_id: 2 });
  });
});
