const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Migration1672038966530 {
    name = 'Migration1672038966530'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "MicrosoftCalendarEvents" ("MeetingID" integer NOT NULL, "UserID" integer NOT NULL, "Events" text NOT NULL, "PrevStartDateTime" varchar NOT NULL, "PrevEndDateTime" varchar NOT NULL, "DeltaLink" text NOT NULL, PRIMARY KEY ("MeetingID", "UserID"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cae5279345720003fa4e4c92b1" ON "MicrosoftCalendarEvents" ("UserID") `);
        await queryRunner.query(`CREATE TABLE "MicrosoftOAuth2" ("UserID" integer PRIMARY KEY NOT NULL, "LinkedCalendar" boolean NOT NULL DEFAULT (1), "Sub" varchar NOT NULL, "AccessToken" text NOT NULL, "AccessTokenExpiresAt" integer NOT NULL, "RefreshToken" text NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f61d503231a98ecf1dafa783eb" ON "MicrosoftOAuth2" ("Sub") `);
        await queryRunner.query(`CREATE TABLE "MicrosoftCalendarCreatedEvent" ("RespondentID" integer PRIMARY KEY NOT NULL, "UserID" integer NOT NULL, "CreatedEventID" varchar NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_11dcd204e07423d2d30750c67a" ON "MicrosoftCalendarCreatedEvent" ("UserID") `);
        await queryRunner.query(`CREATE TABLE "MeetingRespondent" ("RespondentID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "MeetingID" integer NOT NULL, "UserID" integer, "GuestName" varchar, "GuestEmail" varchar, "Availabilities" text NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_7683aab7b4f83cd884c396b9ed" ON "MeetingRespondent" ("UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_84550e253a24bf39b6d37b7839" ON "MeetingRespondent" ("MeetingID", "UserID") `);
        await queryRunner.query(`CREATE TABLE "GoogleCalendarCreatedEvent" ("RespondentID" integer PRIMARY KEY NOT NULL, "UserID" integer NOT NULL, "CreatedEventID" varchar NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_5fb0315e585fd420c48fe19ec8" ON "GoogleCalendarCreatedEvent" ("UserID") `);
        await queryRunner.query(`CREATE TABLE "GoogleCalendarEvents" ("MeetingID" integer NOT NULL, "UserID" integer NOT NULL, "Events" text NOT NULL, "PrevTimeMin" varchar NOT NULL, "PrevTimeMax" varchar NOT NULL, "SyncToken" text NOT NULL, PRIMARY KEY ("MeetingID", "UserID"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d8a87e8db78e501a53ddb2a76b" ON "GoogleCalendarEvents" ("UserID") `);
        await queryRunner.query(`CREATE TABLE "GoogleOAuth2" ("UserID" integer PRIMARY KEY NOT NULL, "LinkedCalendar" boolean NOT NULL DEFAULT (1), "Sub" varchar NOT NULL, "AccessToken" text NOT NULL, "AccessTokenExpiresAt" integer NOT NULL, "RefreshToken" text NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3ad3be85cd7f6f8e43e519b420" ON "GoogleOAuth2" ("Sub") `);
        await queryRunner.query(`CREATE TABLE "User" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "PasswordHash" varchar, "TimestampOfEarliestValidToken" integer, "Name" varchar NOT NULL, "Email" varchar NOT NULL, "IsSubscribedToNotifications" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2f56f7040c2b05fc8f08a113f7" ON "User" ("Email") `);
        await queryRunner.query(`CREATE TABLE "Meeting" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "Name" varchar NOT NULL, "About" varchar NOT NULL, "Timezone" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL, "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" text NOT NULL, "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar, "WasScheduledAtLeastOnce" boolean NOT NULL DEFAULT (0), "CreatorID" integer)`);
        await queryRunner.query(`CREATE INDEX "IDX_0beec42f1ce51d531b8f5dbf22" ON "Meeting" ("CreatorID") WHERE CreatorID IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "Config" ("Key" varchar PRIMARY KEY NOT NULL, "Value" varchar NOT NULL)`);
        await queryRunner.query(`DROP INDEX "IDX_cae5279345720003fa4e4c92b1"`);
        await queryRunner.query(`CREATE TABLE "temporary_MicrosoftCalendarEvents" ("MeetingID" integer NOT NULL, "UserID" integer NOT NULL, "Events" text NOT NULL, "PrevStartDateTime" varchar NOT NULL, "PrevEndDateTime" varchar NOT NULL, "DeltaLink" text NOT NULL, CONSTRAINT "FK_d73e06bf993b37592f99233a999" FOREIGN KEY ("MeetingID") REFERENCES "Meeting" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_cae5279345720003fa4e4c92b1a" FOREIGN KEY ("UserID") REFERENCES "MicrosoftOAuth2" ("UserID") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("MeetingID", "UserID"))`);
        await queryRunner.query(`INSERT INTO "temporary_MicrosoftCalendarEvents"("MeetingID", "UserID", "Events", "PrevStartDateTime", "PrevEndDateTime", "DeltaLink") SELECT "MeetingID", "UserID", "Events", "PrevStartDateTime", "PrevEndDateTime", "DeltaLink" FROM "MicrosoftCalendarEvents"`);
        await queryRunner.query(`DROP TABLE "MicrosoftCalendarEvents"`);
        await queryRunner.query(`ALTER TABLE "temporary_MicrosoftCalendarEvents" RENAME TO "MicrosoftCalendarEvents"`);
        await queryRunner.query(`CREATE INDEX "IDX_cae5279345720003fa4e4c92b1" ON "MicrosoftCalendarEvents" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_f61d503231a98ecf1dafa783eb"`);
        await queryRunner.query(`CREATE TABLE "temporary_MicrosoftOAuth2" ("UserID" integer PRIMARY KEY NOT NULL, "LinkedCalendar" boolean NOT NULL DEFAULT (1), "Sub" varchar NOT NULL, "AccessToken" text NOT NULL, "AccessTokenExpiresAt" integer NOT NULL, "RefreshToken" text NOT NULL, CONSTRAINT "FK_a56c786076ca327ff01b09e5824" FOREIGN KEY ("UserID") REFERENCES "User" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_MicrosoftOAuth2"("UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken") SELECT "UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken" FROM "MicrosoftOAuth2"`);
        await queryRunner.query(`DROP TABLE "MicrosoftOAuth2"`);
        await queryRunner.query(`ALTER TABLE "temporary_MicrosoftOAuth2" RENAME TO "MicrosoftOAuth2"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f61d503231a98ecf1dafa783eb" ON "MicrosoftOAuth2" ("Sub") `);
        await queryRunner.query(`DROP INDEX "IDX_11dcd204e07423d2d30750c67a"`);
        await queryRunner.query(`CREATE TABLE "temporary_MicrosoftCalendarCreatedEvent" ("RespondentID" integer PRIMARY KEY NOT NULL, "UserID" integer NOT NULL, "CreatedEventID" varchar NOT NULL, CONSTRAINT "FK_4af9eb16ff51bbcf86bac0c6c5c" FOREIGN KEY ("RespondentID") REFERENCES "MeetingRespondent" ("RespondentID") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_11dcd204e07423d2d30750c67af" FOREIGN KEY ("UserID") REFERENCES "MicrosoftOAuth2" ("UserID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_MicrosoftCalendarCreatedEvent"("RespondentID", "UserID", "CreatedEventID") SELECT "RespondentID", "UserID", "CreatedEventID" FROM "MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`DROP TABLE "MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`ALTER TABLE "temporary_MicrosoftCalendarCreatedEvent" RENAME TO "MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`CREATE INDEX "IDX_11dcd204e07423d2d30750c67a" ON "MicrosoftCalendarCreatedEvent" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_7683aab7b4f83cd884c396b9ed"`);
        await queryRunner.query(`DROP INDEX "IDX_84550e253a24bf39b6d37b7839"`);
        await queryRunner.query(`CREATE TABLE "temporary_MeetingRespondent" ("RespondentID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "MeetingID" integer NOT NULL, "UserID" integer, "GuestName" varchar, "GuestEmail" varchar, "Availabilities" text NOT NULL, CONSTRAINT "FK_ca0240557036d583a1f89e83c2f" FOREIGN KEY ("MeetingID") REFERENCES "Meeting" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_3ebc034c8b29691278a43922083" FOREIGN KEY ("UserID") REFERENCES "User" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_MeetingRespondent"("RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities") SELECT "RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities" FROM "MeetingRespondent"`);
        await queryRunner.query(`DROP TABLE "MeetingRespondent"`);
        await queryRunner.query(`ALTER TABLE "temporary_MeetingRespondent" RENAME TO "MeetingRespondent"`);
        await queryRunner.query(`CREATE INDEX "IDX_7683aab7b4f83cd884c396b9ed" ON "MeetingRespondent" ("UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_84550e253a24bf39b6d37b7839" ON "MeetingRespondent" ("MeetingID", "UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_5fb0315e585fd420c48fe19ec8"`);
        await queryRunner.query(`CREATE TABLE "temporary_GoogleCalendarCreatedEvent" ("RespondentID" integer PRIMARY KEY NOT NULL, "UserID" integer NOT NULL, "CreatedEventID" varchar NOT NULL, CONSTRAINT "FK_066ecb0b9e5f8491fc1d28d5fe9" FOREIGN KEY ("RespondentID") REFERENCES "MeetingRespondent" ("RespondentID") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_5fb0315e585fd420c48fe19ec8e" FOREIGN KEY ("UserID") REFERENCES "GoogleOAuth2" ("UserID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_GoogleCalendarCreatedEvent"("RespondentID", "UserID", "CreatedEventID") SELECT "RespondentID", "UserID", "CreatedEventID" FROM "GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`DROP TABLE "GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`ALTER TABLE "temporary_GoogleCalendarCreatedEvent" RENAME TO "GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`CREATE INDEX "IDX_5fb0315e585fd420c48fe19ec8" ON "GoogleCalendarCreatedEvent" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_d8a87e8db78e501a53ddb2a76b"`);
        await queryRunner.query(`CREATE TABLE "temporary_GoogleCalendarEvents" ("MeetingID" integer NOT NULL, "UserID" integer NOT NULL, "Events" text NOT NULL, "PrevTimeMin" varchar NOT NULL, "PrevTimeMax" varchar NOT NULL, "SyncToken" text NOT NULL, CONSTRAINT "FK_ade6c2a63c18a10ca44512c262d" FOREIGN KEY ("MeetingID") REFERENCES "Meeting" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_d8a87e8db78e501a53ddb2a76bf" FOREIGN KEY ("UserID") REFERENCES "GoogleOAuth2" ("UserID") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("MeetingID", "UserID"))`);
        await queryRunner.query(`INSERT INTO "temporary_GoogleCalendarEvents"("MeetingID", "UserID", "Events", "PrevTimeMin", "PrevTimeMax", "SyncToken") SELECT "MeetingID", "UserID", "Events", "PrevTimeMin", "PrevTimeMax", "SyncToken" FROM "GoogleCalendarEvents"`);
        await queryRunner.query(`DROP TABLE "GoogleCalendarEvents"`);
        await queryRunner.query(`ALTER TABLE "temporary_GoogleCalendarEvents" RENAME TO "GoogleCalendarEvents"`);
        await queryRunner.query(`CREATE INDEX "IDX_d8a87e8db78e501a53ddb2a76b" ON "GoogleCalendarEvents" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_3ad3be85cd7f6f8e43e519b420"`);
        await queryRunner.query(`CREATE TABLE "temporary_GoogleOAuth2" ("UserID" integer PRIMARY KEY NOT NULL, "LinkedCalendar" boolean NOT NULL DEFAULT (1), "Sub" varchar NOT NULL, "AccessToken" text NOT NULL, "AccessTokenExpiresAt" integer NOT NULL, "RefreshToken" text NOT NULL, CONSTRAINT "FK_8a646b86d3badada2c6a32f7c52" FOREIGN KEY ("UserID") REFERENCES "User" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_GoogleOAuth2"("UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken") SELECT "UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken" FROM "GoogleOAuth2"`);
        await queryRunner.query(`DROP TABLE "GoogleOAuth2"`);
        await queryRunner.query(`ALTER TABLE "temporary_GoogleOAuth2" RENAME TO "GoogleOAuth2"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3ad3be85cd7f6f8e43e519b420" ON "GoogleOAuth2" ("Sub") `);
        await queryRunner.query(`DROP INDEX "IDX_0beec42f1ce51d531b8f5dbf22"`);
        await queryRunner.query(`CREATE TABLE "temporary_Meeting" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "Name" varchar NOT NULL, "About" varchar NOT NULL, "Timezone" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL, "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" text NOT NULL, "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar, "WasScheduledAtLeastOnce" boolean NOT NULL DEFAULT (0), "CreatorID" integer, CONSTRAINT "FK_2c4887a0cd84df13e0378dd457a" FOREIGN KEY ("CreatorID") REFERENCES "User" ("ID") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_Meeting"("ID", "Name", "About", "Timezone", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "WasScheduledAtLeastOnce", "CreatorID") SELECT "ID", "Name", "About", "Timezone", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "WasScheduledAtLeastOnce", "CreatorID" FROM "Meeting"`);
        await queryRunner.query(`DROP TABLE "Meeting"`);
        await queryRunner.query(`ALTER TABLE "temporary_Meeting" RENAME TO "Meeting"`);
        await queryRunner.query(`CREATE INDEX "IDX_0beec42f1ce51d531b8f5dbf22" ON "Meeting" ("CreatorID") WHERE CreatorID IS NOT NULL`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_0beec42f1ce51d531b8f5dbf22"`);
        await queryRunner.query(`ALTER TABLE "Meeting" RENAME TO "temporary_Meeting"`);
        await queryRunner.query(`CREATE TABLE "Meeting" ("ID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "Name" varchar NOT NULL, "About" varchar NOT NULL, "Timezone" varchar NOT NULL, "MinStartHour" decimal(4,2) NOT NULL, "MaxEndHour" decimal(4,2) NOT NULL, "TentativeDates" text NOT NULL, "ScheduledStartDateTime" varchar, "ScheduledEndDateTime" varchar, "WasScheduledAtLeastOnce" boolean NOT NULL DEFAULT (0), "CreatorID" integer)`);
        await queryRunner.query(`INSERT INTO "Meeting"("ID", "Name", "About", "Timezone", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "WasScheduledAtLeastOnce", "CreatorID") SELECT "ID", "Name", "About", "Timezone", "MinStartHour", "MaxEndHour", "TentativeDates", "ScheduledStartDateTime", "ScheduledEndDateTime", "WasScheduledAtLeastOnce", "CreatorID" FROM "temporary_Meeting"`);
        await queryRunner.query(`DROP TABLE "temporary_Meeting"`);
        await queryRunner.query(`CREATE INDEX "IDX_0beec42f1ce51d531b8f5dbf22" ON "Meeting" ("CreatorID") WHERE CreatorID IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "IDX_3ad3be85cd7f6f8e43e519b420"`);
        await queryRunner.query(`ALTER TABLE "GoogleOAuth2" RENAME TO "temporary_GoogleOAuth2"`);
        await queryRunner.query(`CREATE TABLE "GoogleOAuth2" ("UserID" integer PRIMARY KEY NOT NULL, "LinkedCalendar" boolean NOT NULL DEFAULT (1), "Sub" varchar NOT NULL, "AccessToken" text NOT NULL, "AccessTokenExpiresAt" integer NOT NULL, "RefreshToken" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "GoogleOAuth2"("UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken") SELECT "UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken" FROM "temporary_GoogleOAuth2"`);
        await queryRunner.query(`DROP TABLE "temporary_GoogleOAuth2"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3ad3be85cd7f6f8e43e519b420" ON "GoogleOAuth2" ("Sub") `);
        await queryRunner.query(`DROP INDEX "IDX_d8a87e8db78e501a53ddb2a76b"`);
        await queryRunner.query(`ALTER TABLE "GoogleCalendarEvents" RENAME TO "temporary_GoogleCalendarEvents"`);
        await queryRunner.query(`CREATE TABLE "GoogleCalendarEvents" ("MeetingID" integer NOT NULL, "UserID" integer NOT NULL, "Events" text NOT NULL, "PrevTimeMin" varchar NOT NULL, "PrevTimeMax" varchar NOT NULL, "SyncToken" text NOT NULL, PRIMARY KEY ("MeetingID", "UserID"))`);
        await queryRunner.query(`INSERT INTO "GoogleCalendarEvents"("MeetingID", "UserID", "Events", "PrevTimeMin", "PrevTimeMax", "SyncToken") SELECT "MeetingID", "UserID", "Events", "PrevTimeMin", "PrevTimeMax", "SyncToken" FROM "temporary_GoogleCalendarEvents"`);
        await queryRunner.query(`DROP TABLE "temporary_GoogleCalendarEvents"`);
        await queryRunner.query(`CREATE INDEX "IDX_d8a87e8db78e501a53ddb2a76b" ON "GoogleCalendarEvents" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_5fb0315e585fd420c48fe19ec8"`);
        await queryRunner.query(`ALTER TABLE "GoogleCalendarCreatedEvent" RENAME TO "temporary_GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`CREATE TABLE "GoogleCalendarCreatedEvent" ("RespondentID" integer PRIMARY KEY NOT NULL, "UserID" integer NOT NULL, "CreatedEventID" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "GoogleCalendarCreatedEvent"("RespondentID", "UserID", "CreatedEventID") SELECT "RespondentID", "UserID", "CreatedEventID" FROM "temporary_GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`DROP TABLE "temporary_GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`CREATE INDEX "IDX_5fb0315e585fd420c48fe19ec8" ON "GoogleCalendarCreatedEvent" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_84550e253a24bf39b6d37b7839"`);
        await queryRunner.query(`DROP INDEX "IDX_7683aab7b4f83cd884c396b9ed"`);
        await queryRunner.query(`ALTER TABLE "MeetingRespondent" RENAME TO "temporary_MeetingRespondent"`);
        await queryRunner.query(`CREATE TABLE "MeetingRespondent" ("RespondentID" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "MeetingID" integer NOT NULL, "UserID" integer, "GuestName" varchar, "GuestEmail" varchar, "Availabilities" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "MeetingRespondent"("RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities") SELECT "RespondentID", "MeetingID", "UserID", "GuestName", "GuestEmail", "Availabilities" FROM "temporary_MeetingRespondent"`);
        await queryRunner.query(`DROP TABLE "temporary_MeetingRespondent"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_84550e253a24bf39b6d37b7839" ON "MeetingRespondent" ("MeetingID", "UserID") `);
        await queryRunner.query(`CREATE INDEX "IDX_7683aab7b4f83cd884c396b9ed" ON "MeetingRespondent" ("UserID") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`DROP INDEX "IDX_11dcd204e07423d2d30750c67a"`);
        await queryRunner.query(`ALTER TABLE "MicrosoftCalendarCreatedEvent" RENAME TO "temporary_MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`CREATE TABLE "MicrosoftCalendarCreatedEvent" ("RespondentID" integer PRIMARY KEY NOT NULL, "UserID" integer NOT NULL, "CreatedEventID" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "MicrosoftCalendarCreatedEvent"("RespondentID", "UserID", "CreatedEventID") SELECT "RespondentID", "UserID", "CreatedEventID" FROM "temporary_MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`DROP TABLE "temporary_MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`CREATE INDEX "IDX_11dcd204e07423d2d30750c67a" ON "MicrosoftCalendarCreatedEvent" ("UserID") `);
        await queryRunner.query(`DROP INDEX "IDX_f61d503231a98ecf1dafa783eb"`);
        await queryRunner.query(`ALTER TABLE "MicrosoftOAuth2" RENAME TO "temporary_MicrosoftOAuth2"`);
        await queryRunner.query(`CREATE TABLE "MicrosoftOAuth2" ("UserID" integer PRIMARY KEY NOT NULL, "LinkedCalendar" boolean NOT NULL DEFAULT (1), "Sub" varchar NOT NULL, "AccessToken" text NOT NULL, "AccessTokenExpiresAt" integer NOT NULL, "RefreshToken" text NOT NULL)`);
        await queryRunner.query(`INSERT INTO "MicrosoftOAuth2"("UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken") SELECT "UserID", "LinkedCalendar", "Sub", "AccessToken", "AccessTokenExpiresAt", "RefreshToken" FROM "temporary_MicrosoftOAuth2"`);
        await queryRunner.query(`DROP TABLE "temporary_MicrosoftOAuth2"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f61d503231a98ecf1dafa783eb" ON "MicrosoftOAuth2" ("Sub") `);
        await queryRunner.query(`DROP INDEX "IDX_cae5279345720003fa4e4c92b1"`);
        await queryRunner.query(`ALTER TABLE "MicrosoftCalendarEvents" RENAME TO "temporary_MicrosoftCalendarEvents"`);
        await queryRunner.query(`CREATE TABLE "MicrosoftCalendarEvents" ("MeetingID" integer NOT NULL, "UserID" integer NOT NULL, "Events" text NOT NULL, "PrevStartDateTime" varchar NOT NULL, "PrevEndDateTime" varchar NOT NULL, "DeltaLink" text NOT NULL, PRIMARY KEY ("MeetingID", "UserID"))`);
        await queryRunner.query(`INSERT INTO "MicrosoftCalendarEvents"("MeetingID", "UserID", "Events", "PrevStartDateTime", "PrevEndDateTime", "DeltaLink") SELECT "MeetingID", "UserID", "Events", "PrevStartDateTime", "PrevEndDateTime", "DeltaLink" FROM "temporary_MicrosoftCalendarEvents"`);
        await queryRunner.query(`DROP TABLE "temporary_MicrosoftCalendarEvents"`);
        await queryRunner.query(`CREATE INDEX "IDX_cae5279345720003fa4e4c92b1" ON "MicrosoftCalendarEvents" ("UserID") `);
        await queryRunner.query(`DROP TABLE "Config"`);
        await queryRunner.query(`DROP INDEX "IDX_0beec42f1ce51d531b8f5dbf22"`);
        await queryRunner.query(`DROP TABLE "Meeting"`);
        await queryRunner.query(`DROP INDEX "IDX_2f56f7040c2b05fc8f08a113f7"`);
        await queryRunner.query(`DROP TABLE "User"`);
        await queryRunner.query(`DROP INDEX "IDX_3ad3be85cd7f6f8e43e519b420"`);
        await queryRunner.query(`DROP TABLE "GoogleOAuth2"`);
        await queryRunner.query(`DROP INDEX "IDX_d8a87e8db78e501a53ddb2a76b"`);
        await queryRunner.query(`DROP TABLE "GoogleCalendarEvents"`);
        await queryRunner.query(`DROP INDEX "IDX_5fb0315e585fd420c48fe19ec8"`);
        await queryRunner.query(`DROP TABLE "GoogleCalendarCreatedEvent"`);
        await queryRunner.query(`DROP INDEX "IDX_84550e253a24bf39b6d37b7839"`);
        await queryRunner.query(`DROP INDEX "IDX_7683aab7b4f83cd884c396b9ed"`);
        await queryRunner.query(`DROP TABLE "MeetingRespondent"`);
        await queryRunner.query(`DROP INDEX "IDX_11dcd204e07423d2d30750c67a"`);
        await queryRunner.query(`DROP TABLE "MicrosoftCalendarCreatedEvent"`);
        await queryRunner.query(`DROP INDEX "IDX_f61d503231a98ecf1dafa783eb"`);
        await queryRunner.query(`DROP TABLE "MicrosoftOAuth2"`);
        await queryRunner.query(`DROP INDEX "IDX_cae5279345720003fa4e4c92b1"`);
        await queryRunner.query(`DROP TABLE "MicrosoftCalendarEvents"`);
    }
}
