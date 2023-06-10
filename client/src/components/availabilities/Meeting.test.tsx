import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { rest } from 'msw';
import { AppStore, setupStore } from 'app/store';
import { setToken } from 'slices/authentication';
import type { MeetingResponse, OAuth2CalendarEventsResponse, PutRespondentDto, UserResponse } from 'slices/api';
import {
  commonSetupsAndTeardowns,
  renderWithProviders,
  sampleMeetingResponse,
  sampleMeetingSlug,
  sampleSelfInfoResponse,
  server,
} from 'test-utils';
import Meeting from './Meeting';

commonSetupsAndTeardowns();

// Need to set up routes explicitly for useParams() to work
// See https://github.com/testing-library/react-testing-library/issues/654#issuecomment-629031116
function renderMeeting(store?: AppStore) {
  return renderWithProviders(
    (<Routes>
      <Route path={'/m/:id'} element={<Meeting />} />
    </Routes>),
    {initialEntries: [`/m/${sampleMeetingSlug}`], store},
  );
}

test('renders the meeting times (not logged in)', async () => {
  const { getByText } = renderMeeting();

  await waitFor(() => getByText(sampleMeetingResponse.name));
});

test('renders the meeting times (logged in)', async () => {
  const store = setupStore();
  store.dispatch(setToken('token'));

  const { getByText } = renderMeeting(store);

  await waitFor(() => getByText(sampleMeetingResponse.name));
});

test('renders the external event boxes', async () => {
  server.use(
    rest.get('/api/me', (req, res, ctx) => {
      const response: UserResponse = {
        ...sampleSelfInfoResponse,
        hasLinkedGoogleAccount: true,
      };
      return res(ctx.json(response));
    }),
    rest.get('/api/me/google-calendar-events', (req, res, ctx) => {
      if (req.url.searchParams.get('meetingID') !== sampleMeetingSlug) {
        return res(
          ctx.status(404),
          ctx.json({
            statusCode: 404,
            message: 'Not Found',
          }),
        );
      }
      const response: OAuth2CalendarEventsResponse = {
        events: [
          {
            summary: 'Google Event 1',
            startDateTime: '2022-12-25T15:20:00Z',
            endDateTime: '2022-12-25T16:00:00Z',
          },
          {
            summary: 'Google Event 2',
            startDateTime: '2022-12-25T15:20:00Z',
            endDateTime: '2022-12-25T16:00:00Z',
          },
        ],
      };
      return res(ctx.json(response));
    }),
  );

  const store = setupStore();
  store.dispatch(setToken('token'));

  const { getByText, getAllByText } = renderMeeting(store);
  await waitFor(() => getByText(sampleMeetingResponse.name));

  // There'll be one button for wide screens and another for small screens
  expect(getAllByText('Add availability').length).toBeGreaterThanOrEqual(1);
  await userEvent.click(getAllByText('Add availability')[0]);

  await waitFor(() => getByText('Google Event 1'));
  expect(getByText('Google Event 2'));
});

test('renders the respondent after adding availability (logged in)', async () => {
  server.use(
    rest.put(`/api/meetings/${sampleMeetingSlug}/respondents/me`, async (req, res, ctx) => {
      const { availabilities } = await req.json<PutRespondentDto>();
      const response: MeetingResponse = {
        ...sampleMeetingResponse,
        respondents: [{respondentID: 1, availabilities, name: sampleSelfInfoResponse.name}],
        selfRespondentID: 1,
      };
      return res(ctx.json(response));
    }),
  );

  const store = setupStore();
  store.dispatch(setToken('token'));

  const { getAllByText, getByText } = renderMeeting(store);
  await waitFor(() => getByText(sampleMeetingResponse.name));

  expect(getAllByText('Add availability').length).toBeGreaterThanOrEqual(1);
  await userEvent.click(getAllByText('Add availability')[0]);

  expect(getAllByText('Continue').length).toBeGreaterThanOrEqual(1);
  await userEvent.click(getAllByText('Continue')[0]);

  await waitFor(() => expect(getAllByText('Edit availability').length).toBeGreaterThanOrEqual(1));

  expect(getByText(sampleSelfInfoResponse.name));
});
