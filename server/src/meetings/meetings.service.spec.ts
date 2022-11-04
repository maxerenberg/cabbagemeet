import { Test, TestingModule } from '@nestjs/testing';
import getCommonImports from '../common-imports';
import MeetingsService from './meetings.service';
import { createMeeting, createRegisteredUser, deleteDatabase, dynamicTypeOrmModule, setDatabaseName, setJestTimeout } from '../testing-helpers';
import UsersService from '../users/users.service';
import Meeting from './meeting.entity';

describe('MeetingsService', () => {
  const databaseName = 'MeetingServiceTest';
  let service: MeetingsService;
  let usersService: UsersService;

  beforeAll(async () => {
    setJestTimeout();
    setDatabaseName(databaseName);
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ...getCommonImports(),
        dynamicTypeOrmModule(),
      ],
      providers: [MeetingsService, UsersService],
    }).compile();

    service = module.get(MeetingsService);
    usersService = module.get(UsersService);
  });

  afterAll(() => deleteDatabase(databaseName));

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(usersService).toBeDefined();
  });

  it('should allow meetings to be created anonymously', async () => {
    const meeting = await createMeeting(service);
    await service.deleteMeeting(meeting.ID);
  });

  it('should allow meetings to be created by registered users', async () => {
    const user = await createRegisteredUser(usersService);
    const meeting = await createMeeting(service, {CreatorID: user.ID});
    const createdMeetings = await service.getMeetingsCreatedBy(user.ID);
    expect(createdMeetings).toHaveLength(1);
    expect(createdMeetings[0].ID).toBe(meeting.ID);
    await usersService.deleteUser(user.ID);
    // Make sure deletion cascaded
    const nullMeeting = await service.getMeeting(meeting.ID);
    expect(nullMeeting).toBeNull();
  });

  it('should allow meetings to be updated', async () => {
    const meeting = await createMeeting(service);
    const partialNewMeeting: Partial<Meeting> = {
      Name: 'New name',
      About: 'New about',
      MinStartHour: 14.5,
      MaxEndHour: 15,
    };
    const newMeeting = await service.updateMeeting(meeting.ID, partialNewMeeting);
    expect(newMeeting.Name).toBe(partialNewMeeting.Name);
    expect(newMeeting.About).toBe(partialNewMeeting.About);
    expect(newMeeting.MinStartHour).toBe(partialNewMeeting.MinStartHour);
    expect(newMeeting.MaxEndHour).toBe(partialNewMeeting.MaxEndHour);
    // tentative dates didn't change
    expect(newMeeting.TentativeDates).toBe(meeting.TentativeDates);

    // make sure changes were saved persistently
    expect(await service.getMeeting(meeting.ID)).toEqual(newMeeting);

    await service.deleteMeeting(meeting.ID);
  });

  it('should allow guest respondents', async () => {
    let meeting = await createMeeting(service);
    await service.addRespondent(meeting.ID, ['2022-10-27'], 'Bob');
    meeting = await service.getMeeting(meeting.ID);
    expect(meeting.Respondents).toHaveLength(1);
    expect(meeting.Respondents[0].GuestName).toEqual('Bob');
    expect(meeting.Respondents[0].Availabilities).toEqual('["2022-10-27"]');
  });

  it('should allow registered respondents', async () => {
    const user = await createRegisteredUser(usersService);
    let meeting = await createMeeting(service);
    await service.addRespondent(meeting.ID, ['2022-10-27'], user.ID);
    meeting = await service.getMeeting(meeting.ID);
    expect(meeting.Respondents).toHaveLength(1);
    expect(meeting.Respondents[0].User.ID).toEqual(user.ID);
    expect(meeting.Respondents[0].User.Name).toEqual(user.Name);

    const respondedMeetings = await service.getMeetingsRespondedToBy(user.ID);
    expect(respondedMeetings).toHaveLength(1);
    expect(respondedMeetings[0].ID).toEqual(meeting.ID);
  });

  it('should allow updating availabilities', async () => {
    let meeting = await createMeeting(service);
    const respondent = await service.addRespondent(meeting.ID, ['2022-10-27'], 'Bob');
    meeting = await service.getMeeting(meeting.ID);
    await service.updateRespondent(respondent.RespondentID, ['2022-10-28']);
    meeting = await service.getMeeting(meeting.ID);
    expect(meeting.Respondents[0].Availabilities).toEqual('["2022-10-28"]');
  });

  it('should allow deleting respondents', async () => {
    let meeting = await createMeeting(service);
    const respondent = await service.addRespondent(meeting.ID, ['2022-10-27'], 'Bob');
    meeting = await service.getMeeting(meeting.ID);
    expect(meeting.Respondents).toHaveLength(1);
    await service.deleteRespondent(respondent.RespondentID);
    meeting = await service.getMeeting(meeting.ID);
    expect(meeting.Respondents).toHaveLength(0);
  });
});
