import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  appointments: [],
  selectedAppointment: null,
  currentHold: null, // { appointmentId, holdExpiresAt, therapistId }
  filter: 'upcoming', // 'upcoming' | 'past' | 'cancelled'
  loading: false,
  error: null,
};

const appointmentSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    fetchAppointmentsStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchAppointmentsSuccess(state, action) {
      state.loading = false;
      state.appointments = action.payload || [];
    },
    fetchAppointmentsFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    setSelectedAppointment(state, action) {
      state.selectedAppointment = action.payload;
    },
    setCurrentHold(state, action) {
      state.currentHold = action.payload;
    },
    clearCurrentHold(state) {
      state.currentHold = null;
    },
    setAppointmentFilter(state, action) {
      state.filter = action.payload;
    },
    addAppointment(state, action) {
      if (action.payload) {
        state.appointments.unshift(action.payload);
      }
    },
    updateAppointmentStatus(state, action) {
      const { id, status } = action.payload;
      const appt = state.appointments.find(a => a._id === id || a.appointmentId === id || a.id === id);
      if (appt) {
        appt.status = status;
      }
    },
  },
});

export const {
  fetchAppointmentsStart,
  fetchAppointmentsSuccess,
  fetchAppointmentsFailure,
  setSelectedAppointment,
  setCurrentHold,
  clearCurrentHold,
  setAppointmentFilter,
  addAppointment,
  updateAppointmentStatus,
} = appointmentSlice.actions;

export default appointmentSlice.reducer;
