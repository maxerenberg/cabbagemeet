const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Migration1672038966530 {
    name = 'Migration1672038966530'

    async up(queryRunner) {
const { dbname } = (await queryRunner.query("SELECT DATABASE() AS `dbname`"))[0];
        await queryRunner.query(`CREATE TABLE \`MicrosoftCalendarEvents\` (\`MeetingID\` int NOT NULL, \`UserID\` int NOT NULL, \`Events\` text NOT NULL, \`PrevStartDateTime\` varchar(255) NOT NULL, \`PrevEndDateTime\` varchar(255) NOT NULL, \`DeltaLink\` text NOT NULL, INDEX \`IDX_cae5279345720003fa4e4c92b1\` (\`UserID\`), PRIMARY KEY (\`MeetingID\`, \`UserID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`MicrosoftOAuth2\` (\`UserID\` int NOT NULL, \`LinkedCalendar\` tinyint NOT NULL DEFAULT 1, \`Sub\` varchar(255) NOT NULL, \`AccessToken\` text NOT NULL, \`AccessTokenExpiresAt\` int NOT NULL, \`RefreshToken\` text NOT NULL, UNIQUE INDEX \`IDX_f61d503231a98ecf1dafa783eb\` (\`Sub\`), PRIMARY KEY (\`UserID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`MicrosoftCalendarCreatedEvent\` (\`RespondentID\` int NOT NULL, \`UserID\` int NOT NULL, \`CreatedEventID\` varchar(255) NOT NULL, INDEX \`IDX_11dcd204e07423d2d30750c67a\` (\`UserID\`), PRIMARY KEY (\`RespondentID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`MeetingRespondent\` (\`RespondentID\` int NOT NULL AUTO_INCREMENT, \`MeetingID\` int NOT NULL, \`UserID\` int NULL, \`GuestName\` varchar(255) NULL, \`GuestEmail\` varchar(255) NULL, \`Availabilities\` varchar(255) NOT NULL, INDEX \`IDX_7683aab7b4f83cd884c396b9ed\` (\`UserID\`), UNIQUE INDEX \`IDX_84550e253a24bf39b6d37b7839\` (\`MeetingID\`, \`UserID\`), PRIMARY KEY (\`RespondentID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`GoogleCalendarCreatedEvent\` (\`RespondentID\` int NOT NULL, \`UserID\` int NOT NULL, \`CreatedEventID\` varchar(255) NOT NULL, INDEX \`IDX_5fb0315e585fd420c48fe19ec8\` (\`UserID\`), PRIMARY KEY (\`RespondentID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`GoogleCalendarEvents\` (\`MeetingID\` int NOT NULL, \`UserID\` int NOT NULL, \`Events\` text NOT NULL, \`PrevTimeMin\` varchar(255) NOT NULL, \`PrevTimeMax\` varchar(255) NOT NULL, \`SyncToken\` text NOT NULL, INDEX \`IDX_d8a87e8db78e501a53ddb2a76b\` (\`UserID\`), PRIMARY KEY (\`MeetingID\`, \`UserID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`GoogleOAuth2\` (\`UserID\` int NOT NULL, \`LinkedCalendar\` tinyint NOT NULL DEFAULT 1, \`Sub\` varchar(255) NOT NULL, \`AccessToken\` text NOT NULL, \`AccessTokenExpiresAt\` int NOT NULL, \`RefreshToken\` text NOT NULL, UNIQUE INDEX \`IDX_3ad3be85cd7f6f8e43e519b420\` (\`Sub\`), PRIMARY KEY (\`UserID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`User\` (\`ID\` int NOT NULL AUTO_INCREMENT, \`PasswordHash\` varchar(255) NULL, \`TimestampOfEarliestValidToken\` int NULL, \`Name\` varchar(255) NOT NULL, \`Email\` varchar(255) NOT NULL, \`IsSubscribedToNotifications\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_2f56f7040c2b05fc8f08a113f7\` (\`Email\`), PRIMARY KEY (\`ID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`Meeting\` (\`ID\` int NOT NULL AUTO_INCREMENT, \`Name\` varchar(255) NOT NULL, \`About\` varchar(255) NOT NULL, \`Timezone\` varchar(255) NOT NULL, \`MinStartHour\` decimal(4,2) NOT NULL, \`MaxEndHour\` decimal(4,2) NOT NULL, \`TentativeDates\` text NOT NULL, \`ScheduledStartDateTime\` varchar(255) NULL, \`ScheduledEndDateTime\` varchar(255) NULL, \`WasScheduledAtLeastOnce\` tinyint NOT NULL DEFAULT 0, \`CreatorID\` int NULL, \`LatestTentativeOrScheduledDate\` varchar(255) AS (CASE WHEN ScheduledEndDateTime IS NULL THEN JSON_EXTRACT(TentativeDates, CONCAT('$[', JSON_LENGTH(TentativeDates)-1, ']')) ELSE ScheduledEndDateTime END) VIRTUAL, INDEX \`IDX_0beec42f1ce51d531b8f5dbf22\` (\`CreatorID\`), INDEX \`IDX_2e555847281652e36a875f9aba\` (\`LatestTentativeOrScheduledDate\`), PRIMARY KEY (\`ID\`)) ENGINE=InnoDB`);
        await queryRunner.query(`INSERT INTO \`typeorm_metadata\`(\`database\`, \`schema\`, \`table\`, \`type\`, \`name\`, \`value\`) VALUES (DEFAULT, ?, ?, ?, ?, ?)`, [dbname,"Meeting","GENERATED_COLUMN","LatestTentativeOrScheduledDate","CASE WHEN ScheduledEndDateTime IS NULL THEN JSON_EXTRACT(TentativeDates, CONCAT('$[', JSON_LENGTH(TentativeDates)-1, ']')) ELSE ScheduledEndDateTime END"]);
        await queryRunner.query(`CREATE TABLE \`Config\` (\`Key\` varchar(255) NOT NULL, \`Value\` varchar(255) NOT NULL, PRIMARY KEY (\`Key\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarEvents\` ADD CONSTRAINT \`FK_d73e06bf993b37592f99233a999\` FOREIGN KEY (\`MeetingID\`) REFERENCES \`Meeting\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarEvents\` ADD CONSTRAINT \`FK_cae5279345720003fa4e4c92b1a\` FOREIGN KEY (\`UserID\`) REFERENCES \`MicrosoftOAuth2\`(\`UserID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`MicrosoftOAuth2\` ADD CONSTRAINT \`FK_a56c786076ca327ff01b09e5824\` FOREIGN KEY (\`UserID\`) REFERENCES \`User\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarCreatedEvent\` ADD CONSTRAINT \`FK_4af9eb16ff51bbcf86bac0c6c5c\` FOREIGN KEY (\`RespondentID\`) REFERENCES \`MeetingRespondent\`(\`RespondentID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarCreatedEvent\` ADD CONSTRAINT \`FK_11dcd204e07423d2d30750c67af\` FOREIGN KEY (\`UserID\`) REFERENCES \`MicrosoftOAuth2\`(\`UserID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`MeetingRespondent\` ADD CONSTRAINT \`FK_ca0240557036d583a1f89e83c2f\` FOREIGN KEY (\`MeetingID\`) REFERENCES \`Meeting\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`MeetingRespondent\` ADD CONSTRAINT \`FK_3ebc034c8b29691278a43922083\` FOREIGN KEY (\`UserID\`) REFERENCES \`User\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarCreatedEvent\` ADD CONSTRAINT \`FK_066ecb0b9e5f8491fc1d28d5fe9\` FOREIGN KEY (\`RespondentID\`) REFERENCES \`MeetingRespondent\`(\`RespondentID\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarCreatedEvent\` ADD CONSTRAINT \`FK_5fb0315e585fd420c48fe19ec8e\` FOREIGN KEY (\`UserID\`) REFERENCES \`GoogleOAuth2\`(\`UserID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarEvents\` ADD CONSTRAINT \`FK_ade6c2a63c18a10ca44512c262d\` FOREIGN KEY (\`MeetingID\`) REFERENCES \`Meeting\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarEvents\` ADD CONSTRAINT \`FK_d8a87e8db78e501a53ddb2a76bf\` FOREIGN KEY (\`UserID\`) REFERENCES \`GoogleOAuth2\`(\`UserID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`GoogleOAuth2\` ADD CONSTRAINT \`FK_8a646b86d3badada2c6a32f7c52\` FOREIGN KEY (\`UserID\`) REFERENCES \`User\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`Meeting\` ADD CONSTRAINT \`FK_2c4887a0cd84df13e0378dd457a\` FOREIGN KEY (\`CreatorID\`) REFERENCES \`User\`(\`ID\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
const { dbname } = (await queryRunner.query("SELECT DATABASE() AS `dbname`"))[0];
        await queryRunner.query(`ALTER TABLE \`Meeting\` DROP FOREIGN KEY \`FK_2c4887a0cd84df13e0378dd457a\``);
        await queryRunner.query(`ALTER TABLE \`GoogleOAuth2\` DROP FOREIGN KEY \`FK_8a646b86d3badada2c6a32f7c52\``);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarEvents\` DROP FOREIGN KEY \`FK_d8a87e8db78e501a53ddb2a76bf\``);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarEvents\` DROP FOREIGN KEY \`FK_ade6c2a63c18a10ca44512c262d\``);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarCreatedEvent\` DROP FOREIGN KEY \`FK_5fb0315e585fd420c48fe19ec8e\``);
        await queryRunner.query(`ALTER TABLE \`GoogleCalendarCreatedEvent\` DROP FOREIGN KEY \`FK_066ecb0b9e5f8491fc1d28d5fe9\``);
        await queryRunner.query(`ALTER TABLE \`MeetingRespondent\` DROP FOREIGN KEY \`FK_3ebc034c8b29691278a43922083\``);
        await queryRunner.query(`ALTER TABLE \`MeetingRespondent\` DROP FOREIGN KEY \`FK_ca0240557036d583a1f89e83c2f\``);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarCreatedEvent\` DROP FOREIGN KEY \`FK_11dcd204e07423d2d30750c67af\``);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarCreatedEvent\` DROP FOREIGN KEY \`FK_4af9eb16ff51bbcf86bac0c6c5c\``);
        await queryRunner.query(`ALTER TABLE \`MicrosoftOAuth2\` DROP FOREIGN KEY \`FK_a56c786076ca327ff01b09e5824\``);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarEvents\` DROP FOREIGN KEY \`FK_cae5279345720003fa4e4c92b1a\``);
        await queryRunner.query(`ALTER TABLE \`MicrosoftCalendarEvents\` DROP FOREIGN KEY \`FK_d73e06bf993b37592f99233a999\``);
        await queryRunner.query(`DROP TABLE \`Config\``);
        await queryRunner.query(`DELETE FROM \`typeorm_metadata\` WHERE \`type\` = ? AND \`name\` = ? AND \`schema\` = ? AND \`table\` = ?`, ["GENERATED_COLUMN","LatestTentativeOrScheduledDate",dbname,"Meeting"]);
        await queryRunner.query(`DROP INDEX \`IDX_2e555847281652e36a875f9aba\` ON \`Meeting\``);
        await queryRunner.query(`DROP INDEX \`IDX_0beec42f1ce51d531b8f5dbf22\` ON \`Meeting\``);
        await queryRunner.query(`DROP TABLE \`Meeting\``);
        await queryRunner.query(`DROP INDEX \`IDX_2f56f7040c2b05fc8f08a113f7\` ON \`User\``);
        await queryRunner.query(`DROP TABLE \`User\``);
        await queryRunner.query(`DROP INDEX \`IDX_3ad3be85cd7f6f8e43e519b420\` ON \`GoogleOAuth2\``);
        await queryRunner.query(`DROP TABLE \`GoogleOAuth2\``);
        await queryRunner.query(`DROP INDEX \`IDX_d8a87e8db78e501a53ddb2a76b\` ON \`GoogleCalendarEvents\``);
        await queryRunner.query(`DROP TABLE \`GoogleCalendarEvents\``);
        await queryRunner.query(`DROP INDEX \`IDX_5fb0315e585fd420c48fe19ec8\` ON \`GoogleCalendarCreatedEvent\``);
        await queryRunner.query(`DROP TABLE \`GoogleCalendarCreatedEvent\``);
        await queryRunner.query(`DROP INDEX \`IDX_84550e253a24bf39b6d37b7839\` ON \`MeetingRespondent\``);
        await queryRunner.query(`DROP INDEX \`IDX_7683aab7b4f83cd884c396b9ed\` ON \`MeetingRespondent\``);
        await queryRunner.query(`DROP TABLE \`MeetingRespondent\``);
        await queryRunner.query(`DROP INDEX \`IDX_11dcd204e07423d2d30750c67a\` ON \`MicrosoftCalendarCreatedEvent\``);
        await queryRunner.query(`DROP TABLE \`MicrosoftCalendarCreatedEvent\``);
        await queryRunner.query(`DROP INDEX \`IDX_f61d503231a98ecf1dafa783eb\` ON \`MicrosoftOAuth2\``);
        await queryRunner.query(`DROP TABLE \`MicrosoftOAuth2\``);
        await queryRunner.query(`DROP INDEX \`IDX_cae5279345720003fa4e4c92b1\` ON \`MicrosoftCalendarEvents\``);
        await queryRunner.query(`DROP TABLE \`MicrosoftCalendarEvents\``);
    }
}
