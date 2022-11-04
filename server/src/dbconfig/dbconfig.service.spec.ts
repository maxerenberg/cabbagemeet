import { Test, TestingModule } from '@nestjs/testing';
import { DbconfigService } from './dbconfig.service';

describe('DbconfigService', () => {
  let service: DbconfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DbconfigService],
    }).compile();

    service = module.get<DbconfigService>(DbconfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
