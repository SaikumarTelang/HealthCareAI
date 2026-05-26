import React, { createContext, useContext, useState } from 'react';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const [patient, setPatient] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [intakeData, setIntakeData] = useState(null);

  return (
    <PatientContext.Provider value={{
      patient,
      setPatient,
      sessionId,
      setSessionId,
      intakeData,
      setIntakeData
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  return useContext(PatientContext);
}
