import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  transactions: [],
  loading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    paymentActionStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchTransactionsSuccess(state, action) {
      state.loading = false;
      state.transactions = action.payload;
    },
    paymentActionFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    addTransaction(state, action) {
      state.transactions.unshift(action.payload);
    }
  },
});

export const {
  paymentActionStart,
  fetchTransactionsSuccess,
  paymentActionFailure,
  addTransaction
} = paymentSlice.actions;
export default paymentSlice.reducer;
