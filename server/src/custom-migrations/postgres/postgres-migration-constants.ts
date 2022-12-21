const latestTentativeDateExpr = 'TentativeDates::json ->> -1';
export const latestTentativeOrScheduledDateExpr = `CASE WHEN ScheduledEndDateTime IS NULL THEN ${latestTentativeDateExpr} ELSE ScheduledEndDateTime END`;
