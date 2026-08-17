import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../features/auth/authSlice';
import appointmentReducer from '../../features/appointments/appointmentSlice';
import clinicalReducer from '../../features/clinical/clinicalSlice';
import paymentReducer from '../../features/payments/paymentSlice';
import { authApiSlice } from '../../features/auth/authApiSlice';
import { clinicalApiSlice } from '../../features/clinical/clinicalApiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    appointments: appointmentReducer,
    clinical: clinicalReducer,
    payments: paymentReducer,
    [authApiSlice.reducerPath]: authApiSlice.reducer,
    [clinicalApiSlice.reducerPath]: clinicalApiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }).concat(authApiSlice.middleware, clinicalApiSlice.middleware),
});

export default store;
