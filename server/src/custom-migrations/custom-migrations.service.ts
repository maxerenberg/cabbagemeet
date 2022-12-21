import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import ConfigService from '../config/config.service';
import { Environment } from '../config/env.validation';

@Injectable()
export default class CustomMigrationsService {
  private readonly nodeEnv: Environment;

  constructor(
    configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.nodeEnv = configService.get('NODE_ENV');
  }

  async onModuleInit() {
    // In production, the custom migrations should already run automatically.
    // This is only necessary in development mode because we have "synchronize"
    // set to true, and that runs _after_ the migrations.
    // Since our custom migrations assume that the tables already exist, we
    // need to delay them until after the "synchronize" step has completed.
    if (this.nodeEnv === 'development') {
      await this.dataSource.runMigrations();
    }
  }
}
