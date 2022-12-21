const latestTentativeDateExpr =
  "JSON_EXTRACT(TentativeDates, '$[' || (JSON_ARRAY_LENGTH(TentativeDates)-1) || ']')";
export const latestTentativeOrScheduledDateExpr = `CASE WHEN ScheduledEndDateTime IS NULL THEN ${latestTentativeDateExpr} ELSE ScheduledEndDateTime END`;
