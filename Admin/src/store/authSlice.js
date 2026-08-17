import { createSlice } from '@reduxjs/toolkit';

const stored = JSON.parse(localStorage.getItem('admin_auth') || 'null');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored?.user || null,
    accessToken: stored?.accessToken || null,
    isAuthenticated: !!stored?.accessToken,
    loading: false,
    error: null,
  },
  reducers: {
    loginStart:   (state) => { state.loading = true; state.error = null; },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user  = action.payload.user;
      state.accessToken = action.payload.accessToken;
      localStorage.setItem('admin_auth', JSON.stringify(action.payload));
    },
    loginFailure: (state, action) => { state.loading = false; state.error = action.payload; },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      localStorage.removeItem('admin_auth');
    },
    clearError: (state) => { state.error = null; },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
