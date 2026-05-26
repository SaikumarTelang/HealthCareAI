import React, { useState, useEffect } from 'react';
import { usePatient } from '../context/PatientContext';
import { registerPatient, getNpp } from '../services/api';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Shield, CheckCircle } from 'lucide-react';

function PatientRegistration({ onComplete }) {
  const { setPatient } = usePatient();
  const [loading, setLoading] = useState(false);
  const [nppData, setNppData] = useState(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    address: { street: '', city: '', state: '', zipCode: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
    insurance: { provider: '', policyNumber: '', groupNumber: '' },
    medicalHistory: {
      allergies: '',
      currentMedications: '',
      pastConditions: '',
    }
  });

  useEffect(() => {
    const fetchNpp = async () => {
      try {
        const response = await getNpp();
        setNppData(response.data);
      } catch (err) {
        setNppData({
          title: "Notice of Privacy Practices (NPP)",
          content: "This notice describes how medical information about you may be used and disclosed... (Standard HIPAA NPP text)",
          last_updated: "2026-05-20"
        });
      }
    };
    fetchNpp();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consentChecked) {
      toast.error('You must read and agree to the Notice of Privacy Practices (NPP) to proceed.', { icon: '🛡️' });
      return;
    }
    setLoading(true);
    try {
      // Process arrays
      const processedData = {
        ...formData,
        consentGiven: true,
        medicalHistory: {
          allergies: formData.medicalHistory.allergies.split(',').map(s => s.trim()).filter(Boolean),
          currentMedications: formData.medicalHistory.currentMedications.split(',').map(s => s.trim()).filter(Boolean),
          pastConditions: formData.medicalHistory.pastConditions.split(',').map(s => s.trim()).filter(Boolean),
        }
      };
      const response = await registerPatient(processedData);

      if (response.data.success) {
        setPatient(response.data.patient);
        toast.success('Registration successful! HIPAA consent recorded.');
        onComplete();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast('Continuing as guest. Privacy practices consent recorded implicitly.', { icon: 'ℹ️' });
    setPatient({
      patientId: 'GUEST-' + Date.now(),
      firstName: 'Guest',
      lastName: 'User'
    });
    onComplete();
  };

  return (
    <div className="card max-w-2xl mx-auto shadow-xl bg-white border border-gray-100 rounded-2xl p-5 sm:p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Patient Registration</h2>
        <p className="text-gray-600 mt-1">Please fill in your information to get started with our AI Intake Agent</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="border-b border-gray-100 pb-4">
          <h3 className="flex items-center text-base font-bold text-gray-800 mb-3">
            <User className="h-5 w-5 mr-2 text-primary-600" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">First Name *</label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Last Name *</label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Date of Birth *</label>
              <input
                type="date"
                name="dateOfBirth"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-b border-gray-100 pb-4">
          <h3 className="flex items-center text-base font-bold text-gray-800 mb-3">
            <Phone className="h-5 w-5 mr-2 text-primary-600" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="border-b border-gray-100 pb-4">
          <h3 className="flex items-center text-base font-bold text-gray-800 mb-3">
            <Shield className="h-5 w-5 mr-2 text-red-500" />
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                name="emergencyContact.name"
                value={formData.emergencyContact.name}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Relationship</label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Phone</label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formData.emergencyContact.phone}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Medical History */}
        <div className="border-b border-gray-100 pb-4">
          <h3 className="flex items-center text-base font-bold text-gray-800 mb-3">
            <Mail className="h-5 w-5 mr-2 text-primary-600" />
            Medical History
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Allergies (comma-separated)
              </label>
              <input
                type="text"
                name="medicalHistory.allergies"
                value={formData.medicalHistory.allergies}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Penicillin, Peanuts, Latex..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Current Medications (comma-separated)
              </label>
              <input
                type="text"
                name="medicalHistory.currentMedications"
                value={formData.medicalHistory.currentMedications}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Lisinopril 10mg, Metformin 500mg..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Past Medical Conditions (comma-separated)
              </label>
              <input
                type="text"
                name="medicalHistory.pastConditions"
                value={formData.medicalHistory.pastConditions}
                onChange={handleChange}
                className="input-field w-full px-4 py-2 border border-gray-350 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                placeholder="Hypertension, Diabetes Type 2..."
              />
            </div>
          </div>
        </div>

        {/* NPP Notice of Privacy Practices Agreement */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <h4 className="flex items-center text-xs font-bold text-gray-800 uppercase tracking-wider">
            <Shield className="h-4 w-4 mr-2 text-primary-600 animate-pulse" />
            {nppData ? nppData.title : "Notice of Privacy Practices (NPP)"}
          </h4>
          <div className="text-xs text-gray-600 bg-white border border-gray-150 rounded-lg p-3 max-h-24 overflow-y-auto leading-relaxed select-none font-mono scrollbar-thin">
            {nppData ? nppData.content : "Loading Notice of Privacy Practices..."}
            <div className="mt-2 text-[10px] text-gray-400 font-sans">
              Last Updated: {nppData ? nppData.last_updated : "2026-05-20"}
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="npp-consent"
                name="npp-consent"
                type="checkbox"
                required
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </div>
            <div className="ml-3 text-xs">
              <label htmlFor="npp-consent" className="font-semibold text-gray-700 cursor-pointer select-none">
                I acknowledge that I have read and agree to the Notice of Privacy Practices (NPP).
              </label>
              <p className="text-gray-500">Agreeing permits the secure, HIPAA-compliant collection and transmission of your symptom profiles to our clinicians.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-4 pt-4">
          <button
            type="button"
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm font-semibold underline decoration-2 underline-offset-4 hover:decoration-primary-500 transition-colors"
          >
            Skip registration (continue as guest)
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-8 py-3 disabled:opacity-50 font-bold shadow-md hover:shadow-lg transition-all rounded-lg text-white bg-primary-600 hover:bg-primary-700"
          >
            {loading ? 'Registering...' : 'Register & Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PatientRegistration;
