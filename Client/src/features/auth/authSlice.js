import { createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@onemedical_auth_session';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isRestored: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isRestored = true;

      // Persist session to AsyncStorage for persistent login across app restarts
      try {
        AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            user: action.payload.user,
            token: action.payload.token,
          })
        ).catch((err) => console.warn('[Auth] Error saving session:', err));
      } catch (e) {
        console.warn('[Auth] AsyncStorage write error:', e);
      }
    },
    loginFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isRestored = true;

      try {
        AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch((err) =>
          console.warn('[Auth] Error clearing session:', err)
        );
      } catch (e) {
        console.warn('[Auth] AsyncStorage remove error:', e);
      }
    },
    updateProfile(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        try {
          AsyncStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({
              user: state.user,
              token: state.token,
            })
          ).catch((err) => console.warn('[Auth] Error updating saved session:', err));
        } catch (e) {
          console.warn('[Auth] AsyncStorage update error:', e);
        }
      }
    },
    sessionRestored(state, action) {
      state.isRestored = true;
      if (action.payload) {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile, sessionRestored } = authSlice.actions;
export const updateProfileStatus = updateProfile;

// Thunk to restore session on app launch
export const restoreSession = () => async (dispatch) => {
  try {
    const sessionStr = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session?.token && session?.user) {
        dispatch(sessionRestored(session));
        return;
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to restore session from AsyncStorage:', err);
  }
  dispatch(sessionRestored(null));
};

export default authSlice.reducer;
