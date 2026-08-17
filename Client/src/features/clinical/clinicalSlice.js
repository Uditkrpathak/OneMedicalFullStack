import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeProgram: null,
  todaysExercises: [],
  sessionsHistory: [],
  painTrend: [],
  loading: false,
  error: null,
  offlineQueue: [], // Queue for logs completed while offline
};

const clinicalSlice = createSlice({
  name: 'clinical',
  initialState,
  reducers: {
    clinicalActionStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchActiveProgramSuccess(state, action) {
      state.loading = false;
      state.activeProgram = action.payload;
    },
    fetchTodaysExercisesSuccess(state, action) {
      state.loading = false;
      state.todaysExercises = action.payload;
    },
    fetchSessionsSuccess(state, action) {
      state.loading = false;
      state.sessionsHistory = action.payload;
    },
    fetchPainTrendSuccess(state, action) {
      state.loading = false;
      state.painTrend = action.payload;
    },
    clinicalActionFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logSessionLocally(state, action) {
      state.sessionsHistory.unshift(action.payload);
    },
    enqueueOfflineLog(state, action) {
      state.offlineQueue.push(action.payload);
    },
    clearOfflineQueue(state) {
      state.offlineQueue = [];
    }
  },
});

export const {
  clinicalActionStart,
  fetchActiveProgramSuccess,
  fetchTodaysExercisesSuccess,
  fetchSessionsSuccess,
  fetchPainTrendSuccess,
  clinicalActionFailure,
  logSessionLocally,
  enqueueOfflineLog,
  clearOfflineQueue
} = clinicalSlice.actions;
export default clinicalSlice.reducer;
