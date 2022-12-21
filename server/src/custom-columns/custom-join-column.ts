import { JoinColumn } from 'typeorm';
import type { DatabaseType } from '../env.validation';

// e.g. {klass: Meeting, propertyName: 'Creator', joinColumnName: 'CreatorID'}
const joinColumns: {
  klass: Function;
  propertyName: string;
  joinColumnName: string;
}[] = [];

// Workaround for https://github.com/typeorm/typeorm/issues/4825
export function CustomJoinColumn({ name: joinColumnName }: { name: string }) {
  return function (target: /* class prototype */ Object, propertyName: string) {
    const klass = target.constructor;
    joinColumns.push({ klass, propertyName, joinColumnName });
  };
}

export function registerJoinColumns(dbType: DatabaseType) {
  for (const { klass, propertyName, joinColumnName } of joinColumns) {
    // We need to use the LowerCaseNamingStrategy for Postgres, because
    // unquoted identifiers effectively get converted to lower case.
    // Unfortunately TypeORM does not apply the naming strategy to the
    // JoinColumn name. So we need to make the JoinColumn name lower
    // case as well, but *only for Postgres*, because MariaDB is
    // case sensitive and does not convert unquoted identifers to lower case.
    const transformedJoinColumnName =
      dbType === 'postgres' ? joinColumnName.toLowerCase() : joinColumnName;
    JoinColumn({ name: transformedJoinColumnName })(
      { constructor: klass },
      propertyName,
    );
  }
}
