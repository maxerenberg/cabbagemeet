import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import CustomMigrationsService from "../custom-migrations/custom-migrations.service";
import { getUTCDateString } from "../dates.utils";
import { DatabaseType, EnvironmentVariables } from "../env.validation";
import { sleep } from '../misc.utils';
import Meeting from "./meeting.entity";

// TODO: add extra column to store latest tentative date / scheduled date
// to avoid a SCAN when deleting rows (or INDEX on expression)

@Injectable()
export default class MeetingDeleterService {
  private readonly logger = new Logger(MeetingDeleterService.name);
  private readonly ttlDays: number;

  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    configService: ConfigService<EnvironmentVariables, true>,
    _customMigrationsService: CustomMigrationsService,
  ) {
    this.ttlDays = configService.get('DELETE_MEETINGS_OLDER_THAN_NUM_DAYS', {infer: true});
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

    const result = await this.meetingsRepository.createQueryBuilder()
      .delete()
      .where(
        `LatestTentativeOrScheduledDate < :cutoff`,
        {cutoff: cutoffDateStr}
      )
      .execute();
    if (result.affected) {
      this.logger.log(`Deleted ${result.affected} old meetings`);
    }
  }
}
