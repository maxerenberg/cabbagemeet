const { MigrationInterface, QueryRunner } = require("typeorm");
const {
  latestTentativeOrScheduledDateExpr,
  latestTentativeOrScheduledDateIndexName,
} = require('../../src/custom-migrations/sqlite/sqlite-migration-constants');

module.exports = class Migration1686380866103 {
  name = 'Migration1686380866103';

  // Note: TypeORM will automatically run `PRAGMA foreign_keys=off` before
  // starting the transaction for a migration, and will run
  // `PRAGMA foreign_keys=on` after the transaction was committed or rolled back

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "temporary_Meeting" (
        "ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "Name" varchar NOT NULL, "About" varchar NOT NULL,
        "Timezone" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL,
        "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" text NOT NULL,
        "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar,
        "WasScheduledAtLeastOnce" boolean NOT NULL DEFAULT (0),
        "CreatorID" integer, "Slug" varchar NOT NULL,
        FOREIGN KEY ("CreatorID") REFERENCES "User" ("ID")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      INSERT INTO "temporary_Meeting" (
        "ID", "Name", "About", "Timezone", "MinStartHour", "MaxEndHour",
        "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime",
        "WasScheduledAtLeastOnce", "CreatorID", "Slug"
      ) SELECT
        "ID", "Name", "About", "Timezone", "MinStartHour", "MaxEndHour",
        "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime",
        "WasScheduledAtLeastOnce", "CreatorID", CAST("ID" AS varchar)
      FROM Meeting
    `);
    await queryRunner.query(`DROP TABLE Meeting`);
    await queryRunner.query(`ALTER TABLE "temporary_Meeting" RENAME TO "Meeting"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_Meeting_CreatorID" ON "Meeting" ("CreatorID")
      WHERE CreatorID IS NOT NULL
    `);
    await queryRunner.query(
      `CREATE INDEX ${latestTentativeOrScheduledDateIndexName}
        ON Meeting ((${latestTentativeOrScheduledDateExpr}))
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_Meeting_Slug" ON "Meeting" ("Slug")
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX "IDX_Meeting_Slug"`);
    await queryRunner.query(`ALTER TABLE "Meeting" DROP COLUMN "Slug"`);
  }
};
