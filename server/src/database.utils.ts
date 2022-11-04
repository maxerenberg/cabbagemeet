import { QueryFailedError } from 'typeorm';
import { SqliteError } from 'better-sqlite3';

export class UniqueConstraintFailed extends Error {}

export function normalizeDBError(err: Error): Error {
  if (!(err instanceof QueryFailedError)) {
    return err;
  }
  // TODO: add cases for other databases
  if (err.driverError instanceof SqliteError) {
    if (err.driverError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return new UniqueConstraintFailed();
    }
  }
  return err;
}
