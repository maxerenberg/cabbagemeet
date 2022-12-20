import { QueryFailedError } from 'typeorm';
import { SqliteError } from 'better-sqlite3';
import { DatabaseError as PostgresError } from 'pg';

// TODO: add other types of errors
export class UniqueConstraintFailed extends Error {}

export function normalizeDBError(err: Error): Error {
  if (!(err instanceof QueryFailedError)) {
    return err;
  }
  if (err.driverError instanceof SqliteError) {
    if (err.driverError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return new UniqueConstraintFailed();
    }
  } else if (err.driverError instanceof PostgresError) {
    if (err.driverError.code === '23505') {
      return new UniqueConstraintFailed();
    }
  } else {
    // MySQL/MariaDB
    // The mysql2 package uses the built-in Error type and adds custom fields
    // See https://github.com/sidorares/node-mysql2/blob/1336ff068f71092ce6c4b0b687a3eb86a686c346/lib/packets/packet.js#L718
    if ((err as any).errno === 1062) {
      return new UniqueConstraintFailed();
    }
  }
  return err;
}
