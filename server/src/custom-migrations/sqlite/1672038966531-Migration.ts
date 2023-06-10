import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  latestTentativeOrScheduledDateExpr as indexExpr,
  latestTentativeOrScheduledDateIndexName as indexName,
} from './sqlite-migration-constants';

export class Migration1672038966531 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.query(
      `CREATE INDEX ${indexName} ON Meeting ((${indexExpr}))`,
    );
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`DROP INDEX ${indexName}`);
  }
}
