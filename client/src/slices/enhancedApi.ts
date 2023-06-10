import type { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import type { MutationLifecycleApi, QueryLifecycleApi } from '@reduxjs/toolkit/dist/query/endpointDefinitions';
import { removeToken, setToken } from './authentication';
import { transformMeetingResponse, transformMeetingsShortResponse } from 'utils/response-transforms';
import type {
  TransformedMeetingResponse,
  TransformedMeetingsShortResponse,
} from 'utils/response-transforms';
import { api, SignupApiResponse, UserResponse, VerifyEmailAddressResponse } from './api';
import type {
  MeetingResponse,
  GetMeetingApiArg,
  GetCreatedMeetingsApiArg,
  GetRespondedMeetingsApiArg,
  UserResponseWithToken,
  DeleteMeetingApiResponse,
  GetSelfInfoApiResponse,
  ConfirmPasswordResetApiResponse,
  ConfirmPasswordResetApiArg,
} from './api';
import { setCurrentMeetingID } from './currentMeeting';

const replacedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getMeeting: build.query<TransformedMeetingResponse, GetMeetingApiArg>({
      query: (queryArg) => ({ url: `/api/meetings/${queryArg}` }),
      transformResponse: transformMeetingResponse,
    }),
    getCreatedMeetings: build.query<TransformedMeetingsShortResponse, GetCreatedMeetingsApiArg>({
      query: () => ({ url: `/api/me/created-meetings` }),
      transformResponse: transformMeetingsShortResponse,
    }),
    getRespondedMeetings: build.query<TransformedMeetingsShortResponse, GetRespondedMeetingsApiArg>({
      query: () => ({ url: `/api/me/responded-meetings` }),
      transformResponse: transformMeetingsShortResponse,
    }),
    confirmPasswordReset: build.mutation<
      ConfirmPasswordResetApiResponse,
      ConfirmPasswordResetApiArg & {token: string}
    >({
      query: (queryArg) => ({
        url: `/api/confirm-password-reset`,
        method: "POST",
        body: {password: queryArg.password},
        headers: {authorization: `Bearer ${queryArg.token}`},
      }),
    }),
  }),
  overrideExisting: true,
});
export const {
  useGetMeetingQuery,
  useGetCreatedMeetingsQuery,
  useGetRespondedMeetingsQuery,
  useConfirmPasswordResetMutation,
} = replacedApi;

const allTags = [
  'createdMeetings',
  'respondedMeetings',
  'meeting',
  'googleCalendarEvents',
  'microsoftCalendarEvents',
] as const;

