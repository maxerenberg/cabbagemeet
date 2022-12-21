import { Column, Index } from 'typeorm';
import Meeting from '../meetings/meeting.entity';

// As of this writing, functional indexes are not supported in MariaDB,
// so we will create a virtual column and index that instead

const columnName = 'LatestTentativeOrScheduledDate';
// As of this writing, MariaDB does not support the '$[last]' JSONPATH selector
const latestTentativeDateExpr =
  "JSON_EXTRACT(TentativeDates, CONCAT('$[', JSON_LENGTH(TentativeDates)-1, ']'))";
const asExpression = `CASE WHEN ScheduledEndDateTime IS NULL THEN ${latestTentativeDateExpr} ELSE ScheduledEndDateTime END`;

export function injectTypeOrmColumns() {
  /*
    So what we really want is the ability to conditionally set the "asExpression" property
    depending on the database type. The reason for this is that each database type has
    slightly different syntax for JSON functions and string concatenation.
    Unfortunately this doesn't seem to be possible with the NestJS TypeORM module.
    While it is possible to programmatically define an entity schema in TypeORM, the problem
    is that the schema needs to be statically declared in the call to TypeOrmModule.forFeature().
    So we can't really define our schema dynamically.
    As a workaround, we will trick TypeORM into thinking that a class property exists
    by calling the Column() decorator programmatically.
  */
  Column({
    type: 'varchar',
    select: false,
    insert: false,
    asExpression,
    generatedType: 'VIRTUAL',
  })(
    // This needs to be close to the format passed by reflect-metadata
    { constructor: Meeting, propertyName: columnName },
    columnName,
  );
  Index()({ constructor: Meeting, propertyName: columnName }, columnName);
}
