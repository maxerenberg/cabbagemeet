import { DefaultNamingStrategy, NamingStrategyInterface, Table } from 'typeorm';

// Adapted from https://github.com/tonivj5/typeorm-naming-strategies/blob/master/src/snake-naming.strategy.ts

export default class LowerCaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(targetName: string, userSpecifiedName: string | undefined) {
    return super.tableName(targetName, userSpecifiedName).toLowerCase();
  }

  closureJunctionTableName(originalClosureTableName: string) {
    return super.closureJunctionTableName(originalClosureTableName).toLowerCase();
  }

  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]) {
    return super.columnName(propertyName, customName, embeddedPrefixes).toLowerCase();
  }

  relationName(propertyName: string) {
    return super.relationName(propertyName).toLowerCase();
  }

  primaryKeyName(tableOrName: Table | string, columnNames: string[]) {
    return super.primaryKeyName(tableOrName, columnNames).toLowerCase();
  }

  uniqueConstraintName(tableOrName: Table | string, columnNames: string[]) {
    return super.uniqueConstraintName(tableOrName, columnNames).toLowerCase();
  }

  relationConstraintName(tableOrName: Table | string, columnNames: string[], where?: string) {
    return super.relationConstraintName(tableOrName, columnNames).toLowerCase();
  }

  defaultConstraintName(tableOrName: Table | string, columnName: string) {
    return super.defaultConstraintName(tableOrName, columnName).toLowerCase();
  }

  foreignKeyName(tableOrName: Table | string, columnNames: string[], referencedTablePath?: string, referencedColumnNames?: string[]) {
    return super.foreignKeyName(tableOrName, columnNames, referencedTablePath).toLowerCase();
  }

  indexName(tableOrName: Table | string, columns: string[], where?: string) {
    return super.indexName(tableOrName, columns, where).toLowerCase();
  }

  checkConstraintName(tableOrName: Table | string, expression: string, isEnum?: boolean) {
    return super.checkConstraintName(tableOrName, expression, isEnum).toLowerCase();
  }

  exclusionConstraintName(tableOrName: Table | string, expression: string) {
    return super.exclusionConstraintName(tableOrName, expression).toLowerCase();
  }

  joinColumnName(relationName: string, referencedColumnName: string) {
    return super.joinColumnName(relationName, referencedColumnName).toLowerCase();
  }

  joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string, secondPropertyName: string) {
    return super.joinTableName(firstTableName, secondTableName, firstPropertyName, secondPropertyName).toLowerCase();
  }

  joinTableColumnDuplicationPrefix(columnName: string, index: number) {
    return super.joinTableColumnDuplicationPrefix(columnName, index).toLowerCase();
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string) {
    return super.joinTableColumnName(tableName, propertyName, columnName).toLowerCase();
  }

  joinTableInverseColumnName(tableName: string, propertyName: string, columnName?: string) {
    return super.joinTableInverseColumnName(tableName, propertyName, columnName).toLowerCase();
  }

  prefixTableName(prefix: string, tableName: string) {
    return super.prefixTableName(prefix, tableName).toLowerCase();
  }

  eagerJoinRelationAlias(alias: string, propertyPath: string) {
    return super.eagerJoinRelationAlias(alias, propertyPath).toLowerCase();
  }
}
