const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Migration1686380866103 {
    name = 'Migration1686380866103';

    async up(queryRunner) {
      await queryRunner.query(`ALTER TABLE \`Meeting\` ADD COLUMN \`Slug\` varchar(255)`);
      await queryRunner.query(`UPDATE \`Meeting\` SET \`Slug\` = CAST(\`ID\` AS char)`);
      await queryRunner.query(`ALTER TABLE \`Meeting\` MODIFY COLUMN \`Slug\` varchar(255) NOT NULL`);
      await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_Meeting_Slug\` ON \`Meeting\` (\`Slug\`)`);
    }

    async down(queryRunner) {
      await queryRunner.query(`DROP INDEX \`IDX_Meeting_Slug\` ON \`Meeting\``);
      await queryRunner.query(`ALTER TABLE \`Meeting\` DROP COLUMN \`Slug\``);
    }
};
