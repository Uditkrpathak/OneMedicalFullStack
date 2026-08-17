import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../shared/config';

export const authApiSlice = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['User', 'Profile', 'SavedSpecialists'],
  endpoints: (builder) => ({
    requestOtp: builder.mutation({
      query: (phoneNumber) => ({
        url: '/auth/otp/request',
        method: 'POST',
        body: { phoneNumber },
      }),
    }),
    verifyOtp: builder.mutation({
      query: ({ email, phoneNumber, otp }) => ({
        url: '/auth/otp/verify',
        method: 'POST',
        body: { email, phoneNumber, otp },
      }),
      invalidatesTags: ['User', 'Profile'],
    }),
    updatePatientProfile: builder.mutation({
      query: (profileData) => ({
        url: '/users/patients/me',
        method: 'PATCH',
        body: profileData,
      }),
      invalidatesTags: ['User', 'Profile'],
    }),
    updateTherapistProfile: builder.mutation({
      query: (profileData) => ({
        url: '/users/therapists/me',
        method: 'PATCH',
        body: profileData,
      }),
      invalidatesTags: ['User', 'Profile'],
    }),
    getMyProfile: builder.query({
      query: () => '/users/me',
      providesTags: ['User', 'Profile'],
    }),
    getSavedSpecialists: builder.query({
      query: () => '/users/me/saved-therapists',
      providesTags: ['SavedSpecialists'],
    }),
    saveSpecialist: builder.mutation({
      query: (therapistId) => ({
        url: `/users/me/saved-therapists/${therapistId}`,
        method: 'POST',
      }),
      invalidatesTags: ['SavedSpecialists'],
    }),
    removeSavedSpecialist: builder.mutation({
      query: (therapistId) => ({
        url: `/users/me/saved-therapists/${therapistId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SavedSpecialists'],
    }),
    updateNotificationPreferences: builder.mutation({
      query: (prefs) => ({
        url: '/users/me/notifications',
        method: 'PATCH',
        body: prefs,
      }),
      invalidatesTags: ['User'],
    }),
    requestAccountDeletion: builder.mutation({
      query: (reason) => ({
        url: '/users/me/delete-request',
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['User', 'Profile'],
    }),
  }),
});

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useUpdatePatientProfileMutation,
  useUpdateTherapistProfileMutation,
  useGetMyProfileQuery,
  useGetSavedSpecialistsQuery,
  useSaveSpecialistMutation,
  useRemoveSavedSpecialistMutation,
  useUpdateNotificationPreferencesMutation,
  useRequestAccountDeletionMutation,
} = authApiSlice;

export default authApiSlice;
