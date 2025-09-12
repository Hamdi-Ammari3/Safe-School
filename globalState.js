'use client';
import React, { createContext, useReducer, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { DB } from './firebaseConfig';

const GlobalStateContext = createContext();

const initialState = {
  lines: [],
  riders: [],
  drivers: [],
  loading: true,
  error: null,
};

const globalStateReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        ...state,
        ...action.payload,
        loading: false,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
      };
    default:
      return state;
  }
};

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(globalStateReducer, initialState);

  useEffect(() => {
    const storedDashboardName = localStorage.getItem("adminDahboardName");
    if (!storedDashboardName) {
      console.log("No dashboard name found in local storage");
      return;
    }

    const unsubscribeRiders = onSnapshot(
      query(collection(DB, "riders"), where("destination", "==", storedDashboardName)),
      (snapshot) => {
        const riders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        dispatch({
          type: "FETCH_SUCCESS",
          payload: { riders },
        });
      }
    );

    const unsubscribeLines = onSnapshot(
      query(collection(DB, "lines"), where("destination", "==", storedDashboardName)),
      (snapshot) => {
        const lines = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        dispatch({
          type: "FETCH_SUCCESS",
          payload: { lines },
        });
      }
    );

    
    const unsubscribeDrivers = onSnapshot(collection(DB, "drivers"), async (snapshot) => {
      try {
        const drivers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Filter line only drivers
        const lineOnlyDrivers = drivers.filter(driver => driver?.service_type === 'خطوط')
    
        // Dispatch filtered drivers
        dispatch({
          type: "FETCH_SUCCESS",
          payload: { drivers: lineOnlyDrivers },
        });
    
      } catch (error) {
        console.error("Error filtering drivers:", error);
        dispatch({
          type: "FETCH_ERROR",
          error,
        });
      }
    });
        
    // Cleanup listeners on unmount
    return () => {
      unsubscribeRiders();
      unsubscribeLines();
      unsubscribeDrivers();
    };
  }, []);

  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => React.useContext(GlobalStateContext);
