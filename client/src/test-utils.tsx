import { render } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import React from "react";
import { Provider } from 'react-redux';
import { MemoryRouter } from "react-router-dom";
import { AppStore, setupStore } from 'app/store';
import { ToastProvider } from "components/Toast";
import type { MeetingResponse, UserResponse } from 'slices/api';
import { getToday, setToday } from "utils/dates.utils";
import { removeLocalToken } from "utils/auth.utils";

export function renderWithProviders(ui: React.ReactElement, {
  initialEntries,
  store = setupStore(),
}: {
  initialEntries?: string[],
  store?: AppStore,
} = {}) {
  return render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </Provider>
  );
}

export const sampleMeetingSlug = 'abcdefghijkl';

export const sampleMeetingResponse: MeetingResponse = {
  meetingID: sampleMeetingSlug,
  name: 'Meeting 1',
  about: '',
  timezone: 'America/Toronto',
  minStartHour: 9,
  maxEndHour: 17,
  tentativeDates: ['2022-12-24', '2022-12-25', '2022-12-26'],
  respondents: [],
};
Object.freeze(sampleMeetingResponse);

export const sampleSelfInfoResponse: UserResponse = {
  userID: 1,
  name: 'Bob',
  email: 'bob@example.com',
  isSubscribedToNotifications: false,
  hasLinkedGoogleAccount: false,
  hasLinkedMicrosoftAccount: false,
};
Object.freeze(sampleSelfInfoResponse);

export const server = setupServer(
  rest.get(`/api/meetings/${sampleMeetingSlug}`, (req, res, ctx) => {
    return res(ctx.json(sampleMeetingResponse));
  }),
  rest.get('/api/me', (req, res, ctx) => {
    return res(ctx.json(sampleSelfInfoResponse));
  }),
);

const originalToday = getToday();

function commonAfterEach() {
  setToday(originalToday);
  removeLocalToken();
  server.resetHandlers()
}

function commonBeforeAll() {
  server.listen();
}

function commonAfterAll() {
  server.close();
}

export function commonSetupsAndTeardowns() {
  beforeAll(commonBeforeAll);
  afterEach(commonAfterEach);
  afterAll(commonAfterAll);
}
