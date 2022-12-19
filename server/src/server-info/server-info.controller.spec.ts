import { Test, TestingModule } from '@nestjs/testing';
import { ServerInfoController } from './server-info.controller';

describe('ServerInfoController', () => {
  let controller: ServerInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerInfoController],
    }).compile();

    controller = module.get<ServerInfoController>(ServerInfoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
