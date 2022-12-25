import { QueryFailedError } from 'typeorm';
import type { DatabaseType } from './config/env.validation';
import { assertIsNever } from './misc.utils';

// TODO: add other types of errors
export class UniqueConstraintFailed extends Error {}

export function normalizeDBError(err: Error, dbType: DatabaseType): Error {
  if (!(err instanceof QueryFailedError)) {
    return err;
  }
  if (dbType === 'sqlite') {
    // See https://sqlite.org/rescode.html
    if (err.driverError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return new UniqueConstraintFailed();
    }
  } else if (dbType === 'postgres') {
    // See https://www.postgresql.org/docs/current/errcodes-appendix.html
    if (err.driverError.code === '23505') {
      return new UniqueConstraintFailed();
    }
  } else if (dbType === 'mariadb') {
    // The mysql2 package uses the built-in Error type and adds custom fields
    // See https://github.com/sidorares/node-mysql2/blob/1336ff068f71092ce6c4b0b687a3eb86a686c346/lib/packets/packet.js#L718
    // See https://mariadb.com/kb/en/mariadb-error-codes/
    if ((err as any).errno === 1062) {
      return new UniqueConstraintFailed();
    }
  } else {
    assertIsNever(dbType);
  }
  return err;
}
