import { Test, TestingModule } from '@nestjs/testing';
import { IconsController } from './icons.controller';
import { IconsService } from './icons.service';
import { IconStatus, IconStyle } from './entities/icon.entity';

describe('IconsController', () => {
  let controller: IconsController;
  let service: IconsService;

  const mockIconsService = {
    getDrafts: jest.fn(),
    uploadTempIcon: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    getPendingIcons: jest.fn(),
    approveIcons: jest.fn(),
    deleteDraft: jest.fn(),
    findAllApproved: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IconsController],
      providers: [
        {
          provide: IconsService,
          useValue: mockIconsService,
        },
      ],
    }).compile();

    controller = module.get<IconsController>(IconsController);
    service = module.get<IconsService>(IconsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getApprovedIcons', () => {
    it('should return an array of approved icons', async () => {
      const result = [{ id: 1, title: 'Icon 1', status: IconStatus.ACTIVE }];
      mockIconsService.findAllApproved.mockResolvedValue(result);

      expect(await controller.getApprovedIcons()).toBe(result);
      expect(mockIconsService.findAllApproved).toHaveBeenCalledWith(undefined);
    });

    it('should pass style filter to service', async () => {
      const style = IconStyle.OUTLINE;
      await controller.getApprovedIcons(style);
      expect(mockIconsService.findAllApproved).toHaveBeenCalledWith(style);
    });
  });

  describe('tempUpload', () => {
      it('should return uploaded file details', async () => {
          const files = [{ originalname: 'test.svg', buffer: Buffer.from(''), mimetype: 'image/svg+xml' }];
          const createdBy = '1';
          const serviceResponse = { title: 'test.svg', path: 'path/to/icon' };
          
          mockIconsService.uploadTempIcon.mockResolvedValue(serviceResponse);

          const result = await controller.tempUpload(files, createdBy);

          expect(result).toHaveLength(1);
          expect(result[0].tempName).toBe('test.svg');
          expect(result[0].previewUrl).toBe('path/to/icon');
      });
  });
  
  describe('approve', () => {
      it('should call approveIcons with ids', async () => {
          const ids = [1, 2, 3];
          mockIconsService.approveIcons.mockResolvedValue({ success: true, count: 3 });
          
          await controller.approve(ids);
          expect(mockIconsService.approveIcons).toHaveBeenCalledWith(ids);
      });
  });
});
