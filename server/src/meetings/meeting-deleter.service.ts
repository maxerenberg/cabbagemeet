import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { DatabaseType, EnvironmentVariables } from "../env.validation";
import { sleep } from '../misc.utils';
import { Repository } from "typeorm";
import Meeting from "./meeting.entity";
import { getUTCDateString } from "src/dates.utils";

@Injectable()
export default class MeetingDeleterService {
  private readonly logger = new Logger(MeetingDeleterService.name);
  private readonly dbType: DatabaseType;
  private readonly ttlDays: number;

  constructor(
    @InjectRepository(Meeting) private meetingsRepository: Repository<Meeting>,
    configService: ConfigService<EnvironmentVariables, true>,
  ) {
    this.dbType = configService.get('DATABASE_TYPE', {infer: true});
    this.ttlDays = configService.get('DELETE_MEETINGS_OLDER_THAN_NUM_DAYS', {infer: true});
    if (this.ttlDays !== 0) {
      // Make sure not to await this Promise
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
    let latestTentativeDate: string = '';
    // Get last element of JSON array
    if (this.dbType === 'sqlite') {
      latestTentativeDate = "json_extract(TentativeDates, '$[' || (json_array_length(TentativeDates)-1) || ']')";
    } else {
      // TODO: add more databases
      // Note that in MySQL, json_extract returns a string with quotation marks (use ->> instead)
      // See https://stackoverflow.com/questions/44404855/how-to-get-last-element-in-a-mysql-json-array
      throw new Error('Unsupported DB type ' + this.dbType);
    }
    const result = await this.meetingsRepository.createQueryBuilder()
      .delete()
      .where(
        `(ScheduledEndDateTime IS NULL AND ${latestTentativeDate} < :cutoff) OR ` +
        '(ScheduledEndDateTime IS NOT NULL AND ScheduledEndDateTime < :cutoff)',
        {cutoff: cutoffDateStr}
      )
      .execute();
    if (result.affected) {
      this.logger.log(`Deleted ${result.affected} old meetings`);
    }
  }
}
