const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Migration1666839574235 {
    name = 'Migration1666839574235'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "Config" ("Key" varchar PRIMARY KEY NOT NULL, "Value" varchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "Meeting" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "Name" varchar NOT NULL, "About" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL, "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" varchar NOT NULL, "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar, "CreatorID" integer)`);
        await queryRunner.query(`CREATE INDEX "IDX_0beec42f1ce51d531b8f5dbf22" ON "Meeting" ("CreatorID") WHERE CreatorID IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "User" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "PasswordHash" varchar, "Name" varchar NOT NULL, "Email" varchar NOT NULL, "IsSubscribedToNotifications" boolean NOT NULL DEFAULT (1), "HasLinkedGoogleAccount" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2f56f7040c2b05fc8f08a113f7" ON "User" ("Email") `);
        await queryRunner.query(`CREATE TABLE "MeetingRespondent" ("RespondentID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "MeetingID" integer NOT NULL, "UserID" integer, "GuestName" varchar, "GuestEmail" varchar, "Availabilities" varchar NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_ca0240557036d583a1f89e83c2" ON "MeetingRespondent" ("MeetingID") `);
        await queryRunner.query(`CREATE INDEX "IDX_7683aab7b4f83cd884c396b9ed" ON "MeetingRespondent" ("UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_70d5f88cef1532b621c0948c08" ON "MeetingRespondent" ("MeetingID", "UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "IDX_0beec42f1ce51d531b8f5dbf22"`);
        await queryRunner.query(`CREATE TABLE "temporary_Meeting" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "Name" varchar NOT NULL, "About" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL, "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" varchar NOT NULL, "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar, "CreatorID" integer, CONSTRAINT "FK_2c4887a0cd84df13e0378dd457a" FOREIGN KEY ("CreatorID") REFERENCES "User" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_Meeting"("ID", "Name", "About", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "CreatorID") SELECT "ID", "Name", "About", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "CreatorID" FROM "Meeting"`);
        await queryRunner.query(`DROP TABLE "Meeting"`);
        await queryRunner.query(`ALTER TABLE "temporary_Meeting" RENAME TO "Meeting"`);
        await queryRunner.query(`CREATE INDEX "IDX_0beec42f1ce51d531b8f5dbf22" ON "Meeting" ("CreatorID") WHERE CreatorID IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "IDX_ca0240557036d583a1f89e83c2"`);
        await queryRunner.query(`DROP INDEX "IDX_7683aab7b4f83cd884c396b9ed"`);
        await queryRunner.query(`DROP INDEX "IDX_70d5f88cef1532b621c0948c08"`);
        await queryRunner.query(`CREATE TABLE "temporary_MeetingRespondent" ("RespondentID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "MeetingID" integer NOT NULL, "UserID" integer, "GuestName" varchar, "GuestEmail" varchar, "Availabilities" varchar NOT NULL, CONSTRAINT "FK_ca0240557036d583a1f89e83c2f" FOREIGN KEY ("MeetingID") REFERENCES "Meeting" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_3ebc034c8b29691278a43922083" FOREIGN KEY ("UserID") REFERENCES "User" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_MeetingRespondent"("RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities") SELECT "RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities" FROM "MeetingRespondent"`);
        await queryRunner.query(`DROP TABLE "MeetingRespondent"`);
        await queryRunner.query(`ALTER TABLE "temporary_MeetingRespondent" RENAME TO "MeetingRespondent"`);
        await queryRunner.query(`CREATE INDEX "IDX_ca0240557036d583a1f89e83c2" ON "MeetingRespondent" ("MeetingID") `);
        await queryRunner.query(`CREATE INDEX "IDX_7683aab7b4f83cd884c396b9ed" ON "MeetingRespondent" ("UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_70d5f88cef1532b621c0948c08" ON "MeetingRespondent" ("MeetingID", "UserID") WHERE UserID IS NOT NULL`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_70d5f88cef1532b621c0948c08"`);
        await queryRunner.query(`DROP INDEX "IDX_7683aab7b4f83cd884c396b9ed"`);
        await queryRunner.query(`DROP INDEX "IDX_ca0240557036d583a1f89e83c2"`);
        await queryRunner.query(`ALTER TABLE "MeetingRespondent" RENAME TO "temporary_MeetingRespondent"`);
        await queryRunner.query(`CREATE TABLE "MeetingRespondent" ("RespondentID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "MeetingID" integer NOT NULL, "UserID" integer, "GuestName" varchar, "GuestEmail" varchar, "Availabilities" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "MeetingRespondent"("RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities") SELECT "RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities" FROM "temporary_MeetingRespondent"`);
        await queryRunner.query(`DROP TABLE "temporary_MeetingRespondent"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_70d5f88cef1532b621c0948c08" ON "MeetingRespondent" ("MeetingID", "UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_7683aab7b4f83cd884c396b9ed" ON "MeetingRespondent" ("UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_ca0240557036d583a1f89e83c2" ON "MeetingRespondent" ("MeetingID") `);
        await queryRunner.query(`DROP INDEX "IDX_0beec42f1ce51d531b8f5dbf22"`);
        await queryRunner.query(`ALTER TABLE "Meeting" RENAME TO "temporary_Meeting"`);
        await queryRunner.query(`CREATE TABLE "Meeting" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "Name" varchar NOT NULL, "About" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL, "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" varchar NOT NULL, "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar, "CreatorID" integer)`);
        await queryRunner.query(`INSERT INTO "Meeting"("ID", "Name", "About", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "CreatorID") SELECT "ID", "Name", "About", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "CreatorID" FROM "temporary_Meeting"`);
        await queryRunner.query(`DROP TABLE "temporary_Meeting"`);
        await queryRunner.query(`CREATE INDEX "IDX_0beec42f1ce51d531b8f5dbf22" ON "Meeting" ("CreatorID") WHERE CreatorID IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "IDX_70d5f88cef1532b621c0948c08"`);
        await queryRunner.query(`DROP INDEX "IDX_7683aab7b4f83cd884c396b9ed"`);
        await queryRunner.query(`DROP INDEX "IDX_ca0240557036d583a1f89e83c2"`);
        await queryRunner.query(`DROP TABLE "MeetingRespondent"`);
        await queryRunner.query(`DROP INDEX "IDX_2f56f7040c2b05fc8f08a113f7"`);
        await queryRunner.query(`DROP TABLE "User"`);
        await queryRunner.query(`DROP INDEX "IDX_0beec42f1ce51d531b8f5dbf22"`);
        await queryRunner.query(`DROP TABLE "Meeting"`);
        await queryRunner.query(`DROP TABLE "Config"`);
    }
}
