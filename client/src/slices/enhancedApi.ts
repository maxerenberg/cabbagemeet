import { MutationLifecycleApi, QueryLifecycleApi } from '@reduxjs/toolkit/dist/query/endpointDefinitions';
import { removeToken, setToken } from './authentication';
import { transformMeetingResponse, transformMeetingsShortResponse } from 'utils/response-transforms';
import type {
  TransformedMeetingResponse,
  TransformedMeetingsShortResponse,
} from 'utils/response-transforms';
import { api, SignupApiResponse, VerifyEmailAddressResponse } from './api';
import type {
  MeetingResponse,
  GetMeetingApiArg,
  GetCreatedMeetingsApiArg,
  GetRespondedMeetingsApiArg,
  EditUserApiResponse,
  UserResponseWithToken,
  DeleteMeetingApiResponse,
  GetSelfInfoApiResponse,
  ConfirmPasswordResetApiResponse,
  ConfirmPasswordResetApiArg,
} from './api';
import { setCurrentMeetingID } from './currentMeeting';
import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';

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

export const enhancedApi = replacedApi.enhanceEndpoints({
  addTagTypes: ['createdMeetings', 'respondedMeetings'],
  endpoints: {
    login: {
      onQueryStarted: loginOrVerifyEmail_onQueryStarted,
    },
    signup: {
      onQueryStarted: signup_onQueryStarted,
    },
    verifyEmail: {
      onQueryStarted: loginOrVerifyEmail_onQueryStarted,
    },
    logout: {
      onQueryStarted: logoutOrDeleteAccount_onQueryStarted,
    },
    deleteUser: {
      onQueryStarted: logoutOrDeleteAccount_onQueryStarted,
    },
    getSelfInfo: {
      onQueryStarted: getSelfInfo_onQueryStarted,
    },
    editUser: {
      onQueryStarted: editUser_onQueryStarted,
    },
    confirmLinkGoogleAccount: {
      onQueryStarted: editUser_onQueryStarted,
    },
    unlinkGoogleCalendar: {
      onQueryStarted: editUser_onQueryStarted,
    },
    getMeeting: {
      onQueryStarted: getMeeting_onQueryStarted,
    },
    addGuestRespondent: {
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    putSelfRespondent: {
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    updateAvailabilities: {
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    deleteRespondent: {
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    createMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    editMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    deleteMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: deleteMeeting_onQueryStarted,
    },
    scheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    unscheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    getCreatedMeetings: {
      providesTags: ['createdMeetings'],
    },
    getRespondedMeetings: {
      providesTags: ['respondedMeetings'],
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
  dispatch(replacedApi.util.upsertQueryData(
    'getSelfInfo', undefined, selfInfo
  ));
  dispatch(setToken(token));
}

async function loginOrVerifyEmail_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<any, any, UserResponseWithToken, 'api'>,
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
  {dispatch, queryFulfilled}: MutationLifecycleApi<any, any, SignupApiResponse, 'api'>,
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
  {dispatch, queryFulfilled}: MutationLifecycleApi<any, any, void, 'api'>,
) {
  try {
    await queryFulfilled;
    dispatch(removeToken());
  } catch {}
}

async function getSelfInfo_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: QueryLifecycleApi<any, any, GetSelfInfoApiResponse, 'api'>,
) {
  try {
    await queryFulfilled;
  } catch (err: any) {
    console.warn(err);
    dispatch(removeToken());
  }
}

async function editUser_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<any, any, EditUserApiResponse, 'api'>,
) {
  try {
    const {data: selfInfo} = await queryFulfilled;
    dispatch(replacedApi.util.upsertQueryData(
      'getSelfInfo', undefined, selfInfo
    ));
  } catch {}
}

async function upsertMeeting_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<any, any, MeetingResponse, 'api'>,
) {
  try {
    const {data: meeting} = await queryFulfilled;
    dispatch(replacedApi.util.upsertQueryData(
      'getMeeting', meeting.meetingID, transformMeetingResponse(meeting)
    ));
    dispatch(setCurrentMeetingID(meeting.meetingID));
  } catch {}
}

async function getMeeting_onQueryStarted(
  arg: number,
  {dispatch, queryFulfilled}: QueryLifecycleApi<any, any, TransformedMeetingResponse, 'api'>,
) {
  try {
    const {data: meeting} = await queryFulfilled;
    dispatch(setCurrentMeetingID(meeting.meetingID));
  } catch {}
}

async function deleteMeeting_onQueryStarted(
  arg: number,
  {dispatch, queryFulfilled}: QueryLifecycleApi<any, any, DeleteMeetingApiResponse, 'api'>,
) {
  try {
    await queryFulfilled;
    dispatch(setCurrentMeetingID(undefined));
  } catch {}
}