export const enhancedApi = replacedApi.enhanceEndpoints({
  addTagTypes: allTags,
  endpoints: {
    getServerInfo: {
      query: () => ({
        url: `/api/server-info`,
        keepUnusedDataFor: Number.MAX_VALUE,
      }),
    },
    login: {
      onQueryStarted: (arg, api) => loginOrVerifyEmail_onQueryStarted(arg, api),
    },
    signup: {
      onQueryStarted: (arg, api) => signup_onQueryStarted(arg, api),
    },
    logout: {
      onQueryStarted: (arg, api) => logoutOrDeleteAccount_onQueryStarted(arg, api),
      invalidatesTags: allTags,
    },
    deleteUser: {
      onQueryStarted: (arg, api) => logoutOrDeleteAccount_onQueryStarted(arg, api),
      invalidatesTags: allTags,
    },
    getSelfInfo: {
      onQueryStarted: (arg, api) => getSelfInfo_onQueryStarted(arg, api),
    },
    editUser: {
      onQueryStarted: (arg, api) => editUser_onQueryStarted(arg, api),
      // If a user changed their name, the respondents data for a meeting
      // could now be invalid
      invalidatesTags: ['meeting'],
    },
    confirmLinkGoogleAccount: {
      onQueryStarted: (arg, api) => editUser_onQueryStarted(arg, api),
    },
    unlinkGoogleCalendar: {
      onQueryStarted: (arg, api) => editUser_onQueryStarted(arg, api),
    },
    confirmLinkMicrosoftAccount: {
      onQueryStarted: (arg, api) => editUser_onQueryStarted(arg, api),
    },
    unlinkMicrosoftCalendar: {
      onQueryStarted: (arg, api) => editUser_onQueryStarted(arg, api),
    },
    getMeeting: {
      providesTags: (result, error, arg) => [{type: 'meeting', id: arg}],
    },
    addGuestRespondent: {
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    putSelfRespondent: {
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    updateAvailabilities: {
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    deleteRespondent: {
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    createMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    editMeeting: {
      invalidatesTags: (result, error, arg) =>
        [
          'createdMeetings', 'respondedMeetings',
          {type: 'googleCalendarEvents', id: arg.id},
          {type: 'microsoftCalendarEvents', id: arg.id},
        ],
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    deleteMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: (arg, api) => deleteMeeting_onQueryStarted(arg, api),
    },
    scheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    unscheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: (arg, api) => upsertMeeting_onQueryStarted(arg, api),
    },
    getCreatedMeetings: {
      providesTags: ['createdMeetings'],
    },
    getRespondedMeetings: {
      providesTags: ['respondedMeetings'],
    },
    getGoogleCalendarEvents: {
      providesTags: (result, error, arg) => [{type: 'googleCalendarEvents', id: arg}],
    },
    getMicrosoftCalendarEvents: {
      providesTags: (result, error, arg) => [{type: 'microsoftCalendarEvents', id: arg}],
    },
  },
});

export function isVerifyEmailAddressResponse(resp: object): resp is VerifyEmailAddressResponse {
  return resp.hasOwnProperty('mustVerifyEmailAddress');
}

function updateStoreForUserResponseWithToken(
  dispatch: ThunkDispatch<any, any, AnyAction>,
  selfInfoWithToken: UserResponseWithToken,
) {
  const {token, ...selfInfo} = selfInfoWithToken;
  dispatch(enhancedApi.util.upsertQueryData(
    'getSelfInfo', undefined, selfInfo
  ));
  dispatch(setToken(token));
}

async function loginOrVerifyEmail_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<unknown, any, UserResponseWithToken, 'api'>,
) {
  // pessimistic update
  // https://redux-toolkit.js.org/rtk-query/usage/manual-cache-updates#pessimistic-updates
  try {
    const {data} = await queryFulfilled;
    updateStoreForUserResponseWithToken(dispatch, data);
  } catch (err) {}
}

async function signup_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<unknown, any, SignupApiResponse, 'api'>,
) {
  try {
    const {data} = await queryFulfilled;
    if (isVerifyEmailAddressResponse(data)) {
      return;
    }
    updateStoreForUserResponseWithToken(dispatch, data);
  } catch (err) {}
}

async function logoutOrDeleteAccount_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<unknown, any, unknown, 'api'>,
) {
  try {
    await queryFulfilled;
    dispatch(removeToken());
  } catch {}
}

async function getSelfInfo_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: QueryLifecycleApi<unknown, any, GetSelfInfoApiResponse, 'api'>,
) {
  try {
    await queryFulfilled;
  } catch (err: any) {
    console.warn(err);
    if (err?.error?.status === 401) {
      dispatch(removeToken());
    }
  }
}

async function editUser_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<unknown, any, UserResponse, 'api'>,
) {
  try {
    const {data: selfInfo} = await queryFulfilled;
    dispatch(enhancedApi.util.upsertQueryData(
      'getSelfInfo', undefined, selfInfo
    ));
  } catch {}
}

async function upsertMeeting_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<unknown, any, MeetingResponse, 'api'>,
) {
  try {
    const {data: meeting} = await queryFulfilled;
    dispatch(enhancedApi.util.upsertQueryData(
      'getMeeting', meeting.meetingID, transformMeetingResponse(meeting)
    ));
  } catch {}
}

async function deleteMeeting_onQueryStarted(
  arg: string,
  {dispatch, queryFulfilled}: MutationLifecycleApi<unknown, any, DeleteMeetingApiResponse, 'api'>,
) {
  try {
    await queryFulfilled;
    dispatch(setCurrentMeetingID(undefined));
  } catch {}
}
