import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import PatientPortal from './pages/PatientPortal';
import DoctorPortal from './pages/DoctorPortal';
import Header from './components/Header';
import { PatientProvider } from './context/PatientContext';

function App() {
  return (
    <PatientProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-grow container mx-auto px-2 sm:px-4 py-4 sm:py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/patient" element={<PatientPortal />} />
              <Route path="/doctor" element={<DoctorPortal />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-200 py-6">
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm text-gray-500">
                © 2026 careConnect AI Health Systems. For demonstration purposes only.
              </p>
            </div>
          </footer>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#363636',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
              },
            }}
          />
        </div>
      </Router>
    </PatientProvider>
  );
}

export default App;
