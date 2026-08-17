import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../shared/config';

export const clinicalApiSlice = createApi({
  reducerPath: 'clinicalApi',
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
  tagTypes: ['ActiveProgram', 'TodaysExercises', 'AssignedPatients', 'MedicalRecords', 'ConsultationDraft'],
  endpoints: (builder) => ({
    getActiveProgram: builder.query({
      query: () => '/programs/my/active',
      providesTags: ['ActiveProgram'],
    }),
    getTodaysExercises: builder.query({
      query: () => '/programs/my/today',
      providesTags: ['TodaysExercises'],
    }),
    getAssignedPatients: builder.query({
      query: () => '/admin/patients',
      providesTags: ['AssignedPatients'],
    }),
    logSession: builder.mutation({
      query: (sessionData) => ({
        url: '/sessions',
        method: 'POST',
        body: sessionData,
      }),
      invalidatesTags: ['ActiveProgram', 'TodaysExercises', 'AssignedPatients'],
    }),
    saveConsultationDraft: builder.mutation({
      query: (draftData) => ({
        url: '/sessions/draft',
        method: 'POST',
        body: draftData,
      }),
      invalidatesTags: ['ConsultationDraft'],
    }),
    listMedicalRecords: builder.query({
      query: () => '/medical-records',
      providesTags: ['MedicalRecords'],
    }),
    getMedicalRecordById: builder.query({
      query: (id) => `/medical-records/${id}`,
      providesTags: (result, error, id) => [{ type: 'MedicalRecords', id }],
    }),
  }),
});

export const {
  useGetActiveProgramQuery,
  useGetTodaysExercisesQuery,
  useGetAssignedPatientsQuery,
  useLogSessionMutation,
  useSaveConsultationDraftMutation,
  useListMedicalRecordsQuery,
  useGetMedicalRecordByIdQuery,
} = clinicalApiSlice;

export default clinicalApiSlice;
