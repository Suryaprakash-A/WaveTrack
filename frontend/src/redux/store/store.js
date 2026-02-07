// import { configureStore } from "@reduxjs/toolkit";
// import authReducer from "../slice/authSlice";

// export const store = configureStore({
//   reducer: {
//     auth: authReducer,
//   },
// });
// store/index.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { loadState, saveState } from "./persist";

const preloadedState = loadState();

const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  preloadedState,
});

// Save to localStorage on every state change
store.subscribe(() => {
  saveState(store.getState());
});

export default store;
