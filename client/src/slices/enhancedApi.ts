import { api } from './api';

export const enhancedApi = api.enhanceEndpoints({
  addTagTypes: ['me', 'createdMeetings', 'respondedMeetings'],
  endpoints: {
    logout: {
      invalidatesTags: ['me'],
    },
    deleteUser: {
      invalidatesTags: ['me'],
    },
    getSelfInfo: {
      providesTags: ['me'],
    },
    editUser: {
      invalidatesTags: ['me'],
    },
    editMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
    },
    scheduleMeeting: {
      invalidatesTags: ['createdMeetings', 'respondedMeetings'],
    },
    getCreatedMeetings: {
      providesTags: ['createdMeetings'],
    },
    getRespondedMeetings: {
      providesTags: ['respondedMeetings'],
    },
  },
});
