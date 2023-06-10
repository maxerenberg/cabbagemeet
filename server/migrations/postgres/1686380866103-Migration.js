const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Migration1686380866103 {
    name = 'Migration1686380866103';

    async up(queryRunner) {
      await queryRunner.query(`ALTER TABLE "meeting" ADD COLUMN "slug" varchar`);
      await queryRunner.query(`UPDATE "meeting" SET "slug" = CAST("id" AS varchar)`);
      await queryRunner.query(`ALTER TABLE "meeting" ALTER COLUMN "slug" SET NOT NULL`);
      await queryRunner.query(`CREATE UNIQUE INDEX "IDX_Meeting_Slug" ON "meeting" ("slug")`);
    }

    async down(queryRunner) {
      await queryRunner.query(`DROP INDEX "IDX_Meeting_Slug"`);
      await queryRunner.query(`ALTER TABLE "meeting" DROP COLUMN "slug"`);
    }
};
