import axios from 'axios';

// Strictly use the Node.js backend on Port 8001
const getApiBase = () => {
  return 'http://localhost:8001/api';
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json'
  }
});

// Update baseURL interceptor to evaluate dynamically on each request
api.interceptors.request.use((config) => {
  config.baseURL = getApiBase();
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Patient APIs
export const registerPatient = (data) => api.post('/patients/register', data);
export const getPatient = (patientId) => api.get(`/patients/${patientId}`);
export const registerNatural = (text) => api.post('/patients/register-natural', { text });
export const lookupOrRegisterPatient = (data) => api.post('/patients/lookup-or-register', data);

// Chat APIs
export const startChat = (patientId) => api.post('/chat/start', { patientId });
export const sendMessage = (sessionId, message) => api.post('/chat/message', { sessionId, message });
export const getChatHistory = (sessionId) => api.get(`/chat/history/${sessionId}`);
export const completeChat = (sessionId, patientId) => api.post('/chat/complete', { sessionId, patientId });

// Intake APIs
export const createIntake = (data) => api.post('/intakes/create', data);
export const getAllIntakes = (params) => api.get('/intakes/all', { params });
export const getIntake = (id) => api.get(`/intakes/${id}`);
export const analyzeSymptoms = (symptoms, patientHistory) => api.post('/intakes/analyze-symptoms', { symptoms, patientHistory });

// Clinician APIs
export const clinicianLogin = (credentials) => api.post('/clinician/login', credentials);
export const getDashboard = () => {
  const token = localStorage.getItem('clinicianToken');
  return api.get('/clinician/dashboard', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const getDepartmentQueue = (department) => api.get(`/clinician/queue/${department}`);
export const acceptPatient = (intakeId, clinicianName) => {
  const token = localStorage.getItem('clinicianToken');
  return api.post(`/clinician/accept/${intakeId}`, { clinicianName }, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const getHandoff = (intakeId) => {
  const token = localStorage.getItem('clinicianToken');
  return api.get(`/clinician/handoff/${intakeId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const getDepartments = () => api.get('/clinician/departments');
export const completeIntake = (intakeId, data) => {
  const token = localStorage.getItem('clinicianToken');
  return api.post(`/clinician/complete/${intakeId}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
};

// Advanced & Compliance APIs
export const getNpp = () => api.get('/chat/npp');
export const submitConsent = (sessionId, consentType) => api.post(`/chat/consent/${sessionId}`, { consentType });
export const exportFhir = (sessionId) => {
  const token = localStorage.getItem('clinicianToken');
  return api.get(`/clinician/fhir/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const consultDoctor = (sessionId, doctorName, department) => {
  const token = localStorage.getItem('clinicianToken');
  return api.post(`/clinician/consult-doctor/${sessionId}`, { doctorName, department }, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const verifyIntake = (sessionId, data) => {
  const token = localStorage.getItem('clinicianToken');
  return api.post(`/clinician/verify-intake/${sessionId}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const getAnalytics = () => {
  const token = localStorage.getItem('clinicianToken');
  return api.get('/clinician/analytics', {
    headers: { Authorization: `Bearer ${token}` }
  });
};
export const getAuditLogs = () => {
  const token = localStorage.getItem('clinicianToken');
  return api.get('/clinician/audit-logs', {
    headers: { Authorization: `Bearer ${token}` }
  });
};

export const registerDoctor = (data) => {
  const token = localStorage.getItem('clinicianToken');
  return api.post('/clinician/register-doctor', data, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
};
export const checkAppointmentStatus = (data) => api.post('/chat/appointment-status', data);
export const submitDoctorReview = (sessionId, data) => api.post(`/chat/review/${sessionId}`, data);

export default api;
