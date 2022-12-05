import { Column, Index } from "typeorm";
import Meeting from '../meetings/meeting.entity';

// Although SQLite supports functional indices, for the sake of consistency,
// we will use an index on a virtual column like we do for MariaDB.

const columnName = 'LatestTentativeOrScheduledDate';
const latestTentativeDateExpr = "JSON_EXTRACT(TentativeDates, '$[' || (JSON_ARRAY_LENGTH(TentativeDates)-1) || ']')";
const asExpression = `CASE WHEN ScheduledEndDateTime IS NULL THEN ${latestTentativeDateExpr} ELSE ScheduledEndDateTime END`;

export function injectTypeOrmColumns() {
  Column({
    type: 'varchar',
    select: false,
    insert: false,
    asExpression,
    generatedType: 'VIRTUAL',
  })(
    // This needs to be close to the format passed by reflect-metadata
    {constructor: Meeting, propertyName: columnName},
    columnName
  );
  Index()(
    {constructor: Meeting, propertyName: columnName},
    columnName
  );
}
