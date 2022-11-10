import { MutationLifecycleApi, QueryLifecycleApi } from '@reduxjs/toolkit/dist/query/endpointDefinitions';
import { removeToken, setToken } from './authentication';
import { transformMeetingResponse, transformMeetingsShortResponse } from 'utils/response-transforms';
import type {
  TransformedMeetingResponse,
  TransformedMeetingsShortResponse,
} from 'utils/response-transforms';
import { api, GetSelfInfoApiResponse } from './api';
import type {
  MeetingResponse,
  GetMeetingApiArg,
  GetCreatedMeetingsApiArg,
  GetRespondedMeetingsApiArg,
  EditUserApiResponse,
  UserResponseWithToken,
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
  }),
  overrideExisting: true,
});
export const {
  useGetMeetingQuery,
  useGetCreatedMeetingsQuery,
  useGetRespondedMeetingsQuery,
} = replacedApi;

export const enhancedApi = replacedApi.enhanceEndpoints({
  addTagTypes: ['me', 'createdMeetings', 'respondedMeetings', 'currentMeeting'],
  endpoints: {
    login: {
      invalidatesTags: ['me'],
      onQueryStarted: loginOrSignup_onQueryStarted,
    },
    signup: {
      invalidatesTags: ['me'],
      onQueryStarted: loginOrSignup_onQueryStarted,
    },
    logout: {
      invalidatesTags: ['me'],
      onQueryStarted: logoutOrDeleteAccount_onQueryStarted,
    },
    deleteUser: {
      invalidatesTags: ['me'],
      onQueryStarted: logoutOrDeleteAccount_onQueryStarted,
    },
    getSelfInfo: {
      providesTags: ['me'],
      onQueryStarted: getSelfInfo_onQueryStarted,
    },
    editUser: {
      invalidatesTags: ['me'],
      onQueryStarted: editUser_onQueryStarted,
    },
    confirmLinkGoogleAccount: {
      invalidatesTags: ['me'],
      onQueryStarted: editUser_onQueryStarted,
    },
    unlinkGoogleCalendar: {
      invalidatesTags: ['me'],
      onQueryStarted: editUser_onQueryStarted,
    },
    getMeeting: {
      providesTags: ['currentMeeting'],
      onQueryStarted: getMeeting_onQueryStarted,
    },
    addGuestRespondent: {
      invalidatesTags: ['currentMeeting'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    addSelfRespondent: {
      invalidatesTags: ['currentMeeting'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    createMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings', 'currentMeeting'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    editMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings', 'currentMeeting'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    deleteMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings', 'currentMeeting'],
    },
    scheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings', 'currentMeeting'],
      onQueryStarted: upsertMeeting_onQueryStarted,
    },
    unscheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings', 'currentMeeting'],
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

async function loginOrSignup_onQueryStarted(
  arg: unknown,
  {dispatch, queryFulfilled}: MutationLifecycleApi<any, any, UserResponseWithToken, 'api'>,
) {
  // pessimistic update
  // https://redux-toolkit.js.org/rtk-query/usage/manual-cache-updates#pessimistic-updates
  try {
    const {data: selfInfoWithToken} = await queryFulfilled;
    const {token, ...selfInfo} = selfInfoWithToken;
    dispatch(replacedApi.util.upsertQueryData(
      'getSelfInfo', undefined, selfInfo
    ));
    dispatch(setToken(token));
  } catch {}
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
    console.error(err);
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
