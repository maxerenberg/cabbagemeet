import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import CustomMigrationsService from '../custom-migrations/custom-migrations.service';
import { getUTCDateString } from '../dates.utils';
import type { EnvironmentVariables } from '../env.validation';
import { latestTentativeOrScheduledDateExpr as postgres_latestTentativeOrScheduledDateExpr } from '../custom-migrations/postgres/postgres-migration-constants';
import { latestTentativeOrScheduledDateExpr as sqlite_latestTentativeOrScheduledDateExpr } from '../custom-migrations/sqlite/sqlite-migration-constants';
import { assertIsNever, sleep } from '../misc.utils';
import Meeting from './meeting.entity';

@Injectable()
export default class MeetingDeleterService {
  private readonly logger = new Logger(MeetingDeleterService.name);
  private readonly ttlDays: number;
  private readonly latestTentativeOrScheduledDateExpr: string;

  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    configService: ConfigService<EnvironmentVariables, true>,
    _customMigrationsService: CustomMigrationsService,
  ) {
    this.ttlDays = configService.get('DELETE_MEETINGS_OLDER_THAN_NUM_DAYS', {
      infer: true,
    });
    const dbType = configService.get('DATABASE_TYPE', { infer: true });
    if (dbType === 'sqlite') {
      // index on expression (requires custom migration)
      this.latestTentativeOrScheduledDateExpr =
        sqlite_latestTentativeOrScheduledDateExpr;
    } else if (dbType === 'mariadb') {
      // generated virtual column
      this.latestTentativeOrScheduledDateExpr =
        'LatestTentativeOrScheduledDate';
    } else if (dbType === 'postgres') {
      // index on expression (requires custom migration)
      this.latestTentativeOrScheduledDateExpr =
        postgres_latestTentativeOrScheduledDateExpr;
    } else {
      assertIsNever(dbType);
    }
  }

  onModuleInit() {
    if (this.ttlDays !== 0) {
      // Make sure not to await this Promise (runs forever)
      this.runRecurringJob();
    }
  }

  private millisUntilNextJob(): number {
    // Milliseconds until the next midnight
    const dt = new Date();
    dt.setHours(0);
    dt.setMinutes(0);
    dt.setSeconds(0);
    dt.setMilliseconds(0);
    dt.setDate(dt.getDate() + 1);
    return dt.getTime() - Date.now();
  }

  private async runRecurringJob(): Promise<never> {
    while (true) {
      await sleep(this.millisUntilNextJob());
      await this.runJob();
    }
  }

  async runJob() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.ttlDays);
    const cutoffDateStr = getUTCDateString(cutoffDate);

    const result = await this.meetingsRepository
      .createQueryBuilder()
      .delete()
      .where(`${this.latestTentativeOrScheduledDateExpr} < :cutoff`, {
        cutoff: cutoffDateStr,
      })
      .execute();
    if (result.affected) {
      this.logger.log(`Deleted ${result.affected} old meetings`);
    }
  }
}
