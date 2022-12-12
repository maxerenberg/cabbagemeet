import { emptyApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    signup: build.mutation<SignupApiResponse, SignupApiArg>({
      query: (queryArg) => ({
        url: `/api/signup`,
        method: "POST",
        body: queryArg,
      }),
    }),
    verifyEmail: build.mutation<VerifyEmailApiResponse, VerifyEmailApiArg>({
      query: (queryArg) => ({
        url: `/api/verify-email`,
        method: "POST",
        body: queryArg,
      }),
    }),
    login: build.mutation<LoginApiResponse, LoginApiArg>({
      query: (queryArg) => ({
        url: `/api/login`,
        method: "POST",
        body: queryArg,
      }),
    }),
    logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
      query: (queryArg) => ({
        url: `/api/logout`,
        method: "POST",
        params: { everywhere: queryArg },
      }),
    }),
    resetPassword: build.mutation<
      ResetPasswordApiResponse,
      ResetPasswordApiArg
    >({
      query: (queryArg) => ({
        url: `/api/reset-password`,
        method: "POST",
        body: queryArg,
      }),
    }),
    confirmPasswordReset: build.mutation<
      ConfirmPasswordResetApiResponse,
      ConfirmPasswordResetApiArg
    >({
      query: (queryArg) => ({
        url: `/api/confirm-password-reset`,
        method: "POST",
        body: queryArg,
      }),
    }),
    loginWithGoogle: build.mutation<
      LoginWithGoogleApiResponse,
      LoginWithGoogleApiArg
    >({
      query: (queryArg) => ({
        url: `/api/login-with-google`,
        method: "POST",
        body: queryArg,
      }),
    }),
    loginWithMicrosoft: build.mutation<
      LoginWithMicrosoftApiResponse,
      LoginWithMicrosoftApiArg
    >({
      query: (queryArg) => ({
        url: `/api/login-with-microsoft`,
        method: "POST",
        body: queryArg,
      }),
    }),
    signupWithGoogle: build.mutation<
      SignupWithGoogleApiResponse,
      SignupWithGoogleApiArg
    >({
      query: (queryArg) => ({
        url: `/api/signup-with-google`,
        method: "POST",
        body: queryArg,
      }),
    }),
    signupWithMicrosoft: build.mutation<
      SignupWithMicrosoftApiResponse,
      SignupWithMicrosoftApiArg
    >({
      query: (queryArg) => ({
        url: `/api/signup-with-microsoft`,
        method: "POST",
        body: queryArg,
      }),
    }),
    confirmLinkGoogleAccount: build.mutation<
      ConfirmLinkGoogleAccountApiResponse,
      ConfirmLinkGoogleAccountApiArg
    >({
      query: (queryArg) => ({
        url: `/api/confirm-link-google-account`,
        method: "POST",
        body: queryArg,
      }),
    }),
    confirmLinkMicrosoftAccount: build.mutation<
      ConfirmLinkMicrosoftAccountApiResponse,
      ConfirmLinkMicrosoftAccountApiArg
    >({
      query: (queryArg) => ({
        url: `/api/confirm-link-microsoft-account`,
        method: "POST",
        body: queryArg,
      }),
    }),
    getSelfInfo: build.query<GetSelfInfoApiResponse, GetSelfInfoApiArg>({
      query: () => ({ url: `/api/me` }),
    }),
    editUser: build.mutation<EditUserApiResponse, EditUserApiArg>({
      query: (queryArg) => ({
        url: `/api/me`,
        method: "PATCH",
        body: queryArg,
      }),
    }),
    deleteUser: build.mutation<DeleteUserApiResponse, DeleteUserApiArg>({
      query: () => ({ url: `/api/me`, method: "DELETE" }),
    }),
    getCreatedMeetings: build.query<
      GetCreatedMeetingsApiResponse,
      GetCreatedMeetingsApiArg
    >({
      query: () => ({ url: `/api/me/created-meetings` }),
    }),
    getRespondedMeetings: build.query<
      GetRespondedMeetingsApiResponse,
      GetRespondedMeetingsApiArg
    >({
      query: () => ({ url: `/api/me/responded-meetings` }),
    }),
    linkGoogleCalendar: build.mutation<
      LinkGoogleCalendarApiResponse,
      LinkGoogleCalendarApiArg
    >({
      query: (queryArg) => ({
        url: `/api/me/link-google-calendar`,
        method: "POST",
        body: queryArg,
      }),
    }),
    unlinkGoogleCalendar: build.mutation<
      UnlinkGoogleCalendarApiResponse,
      UnlinkGoogleCalendarApiArg
    >({
      query: () => ({ url: `/api/me/link-google-calendar`, method: "DELETE" }),
    }),
    linkMicrosoftCalendar: build.mutation<
      LinkMicrosoftCalendarApiResponse,
      LinkMicrosoftCalendarApiArg
    >({
      query: (queryArg) => ({
        url: `/api/me/link-microsoft-calendar`,
        method: "POST",
        body: queryArg,
      }),
    }),
    unlinkMicrosoftCalendar: build.mutation<
      UnlinkMicrosoftCalendarApiResponse,
      UnlinkMicrosoftCalendarApiArg
    >({
      query: () => ({
        url: `/api/me/link-microsoft-calendar`,
        method: "DELETE",
      }),
    }),
    getGoogleCalendarEvents: build.query<
      GetGoogleCalendarEventsApiResponse,
      GetGoogleCalendarEventsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/me/google-calendar-events`,
        params: { meetingID: queryArg },
      }),
    }),
    getMicrosoftCalendarEvents: build.query<
      GetMicrosoftCalendarEventsApiResponse,
      GetMicrosoftCalendarEventsApiArg
    >({
      query: (queryArg) => ({
        url: `/api/me/microsoft-calendar-events`,
        params: { meetingID: queryArg },
      }),
    }),
    createMeeting: build.mutation<
      CreateMeetingApiResponse,
      CreateMeetingApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings`,
        method: "POST",
        body: queryArg,
      }),
    }),
    getMeeting: build.query<GetMeetingApiResponse, GetMeetingApiArg>({
      query: (queryArg) => ({ url: `/api/meetings/${queryArg}` }),
    }),
    editMeeting: build.mutation<EditMeetingApiResponse, EditMeetingApiArg>({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg.id}`,
        method: "PATCH",
        body: queryArg.editMeetingDto,
      }),
    }),
    deleteMeeting: build.mutation<
      DeleteMeetingApiResponse,
      DeleteMeetingApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg}`,
        method: "DELETE",
      }),
    }),
    scheduleMeeting: build.mutation<
      ScheduleMeetingApiResponse,
      ScheduleMeetingApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg.id}/schedule`,
        method: "PUT",
        body: queryArg.scheduleMeetingDto,
      }),
    }),
    unscheduleMeeting: build.mutation<
      UnscheduleMeetingApiResponse,
      UnscheduleMeetingApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg}/schedule`,
        method: "DELETE",
      }),
    }),
    addGuestRespondent: build.mutation<
      AddGuestRespondentApiResponse,
      AddGuestRespondentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg.id}/respondents/guest`,
        method: "POST",
        body: queryArg.addGuestRespondentDto,
      }),
    }),
    putSelfRespondent: build.mutation<
      PutSelfRespondentApiResponse,
      PutSelfRespondentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg.id}/respondents/me`,
        method: "PUT",
        body: queryArg.putRespondentDto,
      }),
    }),
    updateAvailabilities: build.mutation<
      UpdateAvailabilitiesApiResponse,
      UpdateAvailabilitiesApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg.id}/respondents/${queryArg.respondentId}`,
        method: "PUT",
        body: queryArg.putRespondentDto,
      }),
    }),
    deleteRespondent: build.mutation<
      DeleteRespondentApiResponse,
      DeleteRespondentApiArg
    >({
      query: (queryArg) => ({
        url: `/api/meetings/${queryArg.id}/respondents/${queryArg.respondentId}`,
        method: "DELETE",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as api };
export type SignupApiResponse = /** status 200  */
  | VerifyEmailAddressResponse
  | /** status 201  */ UserResponseWithToken;
export type SignupApiArg = LocalSignupDto;
export type VerifyEmailApiResponse = /** status 201  */ UserResponseWithToken;
export type VerifyEmailApiArg = VerifyEmailAddressDto;
export type LoginApiResponse = /** status 200  */ UserResponseWithToken;
export type LoginApiArg = LocalLoginDto;
export type LogoutApiResponse = unknown;
export type LogoutApiArg =
  /** If true, the user will be logged out everywhere */ boolean;
export type ResetPasswordApiResponse = unknown;
export type ResetPasswordApiArg = ResetPasswordDto;
export type ConfirmPasswordResetApiResponse = unknown;
export type ConfirmPasswordResetApiArg = ConfirmResetPasswordDto;
export type LoginWithGoogleApiResponse =
  /** status 200  */ CustomRedirectResponse;
export type LoginWithGoogleApiArg = OAuth2ConsentPostRedirectDto;
export type LoginWithMicrosoftApiResponse =
  /** status 200  */ CustomRedirectResponse;
export type LoginWithMicrosoftApiArg = OAuth2ConsentPostRedirectDto;
export type SignupWithGoogleApiResponse =
  /** status 200  */ CustomRedirectResponse;
export type SignupWithGoogleApiArg = OAuth2ConsentPostRedirectDto;
export type SignupWithMicrosoftApiResponse =
  /** status 200  */ CustomRedirectResponse;
export type SignupWithMicrosoftApiArg = OAuth2ConsentPostRedirectDto;
export type ConfirmLinkGoogleAccountApiResponse =
  /** status 200  */ UserResponse;
export type ConfirmLinkGoogleAccountApiArg = ConfirmLinkAccountDto;
export type ConfirmLinkMicrosoftAccountApiResponse =
  /** status 200  */ UserResponse;
export type ConfirmLinkMicrosoftAccountApiArg = ConfirmLinkAccountDto;
export type GetSelfInfoApiResponse = /** status 200  */ UserResponse;
export type GetSelfInfoApiArg = void;
export type EditUserApiResponse = /** status 200  */ UserResponse;
export type EditUserApiArg = EditUserDto;
export type DeleteUserApiResponse = /** status 204  */ undefined;
export type DeleteUserApiArg = void;
export type GetCreatedMeetingsApiResponse =
  /** status 200  */ MeetingsShortResponse;
export type GetCreatedMeetingsApiArg = void;
export type GetRespondedMeetingsApiResponse =
  /** status 200  */ MeetingsShortResponse;
export type GetRespondedMeetingsApiArg = void;
export type LinkGoogleCalendarApiResponse =
  /** status 200  */ CustomRedirectResponse;
export type LinkGoogleCalendarApiArg = LinkExternalCalendarDto;
export type UnlinkGoogleCalendarApiResponse = /** status 200  */ UserResponse;
export type UnlinkGoogleCalendarApiArg = void;
export type LinkMicrosoftCalendarApiResponse =
  /** status 200  */ CustomRedirectResponse;
export type LinkMicrosoftCalendarApiArg = LinkExternalCalendarDto;
export type UnlinkMicrosoftCalendarApiResponse =
  /** status 200  */ UserResponse;
export type UnlinkMicrosoftCalendarApiArg = void;
export type GetGoogleCalendarEventsApiResponse =
  /** status 200  */ OAuth2CalendarEventsResponse;
export type GetGoogleCalendarEventsApiArg = number;
export type GetMicrosoftCalendarEventsApiResponse =
  /** status 200  */ OAuth2CalendarEventsResponse;
export type GetMicrosoftCalendarEventsApiArg = number;
export type CreateMeetingApiResponse = /** status 201  */ MeetingResponse;
export type CreateMeetingApiArg = CreateMeetingDto;
export type GetMeetingApiResponse = /** status 200  */ MeetingResponse;
export type GetMeetingApiArg = number;
export type EditMeetingApiResponse = /** status 200  */ MeetingResponse;
export type EditMeetingApiArg = {
  id: number;
  editMeetingDto: EditMeetingDto;
};
export type DeleteMeetingApiResponse = /** status 204  */ undefined;
export type DeleteMeetingApiArg = number;
export type ScheduleMeetingApiResponse = /** status 200  */ MeetingResponse;
export type ScheduleMeetingApiArg = {
  id: number;
  scheduleMeetingDto: ScheduleMeetingDto;
};
export type UnscheduleMeetingApiResponse = /** status 200  */ MeetingResponse;
export type UnscheduleMeetingApiArg = number;
export type AddGuestRespondentApiResponse = /** status 200  */ MeetingResponse;
export type AddGuestRespondentApiArg = {
  id: number;
  addGuestRespondentDto: AddGuestRespondentDto;
};
export type PutSelfRespondentApiResponse = /** status 200  */ MeetingResponse;
export type PutSelfRespondentApiArg = {
  id: number;
  putRespondentDto: PutRespondentDto;
};
export type UpdateAvailabilitiesApiResponse =
  /** status 200  */ MeetingResponse;
export type UpdateAvailabilitiesApiArg = {
  id: number;
  respondentId: number;
  putRespondentDto: PutRespondentDto;
};
export type DeleteRespondentApiResponse = /** status 200  */ MeetingResponse;
export type DeleteRespondentApiArg = {
  id: number;
  respondentId: number;
};
export type VerifyEmailAddressResponse = {
  mustVerifyEmailAddress: boolean;
};
export type UserResponseWithToken = {
  userID: number;
  name: string;
  email: string;
  isSubscribedToNotifications: boolean;
  hasLinkedGoogleAccount: boolean;
  hasLinkedMicrosoftAccount: boolean;
  token: string;
};
export type BadRequestResponse = {
  statusCode: number;
  message: string;
  error: string;
};
export type LocalSignupDto = {
  name: string;
  email: string;
  password: string;
  subscribe_to_notifications?: boolean;
};
export type VerifyEmailAddressDto = {
  name: string;
  email: string;
  password: string;
  subscribe_to_notifications?: boolean;
  code: string;
};
export type UnauthorizedResponse = {
  statusCode: number;
  message: string;
};
export type LocalLoginDto = {
  email: string;
  password: string;
};
export type ResetPasswordDto = {
  email: string;
};
export type ConfirmResetPasswordDto = {
  password: string;
};
export type CustomRedirectResponse = {
  redirect: string;
};
export type NotFoundResponse = {
  statusCode: number;
  message: string;
};
export type OAuth2ConsentPostRedirectDto = {
  post_redirect: string;
  nonce?: string;
};
export type UserResponse = {
  userID: number;
  name: string;
  email: string;
  isSubscribedToNotifications: boolean;
  hasLinkedGoogleAccount: boolean;
  hasLinkedMicrosoftAccount: boolean;
};
export type ConfirmLinkAccountDto = {
  encrypted_entity: string;
  iv: string;
  salt: string;
  tag: string;
};
export type EditUserDto = {
  name?: string;
  subscribe_to_notifications?: boolean;
};
export type MeetingShortResponse = {
  meetingID: number;
  name: string;
  about: string;
  timezone: string;
  minStartHour: number;
  maxEndHour: number;
  tentativeDates: string[];
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
};
export type MeetingsShortResponse = {
  meetings: MeetingShortResponse[];
};
export type LinkExternalCalendarDto = {
  post_redirect: string;
};
export type OAuth2CalendarEventsResponseItem = {
  summary: string;
  startDateTime: string;
  endDateTime: string;
};
export type OAuth2CalendarEventsResponse = {
  events: OAuth2CalendarEventsResponseItem[];
};
export type MeetingRespondent = {
  respondentID: number;
  name: string;
  availabilities: string[];
};
export type MeetingResponse = {
  meetingID: number;
  name: string;
  about: string;
  timezone: string;
  minStartHour: number;
  maxEndHour: number;
  tentativeDates: string[];
  scheduledStartDateTime?: string;
  scheduledEndDateTime?: string;
  respondents: MeetingRespondent[];
  selfRespondentID?: number;
};
export type CreateMeetingDto = {
  name: string;
  about: string;
  timezone: string;
  minStartHour: number;
  maxEndHour: number;
  tentativeDates: string[];
};
export type ForbiddenResponse = {
  statusCode: number;
  message: string;
};
export type EditMeetingDto = {
  name?: string;
  about?: string;
  timezone?: string;
  minStartHour?: number;
  maxEndHour?: number;
  tentativeDates?: string[];
};
export type ScheduleMeetingDto = {
  startDateTime: string;
  endDateTime: string;
};
export type AddGuestRespondentDto = {
  availabilities: string[];
  name: string;
  email?: string;
};
export type PutRespondentDto = {
  availabilities: string[];
};
export const {
  useSignupMutation,
  useVerifyEmailMutation,
  useLoginMutation,
  useLogoutMutation,
  useResetPasswordMutation,
  useConfirmPasswordResetMutation,
  useLoginWithGoogleMutation,
  useLoginWithMicrosoftMutation,
  useSignupWithGoogleMutation,
  useSignupWithMicrosoftMutation,
  useConfirmLinkGoogleAccountMutation,
  useConfirmLinkMicrosoftAccountMutation,
  useGetSelfInfoQuery,
  useEditUserMutation,
  useDeleteUserMutation,
  useGetCreatedMeetingsQuery,
  useGetRespondedMeetingsQuery,
  useLinkGoogleCalendarMutation,
  useUnlinkGoogleCalendarMutation,
  useLinkMicrosoftCalendarMutation,
  useUnlinkMicrosoftCalendarMutation,
  useGetGoogleCalendarEventsQuery,
  useGetMicrosoftCalendarEventsQuery,
  useCreateMeetingMutation,
  useGetMeetingQuery,
  useEditMeetingMutation,
  useDeleteMeetingMutation,
  useScheduleMeetingMutation,
  useUnscheduleMeetingMutation,
  useAddGuestRespondentMutation,
  usePutSelfRespondentMutation,
  useUpdateAvailabilitiesMutation,
  useDeleteRespondentMutation,
} = injectedRtkApi;
