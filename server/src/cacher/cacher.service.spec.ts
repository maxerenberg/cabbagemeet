import { Test, TestingModule } from '@nestjs/testing';
import { CacherService } from './cacher.service';

describe('CacherService', () => {
  let service: CacherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacherService],
    }).compile();

    service = module.get<CacherService>(CacherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
