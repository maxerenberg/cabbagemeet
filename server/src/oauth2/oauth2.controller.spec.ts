import { Test, TestingModule } from '@nestjs/testing';
import { Oauth2Controller } from './oauth2.controller';

describe('Oauth2Controller', () => {
  let controller: Oauth2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [Oauth2Controller],
    }).compile();

    controller = module.get<Oauth2Controller>(Oauth2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
