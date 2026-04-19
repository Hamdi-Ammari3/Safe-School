"use client";

import React, { createContext, useReducer, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { DB } from "./firebaseConfig";

const GlobalStateContext = createContext();

const initialState = {
  students: [],
  teachers: [],
  employees: [],
  classes: [],
  studentsRequests: [],
  bills: [],
  loading: true,
  error: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "SET_DATA":
      return { ...state, ...action.payload, loading: false };
    case "ERROR":
      return { ...state, error: action.error, loading: false };
    default:
      return state;
  }
};

export const GlobalStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [schoolId, setSchoolId] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("adminSchoolID");
    if (id) setSchoolId(id);
  }, []);

  useEffect(() => {
    if (!schoolId) return;

    const fetchData = async () => {
      try {
        const [
          studentsSnap,
          teachersSnap,
          employeesSnap,
          classesSnap,
          studentsRequestsSnap,
          billsSnap
        ] = await Promise.all([
          getDocs(query(collection(DB, "students"), where("school_id", "==", schoolId))),
          getDocs(query(collection(DB, "teachers"), where("school_id", "==", schoolId))),
          getDocs(query(collection(DB, "employees"), where("school_id", "==", schoolId))),
          getDocs(query(collection(DB, "classes"), where("schoolId", "==", schoolId))),
          getDocs(query(collection(DB, "students_requests"), where("school_id", "==", schoolId))),
          getDocs(query(collection(DB, "student_bills"), where("school_id", "==", schoolId))),
        ]);

        dispatch({
          type: "SET_DATA",
          payload: {
            students: studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            teachers: teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            employees: employeesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            classes: classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            studentsRequests: studentsRequestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            bills: billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
          },
        });

      } catch (error) {
        dispatch({ type: "ERROR", error });
      }
    };

    fetchData();
  }, [schoolId]);

  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => React.useContext(GlobalStateContext);