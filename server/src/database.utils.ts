import { QueryFailedError } from 'typeorm';
import type { DatabaseType } from './config/env.validation';

export class UniqueConstraintFailed extends Error {}
export class ForeignKeyConstraintFailed extends Error {}

const errorsMap: Record<DatabaseType, Record<string, {new() : Error;}>> = {
  'sqlite': {
    // See https://sqlite.org/rescode.html
    'SQLITE_CONSTRAINT_UNIQUE': UniqueConstraintFailed,
    'SQLITE_CONSTRAINT_FOREIGNKEY': ForeignKeyConstraintFailed,
  },
  'postgres': {
    // See https://www.postgresql.org/docs/current/errcodes-appendix.html
    '23505': UniqueConstraintFailed,
    '23503': ForeignKeyConstraintFailed,
  },
  'mariadb': {
    // See https://mariadb.com/kb/en/mariadb-error-codes/
    '1062': UniqueConstraintFailed,
    '1216': ForeignKeyConstraintFailed,
    '1217': ForeignKeyConstraintFailed,
    '1451': ForeignKeyConstraintFailed,
    '1452': ForeignKeyConstraintFailed,
  },
};

export function normalizeDBError(err: Error, dbType: DatabaseType): Error {
  if (!(err instanceof QueryFailedError)) {
    return err;
  }
  const errorCode: string = (dbType === 'sqlite' || dbType === 'postgres')
    ? err.driverError.code
    // The mysql2 package uses the built-in Error type and adds custom fields
    // See https://github.com/sidorares/node-mysql2/blob/1336ff068f71092ce6c4b0b687a3eb86a686c346/lib/packets/packet.js#L718
    : (err as any).errno.toString();
  const errorClass = errorsMap[dbType][errorCode];
  if (errorClass) {
    return new errorClass();
  }
  return err;
}

export function getPlaceholders(count: number, dbType: DatabaseType): string[] {
  const result = [];
  if (dbType === 'postgres') {
    for (let i = 1; i <= count; i++) {
      result.push('$' + i);
    }
  } else {
    for (let i = 1; i <= count; i++) {
      result.push('?');
    }
  }
  return result;
}
