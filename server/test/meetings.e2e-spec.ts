import { HttpStatus } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type AddGuestRespondentDto from '../src/meetings/add-guest-respondent.dto';
import type CreateMeetingDto from '../src/meetings/create-meeting.dto';
import type ScheduleMeetingDto from '../src/meetings/schedule-meeting.dto';
import {
  addGuestRespondent,
  commonAfterAll,
  commonBeforeAll,
  commonBeforeEach,
  createMeeting,
  createUser,
  DELETE,
  deleteRespondent,
  editUser,
  GET,
  getMeeting,
  PATCH,
  POST,
  PUT,
  putSelfRespondent,
  scheduleMeeting,
  smtpMessages,
  sortEmailMessagesByRecipient,
  unscheduleMeeting,
  updateRespondent,
  waitForEmailMessages,
} from './e2e-testing-helpers';

const emailDelayMs = 300;

describe('MeetingsController (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await commonBeforeAll({VERIFY_SIGNUP_EMAIL_ADDRESS: 'false'});
  });
  beforeEach(commonBeforeEach);

  const sampleCreateMeetingDto: CreateMeetingDto = {
    name: 'My meeting',
    timezone: 'America/New_York',
    minStartHour: 10,
    maxEndHour: 16,
    tentativeDates: ['2022-12-21', '2022-12-22', '2022-12-24'],
  };
  Object.freeze(sampleCreateMeetingDto);
  const sampleSchedule: ScheduleMeetingDto = {
    startDateTime: '2022-12-22T02:00:00Z',
    endDateTime: '2022-12-22T05:00:00Z',
  };

  it('/api/meetings (POST) (guest)', async () => {
    const reqBody = sampleCreateMeetingDto;
    const meeting = await createMeeting(reqBody, app);
    expect(meeting).toEqual({
      ...reqBody,
      about: '',
      respondents: [],
      meetingID: meeting.meetingID,
    });
    await GET('/api/meetings/' + meeting.meetingID, app)
      .expect(HttpStatus.OK, meeting);
  });

  it('/api/meetings (POST) (logged in)', async () => {
    const {token} = await createUser(app);
    const reqBody = {
      ...sampleCreateMeetingDto,
      about: 'Something important',
    };
    const meeting = await createMeeting(reqBody, app, token);
    expect(meeting).toEqual({
      ...reqBody,
      respondents: [],
      meetingID: meeting.meetingID,
    });
    await GET('/api/meetings/' + meeting.meetingID, app)
      .expect(HttpStatus.OK, meeting);
  });

  it('/api/meetings (POST) (invalid)', async () => {
    const expectBadRequest = async (meetingDto: any) => {
      await POST('/api/meetings', app)
        .send(meetingDto)
        .expect(HttpStatus.BAD_REQUEST);
    };
    const validMeeting = sampleCreateMeetingDto;
    const meetingWithoutName = {...validMeeting};
    delete meetingWithoutName['name'];
    expectBadRequest(meetingWithoutName);
    expectBadRequest({...validMeeting, name: ''});
    expectBadRequest({...validMeeting, timezone: 'Nonexistent'});
    expectBadRequest({...validMeeting, minStartHour: -1});
    expectBadRequest({...validMeeting, minStartHour: 0.5});
    expectBadRequest({...validMeeting, maxEndHour: 24});
    expectBadRequest({...validMeeting, maxEndHour: 23.5});
    expectBadRequest({...validMeeting, tentativeDates: []});
    expectBadRequest({...validMeeting, tentativeDates: ['not a date']});
    expectBadRequest({...validMeeting, tentativeDates: ['2022-12-21T22:23:00Z']});
  });

  it('/api/meetings/:id (PATCH) (created as guest)', async () => {
    const {token} = await createUser(app);
    const meeting = await createMeeting({
      ...sampleCreateMeetingDto,
      about: '',
    }, app);
    // Guests may not edit meetings created by other guests
    meeting.name = 'An edited meeting';
    meeting.minStartHour--;
    await PATCH('/api/meetings/' + meeting.meetingID, app)
      .send({name: meeting.name, minStartHour: meeting.minStartHour})
      .expect(HttpStatus.UNAUTHORIZED);
    // Logged in users may edit meetings created by guests
    await PATCH('/api/meetings/' + meeting.meetingID, app, token)
      .send({name: meeting.name, minStartHour: meeting.minStartHour})
      .expect(HttpStatus.OK, meeting);
    await GET('/api/meetings/' + meeting.meetingID, app)
      .expect(HttpStatus.OK, meeting);
    // Sending an empty update is not allowed
    await PATCH('/api/meetings/' + meeting.meetingID, app, token)
      .send({})
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('/api/meetings/:id (PATCH) (created when logged in)', async () => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const meeting = await createMeeting(sampleCreateMeetingDto, app, token1);
    // Guests may not edit meetings created by logged in users
    meeting.name = 'An edited meeting';
    meeting.minStartHour--;
    await PATCH('/api/meetings/' + meeting.meetingID, app)
      .send({name: meeting.name, minStartHour: meeting.minStartHour})
      .expect(HttpStatus.UNAUTHORIZED);
    // Users who are logged in but did not create the meeting may not edit it
    await PATCH('/api/meetings/' + meeting.meetingID, app, token2)
      .send({name: 'abc'})
      .expect(HttpStatus.FORBIDDEN);
    // The meeting creator is allowed to edit the meeting
    await PATCH('/api/meetings/' + meeting.meetingID, app, token1)
      .send({name: meeting.name, minStartHour: meeting.minStartHour})
      .expect(HttpStatus.OK, meeting);
  });

  it('/api/meetings/:id (DELETE) (created as guest)', async () => {
    const {token} = await createUser(app);
    const meeting = await createMeeting(sampleCreateMeetingDto, app);
    // Guests may not delete meetings created by other guests
    await DELETE('/api/meetings/' + meeting.meetingID, app)
      .expect(HttpStatus.UNAUTHORIZED);
    // Logged in users may delete meetings created by guests
    await DELETE('/api/meetings/' + meeting.meetingID, app, token)
      .expect(HttpStatus.NO_CONTENT);
    await GET('/api/meetings/' + meeting.meetingID, app)
      .expect(HttpStatus.NOT_FOUND);
  });

  it('/api/meetings/:id (DELETE) (created when logged in)', async () => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const meeting = await createMeeting(sampleCreateMeetingDto, app, token1);
    // Guests may not delete meetings created by logged in users
    await DELETE('/api/meetings/' + meeting.meetingID, app)
      .expect(HttpStatus.UNAUTHORIZED);
    // Logged in users may not delete meetings created by other logged in users
    await DELETE('/api/meetings/' + meeting.meetingID, app, token2)
      .expect(HttpStatus.FORBIDDEN);
    // Logged in users may delete meetings which they created
    await DELETE('/api/meetings/' + meeting.meetingID, app, token1)
      .expect(HttpStatus.NO_CONTENT);
  });

  it('/api/meetings/:id/respondents/guest (POST)', async () => {
    const oldMeeting = await createMeeting(sampleCreateMeetingDto, app);
    const {meetingID} = oldMeeting;
    const guest1: AddGuestRespondentDto = {
      name: 'John Doe', availabilities: [
        '2022-12-21T23:00:00Z',
        '2022-12-21T23:15:00Z',
        '2022-12-21T23:30:00Z',
        '2022-12-21T23:45:00Z',
      ],
    };
    const guest2: AddGuestRespondentDto = {
      name: 'Jane Doe', email: 'jane@example.com', availabilities: []
    };
    await addGuestRespondent(guest1, meetingID, app);
    const newMeeting = await addGuestRespondent(guest2, meetingID, app);
    expect(newMeeting).toEqual({
      ...oldMeeting,
      respondents: [
        {
          name: guest1.name,
          availabilities: guest1.availabilities,
          respondentID: newMeeting.respondents[0].respondentID,
        },
        {
          name: guest2.name,
          availabilities: guest2.availabilities,
          respondentID: newMeeting.respondents[1].respondentID,
        },
      ],
    });
    await GET('/api/meetings/' + meetingID, app)
      .expect(HttpStatus.OK, newMeeting);
  });

  it('/api/meetings/:id/respondents/guest (POST) (invalid)', async () => {
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const expectBadRequest = async (body: AddGuestRespondentDto) => {
      await POST(`/api/meetings/${meetingID}/respondents/guest`, app)
        .send(body)
        .expect(HttpStatus.BAD_REQUEST);
    };
    expectBadRequest({name: '', availabilities: []});
    expectBadRequest({name: 'Bob', availabilities: ['2022-12-22T00:00:00.000Z']});
    expectBadRequest({name: 'Bob', availabilities: ['2022-12-22T00:00:00']});
    expectBadRequest({name: 'Bob', availabilities: ['2022-12-22']});
    expectBadRequest({name: 'Bob', availabilities: ['2022-12-22T00:01:00Z']});
    expectBadRequest({name: 'Bob', availabilities: ['2022-12-22T00:00:01Z']});
  });

  it('/api/meetings/:id/respondents/me (PUT)', async () => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    await putSelfRespondent({availabilities: []}, meetingID, app, token1);
    await putSelfRespondent({availabilities: []}, meetingID, app, token2);
    const meetingByFirstRespondent = await getMeeting(meetingID, app, token1);
    expect(meetingByFirstRespondent.selfRespondentID)
      .toStrictEqual(meetingByFirstRespondent.respondents[0].respondentID);
    const meetingBySecondRespondent = await getMeeting(meetingID, app, token2);
    expect(meetingBySecondRespondent.selfRespondentID)
        .toStrictEqual(meetingBySecondRespondent.respondents[1].respondentID);
    const newMeeting = await putSelfRespondent(
      {availabilities: ['2022-12-22T00:30:00Z']}, meetingID, app, token1,
    );
    expect(newMeeting.respondents).toHaveLength(2);
    expect(newMeeting.respondents[0].availabilities).toEqual(['2022-12-22T00:30:00Z']);
  });

  it('/api/meetings/:id/respondents/:respondentID (PUT)', async () => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const guestRespondentID = (
      await addGuestRespondent({name: 'Joe', availabilities: []}, meetingID, app)
    ).respondents[0].respondentID;
    const loggedInRespondentID = (
      await putSelfRespondent({availabilities: []}, meetingID, app, token1)
    ).respondents[1].respondentID;
    // selfRespondentID should not be present if token is not used in request
    expect((await getMeeting(meetingID, app)).selfRespondentID === undefined).toBe(true);
    // Anyone should be allowed to edit availabilities of guest
    const meeting = await updateRespondent(
      guestRespondentID, {availabilities: ['2022-12-22T00:00:00Z']}, meetingID, app,
    );
    expect(meeting.respondents[0].availabilities).toEqual(['2022-12-22T00:00:00Z']);
    expect((await getMeeting(meetingID, app)).respondents[0].availabilities)
      .toEqual(['2022-12-22T00:00:00Z']);
    await updateRespondent(
      guestRespondentID, {availabilities: ['2022-12-22T01:00:00Z']},
      meetingID, app, token1
    );
    // Only the logged in respondent should be allowed to edit their own availabilities
    await PUT(`/api/meetings/${meetingID}/respondents/${loggedInRespondentID}`, app)
      .send({availabilities: ['2022-12-22T01:00:00Z']})
      .expect(HttpStatus.UNAUTHORIZED);
    await PUT(`/api/meetings/${meetingID}/respondents/${loggedInRespondentID}`, app, token2)
      .send({availabilities: ['2022-12-22T01:00:00Z']})
      .expect(HttpStatus.FORBIDDEN);
    await updateRespondent(
      loggedInRespondentID, {availabilities: ['2022-12-22T01:00:00Z']},
      meetingID, app, token1,
    );
  });

  it('/api/meetings/:id/respondents/:respondentID (DELETE)', async () => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const guestRespondent1ID = (
      await addGuestRespondent({name: 'Joe', availabilities: []}, meetingID, app)
    ).respondents[0].respondentID;
    const guestRespondent2ID = (
      await addGuestRespondent({name: 'Jim', availabilities: []}, meetingID, app)
    ).respondents[1].respondentID;
    const loggedInRespondentID = (
      await putSelfRespondent({availabilities: []}, meetingID, app, token1)
    ).respondents[2].respondentID;
    // Anyone should be allowed to delete a guest
    await deleteRespondent(guestRespondent1ID, meetingID, app);
    const meeting = await deleteRespondent(guestRespondent2ID, meetingID, app, token1);
    expect(meeting.respondents).toHaveLength(1);
    // Only the logged in respondent should be allowed to delete themselves
    await DELETE(`/api/meetings/${meetingID}/respondents/${loggedInRespondentID}`, app)
      .expect(HttpStatus.UNAUTHORIZED);
    await DELETE(`/api/meetings/${meetingID}/respondents/${loggedInRespondentID}`, app, token2)
      .expect(HttpStatus.FORBIDDEN);
    await deleteRespondent(loggedInRespondentID, meetingID, app, token1);
  });

  it('/api/meetings/:id/schedule (PUT) (created as guest)', async () => {
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const {token} = await createUser(app);
    // Anyone can schedule a meeting created by a guest
    const schedule = sampleSchedule;
    const meeting = await scheduleMeeting(meetingID, schedule, app);
    expect(meeting.scheduledStartDateTime).toStrictEqual(schedule.startDateTime);
    expect(meeting.scheduledEndDateTime).toStrictEqual(schedule.endDateTime);
    expect(await getMeeting(meetingID, app)).toEqual(meeting);
    await scheduleMeeting(meetingID, schedule, app, token);
  });

  it('/api/meetings/:id/schedule (PUT) (created when logged in)', async () => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, token1);
    // Only the meeting creator can schedule the meeting
    const schedule = sampleSchedule;
    await PUT(`/api/meetings/${meetingID}/schedule`, app)
      .send(schedule)
      .expect(HttpStatus.UNAUTHORIZED);
    await PUT(`/api/meetings/${meetingID}/schedule`, app, token2)
      .send(schedule)
      .expect(HttpStatus.FORBIDDEN);
    await scheduleMeeting(meetingID, schedule, app, token1);
  });

  it('/api/meetings/:id/schedule (PUT) (invalid)', async () => {
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    const expectBadRequest = async (body: ScheduleMeetingDto) => {
      await PUT(`/api/meetings/${meetingID}/schedule`, app)
        .send(body)
        .expect(HttpStatus.BAD_REQUEST);
    };
    expectBadRequest({startDateTime: '2022-12-22', endDateTime: '2022-12-23'});
    // each time must be a multiple of 15 minutes
    expectBadRequest({startDateTime: '2022-12-22T02:00:00Z', endDateTime: '2022-12-22T02:10:00Z'});
    // end time must be strictly after start time
    expectBadRequest({startDateTime: '2022-12-22T02:00:00Z', endDateTime: '2022-12-22T02:00:00Z'});
    expectBadRequest({startDateTime: '2022-12-22T02:00:00Z', endDateTime: '2022-12-22T01:00:00Z'});
  });

  it.each([
    {createAsGuest: false, scheduleAsGuest: false},
    {createAsGuest: true, scheduleAsGuest: false},
    {createAsGuest: true, scheduleAsGuest: true},
  ])('/api/meetings/:id/schedule (PUT) (notifications)', async ({createAsGuest, scheduleAsGuest}) => {
    const {token: token1} = await createUser(app);
    const {token: token2, email: email2, name: name2} = await createUser(app);
    await editUser({subscribe_to_notifications: true}, app, token2);
    const {token: token3, email: email3} = await createUser(app);
    await editUser({subscribe_to_notifications: true}, app, token3);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, createAsGuest ? undefined : token3);
    await putSelfRespondent({availabilities: []}, meetingID, app, token1);
    await putSelfRespondent({availabilities: []}, meetingID, app, token2);
    await putSelfRespondent({availabilities: []}, meetingID, app, token3);
    await addGuestRespondent({name: 'Joe', availabilities: []}, meetingID, app);
    await addGuestRespondent({name: 'Jim', email: 'jim@example.com', availabilities: []}, meetingID, app);
    await addGuestRespondent({name: 'Bob', email: 'bob@example.com', availabilities: []}, meetingID, app);

    // Create another meeting with different recipients and make sure that
    // they are unaffected
    const {meetingID: meeting2ID} = await createMeeting(sampleCreateMeetingDto, app);
    await addGuestRespondent({name: 'Fred', email: 'fred@example.com', availabilities: []}, meeting2ID, app);

    await scheduleMeeting(
      meetingID,
      sampleSchedule,
      app,
      scheduleAsGuest ? undefined : token3,
    );
    await waitForEmailMessages(emailDelayMs);
    sortEmailMessagesByRecipient(smtpMessages);
    // user1 shouldn't get notified because they are not subscribed to notifications
    const expectedRecipients = ['bob@example.com', 'jim@example.com', email2];
    if (scheduleAsGuest) {
      // if user3 scheduled the meeting, they shouldn't get a notification either
      expectedRecipients.push(email3);
    }
    expect(smtpMessages.map(m => m.to)).toEqual(expectedRecipients);
    expect(smtpMessages[0].subject).toStrictEqual(`${sampleCreateMeetingDto.name} has been scheduled`);
    // Note: the smtp-server package appears to strip off a single trailing space
    // from each line, but I tested the nodemailer client against a real SMTP
    // server, and the trailing space after the "--" really is getting sent.
    expect(smtpMessages[0].body).toStrictEqual(
`Hello Bob,

The meeting "${sampleCreateMeetingDto.name}" has been scheduled:

  Wednesday, December 21, 2022
  9:00PM to 12:00AM EST

View details here: http://cabbagemeet.internal/m/${meetingID}

--
CabbageMeet | http://cabbagemeet.internal
`
    );
    expect(smtpMessages[2].body.startsWith(`Hello ${name2},`));
  });

  it.each([true, false])('/api/meetings/:id/schedule (DELETE)', async (createAsGuest) => {
    const {token: token1} = await createUser(app);
    const {token: token2} = await createUser(app);
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app, createAsGuest ? undefined : token1);
    const schedule = sampleSchedule;
    await scheduleMeeting(meetingID, schedule, app, createAsGuest ? undefined : token1);
    if (createAsGuest) {
      // Guests can schedule meetings created by other guests
      await unscheduleMeeting(meetingID, app);
      await scheduleMeeting(meetingID, schedule, app);
      // Logged in users can unschedule meetings scheduled by guests
      await unscheduleMeeting(meetingID, app, token1);
    } else {
      await DELETE(`/api/meetings/${meetingID}/schedule`, app)
        .expect(HttpStatus.UNAUTHORIZED);
      await DELETE(`/api/meetings/${meetingID}/schedule`, app, token2)
        .expect(HttpStatus.FORBIDDEN);
      await unscheduleMeeting(meetingID, app, token1);
    }
  });

  it('/api/meetings/:id/schedule (DELETE) (no new notifications)', async () => {
    const {meetingID} = await createMeeting(sampleCreateMeetingDto, app);
    await addGuestRespondent({name: 'Jim', email: 'jim@example.com', availabilities: []}, meetingID, app);

    await scheduleMeeting(meetingID, sampleSchedule, app);
    await waitForEmailMessages(emailDelayMs);
    expect(smtpMessages).toHaveLength(1);

    await unscheduleMeeting(meetingID, app);
    await scheduleMeeting(meetingID, sampleSchedule, app);
    await waitForEmailMessages(emailDelayMs);
    // If a meeting is scheduled a second time, no new notifications should be sent
    expect(smtpMessages).toHaveLength(1);
  })

  afterAll(() => commonAfterAll(app));
});
