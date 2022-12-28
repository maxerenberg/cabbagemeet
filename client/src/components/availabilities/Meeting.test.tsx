import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { rest } from 'msw';
import { AppStore, setupStore } from 'app/store';
import { setToken } from 'slices/authentication';
import {
  commonSetupsAndTeardowns,
  renderWithProviders,
  sampleMeetingResponse,
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
    {initialEntries: ['/m/1'], store},
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
      return res(ctx.json({
        ...sampleSelfInfoResponse,
        hasLinkedGoogleAccount: true,
      }));
    }),
    rest.get('/api/me/google-calendar-events', (req, res, ctx) => {
      if (req.url.searchParams.get('meetingID') !== '1') {
        return res(
          ctx.status(404),
          ctx.json({
            statusCode: 404,
            message: 'Not Found',
          }),
        );
      }
      return res(ctx.json({
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
      }));
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
