import { Test, TestingModule } from '@nestjs/testing';
import { CustomJwtService } from './custom-jwt.service';

describe('CustomJwtService', () => {
  let service: CustomJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomJwtService],
    }).compile();

    service = module.get<CustomJwtService>(CustomJwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
