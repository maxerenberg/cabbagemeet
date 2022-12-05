import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EnvironmentVariables } from '../env.validation';

@Injectable()
export default class CustomMigrationsService {
  private readonly nodeEnv: string;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly dataSource: DataSource
  ) {
    this.nodeEnv = configService.get('NODE_ENV', {infer: true});
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
