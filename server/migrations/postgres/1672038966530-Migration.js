const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Migration1672038966530 {
    name = 'Migration1672038966530'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "microsoftcalendarevents" ("meetingid" integer NOT NULL, "userid" integer NOT NULL, "events" text NOT NULL, "prevstartdatetime" character varying NOT NULL, "prevenddatetime" character varying NOT NULL, "deltalink" text NOT NULL, CONSTRAINT "pk_9d4a228f7f456a22dddd58ce8d5" PRIMARY KEY ("meetingid", "userid"))`);
        await queryRunner.query(`CREATE INDEX "idx_a17473979fe30cfaf8152bcfd7" ON "microsoftcalendarevents" ("userid") `);
        await queryRunner.query(`CREATE TABLE "microsoftoauth2" ("userid" integer NOT NULL, "linkedcalendar" boolean NOT NULL DEFAULT true, "sub" character varying NOT NULL, "accesstoken" text NOT NULL, "accesstokenexpiresat" integer NOT NULL, "refreshtoken" text NOT NULL, CONSTRAINT "pk_19a90a81275bafe86ae1ef66a8a" PRIMARY KEY ("userid"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_a6dcffaac17c8fa577daa93ad8" ON "microsoftoauth2" ("sub") `);
        await queryRunner.query(`CREATE TABLE "microsoftcalendarcreatedevent" ("respondentid" integer NOT NULL, "userid" integer NOT NULL, "createdeventid" character varying NOT NULL, CONSTRAINT "pk_0ef4d32bc094fd9da0f043e4317" PRIMARY KEY ("respondentid"))`);
        await queryRunner.query(`CREATE INDEX "idx_44490184afc45b796a4cd7016a" ON "microsoftcalendarcreatedevent" ("userid") `);
        await queryRunner.query(`CREATE TABLE "meetingrespondent" ("respondentid" SERIAL NOT NULL, "meetingid" integer NOT NULL, "userid" integer, "guestname" character varying, "guestemail" character varying, "availabilities" character varying NOT NULL, CONSTRAINT "pk_f44c9223ccc79a2997293d2d903" PRIMARY KEY ("respondentid"))`);
        await queryRunner.query(`CREATE INDEX "idx_59d8110458da8cb32352de1f95" ON "meetingrespondent" ("userid") WHERE UserID IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_4de0c48380ef30d01f77431533" ON "meetingrespondent" ("meetingid", "userid") `);
        await queryRunner.query(`CREATE TABLE "googlecalendarcreatedevent" ("respondentid" integer NOT NULL, "userid" integer NOT NULL, "createdeventid" character varying NOT NULL, CONSTRAINT "pk_391b9705eb024e5c282fa4de2df" PRIMARY KEY ("respondentid"))`);
        await queryRunner.query(`CREATE INDEX "idx_8649dc9c4d688c8930e530a597" ON "googlecalendarcreatedevent" ("userid") `);
        await queryRunner.query(`CREATE TABLE "googlecalendarevents" ("meetingid" integer NOT NULL, "userid" integer NOT NULL, "events" text NOT NULL, "prevtimemin" character varying NOT NULL, "prevtimemax" character varying NOT NULL, "synctoken" text NOT NULL, CONSTRAINT "pk_caefbd55ee650eaf675f6df155c" PRIMARY KEY ("meetingid", "userid"))`);
        await queryRunner.query(`CREATE INDEX "idx_d52cf21cfd1013cd8fa9051b9d" ON "googlecalendarevents" ("userid") `);
        await queryRunner.query(`CREATE TABLE "googleoauth2" ("userid" integer NOT NULL, "linkedcalendar" boolean NOT NULL DEFAULT true, "sub" character varying NOT NULL, "accesstoken" text NOT NULL, "accesstokenexpiresat" integer NOT NULL, "refreshtoken" text NOT NULL, CONSTRAINT "pk_1a86f18707b5586daa9fe2eb624" PRIMARY KEY ("userid"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_340f49fccfc9183f0d58f43408" ON "googleoauth2" ("sub") `);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "passwordhash" character varying, "timestampofearliestvalidtoken" integer, "name" character varying NOT NULL, "email" character varying NOT NULL, "issubscribedtonotifications" boolean NOT NULL DEFAULT false, CONSTRAINT "pk_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `);
        await queryRunner.query(`CREATE TABLE "meeting" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "about" character varying NOT NULL, "timezone" character varying NOT NULL, "minstarthour" numeric(4,2) NOT NULL, "maxendhour" numeric(4,2) NOT NULL, "tentativedates" text NOT NULL, "scheduledstartdatetime" character varying, "scheduledenddatetime" character varying, "wasscheduledatleastonce" boolean NOT NULL DEFAULT false, "creatorid" integer, CONSTRAINT "pk_dccaf9e4c0e39067d82ccc7bb83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_440d09f903f3ab3bd21c5603c8" ON "meeting" ("creatorid") WHERE CreatorID IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "config" ("key" character varying NOT NULL, "value" character varying NOT NULL, CONSTRAINT "pk_26489c99ddbb4c91631ef5cc791" PRIMARY KEY ("key"))`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarevents" ADD CONSTRAINT "fk_0f51319db4ca8f3b1ea5c3bb523" FOREIGN KEY ("meetingid") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarevents" ADD CONSTRAINT "fk_a17473979fe30cfaf8152bcfd79" FOREIGN KEY ("userid") REFERENCES "microsoftoauth2"("userid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "microsoftoauth2" ADD CONSTRAINT "fk_19a90a81275bafe86ae1ef66a8a" FOREIGN KEY ("userid") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarcreatedevent" ADD CONSTRAINT "fk_0ef4d32bc094fd9da0f043e4317" FOREIGN KEY ("respondentid") REFERENCES "meetingrespondent"("respondentid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarcreatedevent" ADD CONSTRAINT "fk_44490184afc45b796a4cd7016aa" FOREIGN KEY ("userid") REFERENCES "microsoftoauth2"("userid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meetingrespondent" ADD CONSTRAINT "fk_7f6c98290fed1852c4ead23b4d6" FOREIGN KEY ("meetingid") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meetingrespondent" ADD CONSTRAINT "fk_fb6fcd13d7ea15555e619a2dcb1" FOREIGN KEY ("userid") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "googlecalendarcreatedevent" ADD CONSTRAINT "fk_391b9705eb024e5c282fa4de2df" FOREIGN KEY ("respondentid") REFERENCES "meetingrespondent"("respondentid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "googlecalendarcreatedevent" ADD CONSTRAINT "fk_8649dc9c4d688c8930e530a597b" FOREIGN KEY ("userid") REFERENCES "googleoauth2"("userid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "googlecalendarevents" ADD CONSTRAINT "fk_01af9ceb170c73f93847abe975d" FOREIGN KEY ("meetingid") REFERENCES "meeting"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "googlecalendarevents" ADD CONSTRAINT "fk_d52cf21cfd1013cd8fa9051b9d3" FOREIGN KEY ("userid") REFERENCES "googleoauth2"("userid") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "googleoauth2" ADD CONSTRAINT "fk_1a86f18707b5586daa9fe2eb624" FOREIGN KEY ("userid") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "meeting" ADD CONSTRAINT "fk_ae76c9f2dc6bced3a87ab1c7519" FOREIGN KEY ("creatorid") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meeting" DROP CONSTRAINT "fk_ae76c9f2dc6bced3a87ab1c7519"`);
        await queryRunner.query(`ALTER TABLE "googleoauth2" DROP CONSTRAINT "fk_1a86f18707b5586daa9fe2eb624"`);
        await queryRunner.query(`ALTER TABLE "googlecalendarevents" DROP CONSTRAINT "fk_d52cf21cfd1013cd8fa9051b9d3"`);
        await queryRunner.query(`ALTER TABLE "googlecalendarevents" DROP CONSTRAINT "fk_01af9ceb170c73f93847abe975d"`);
        await queryRunner.query(`ALTER TABLE "googlecalendarcreatedevent" DROP CONSTRAINT "fk_8649dc9c4d688c8930e530a597b"`);
        await queryRunner.query(`ALTER TABLE "googlecalendarcreatedevent" DROP CONSTRAINT "fk_391b9705eb024e5c282fa4de2df"`);
        await queryRunner.query(`ALTER TABLE "meetingrespondent" DROP CONSTRAINT "fk_fb6fcd13d7ea15555e619a2dcb1"`);
        await queryRunner.query(`ALTER TABLE "meetingrespondent" DROP CONSTRAINT "fk_7f6c98290fed1852c4ead23b4d6"`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarcreatedevent" DROP CONSTRAINT "fk_44490184afc45b796a4cd7016aa"`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarcreatedevent" DROP CONSTRAINT "fk_0ef4d32bc094fd9da0f043e4317"`);
        await queryRunner.query(`ALTER TABLE "microsoftoauth2" DROP CONSTRAINT "fk_19a90a81275bafe86ae1ef66a8a"`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarevents" DROP CONSTRAINT "fk_a17473979fe30cfaf8152bcfd79"`);
        await queryRunner.query(`ALTER TABLE "microsoftcalendarevents" DROP CONSTRAINT "fk_0f51319db4ca8f3b1ea5c3bb523"`);
        await queryRunner.query(`DROP TABLE "config"`);
        await queryRunner.query(`DROP INDEX "public"."idx_440d09f903f3ab3bd21c5603c8"`);
        await queryRunner.query(`DROP TABLE "meeting"`);
        await queryRunner.query(`DROP INDEX "public"."idx_e12875dfb3b1d92d7d7c5377e2"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_340f49fccfc9183f0d58f43408"`);
        await queryRunner.query(`DROP TABLE "googleoauth2"`);
        await queryRunner.query(`DROP INDEX "public"."idx_d52cf21cfd1013cd8fa9051b9d"`);
        await queryRunner.query(`DROP TABLE "googlecalendarevents"`);
        await queryRunner.query(`DROP INDEX "public"."idx_8649dc9c4d688c8930e530a597"`);
        await queryRunner.query(`DROP TABLE "googlecalendarcreatedevent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_4de0c48380ef30d01f77431533"`);
        await queryRunner.query(`DROP INDEX "public"."idx_59d8110458da8cb32352de1f95"`);
        await queryRunner.query(`DROP TABLE "meetingrespondent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_44490184afc45b796a4cd7016a"`);
        await queryRunner.query(`DROP TABLE "microsoftcalendarcreatedevent"`);
        await queryRunner.query(`DROP INDEX "public"."idx_a6dcffaac17c8fa577daa93ad8"`);
        await queryRunner.query(`DROP TABLE "microsoftoauth2"`);
        await queryRunner.query(`DROP INDEX "public"."idx_a17473979fe30cfaf8152bcfd7"`);
        await queryRunner.query(`DROP TABLE "microsoftcalendarevents"`);
    }
}
