import React, { useState, useEffect } from 'react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
 AlertTriangle, Clock, Users, Activity, 
 CheckCircle, Eye, UserCheck, RefreshCw, 
 Filter, Bell, Stethoscope, FileText, LogOut, ChevronRight
} from 'lucide-react'; 
import { 
  getDashboard, 
  acceptPatient, 
  getHandoff, 
  completeIntake, 
  clinicianLogin, 
  exportFhir, 
  consultDoctor, 
  verifyIntake, 
  getAnalytics, 
  getAuditLogs,
  registerDoctor 
} from '../services/api'; 
import { io } from 'socket.io-client'; 
import toast from 'react-hot-toast'; 

const formatIntakeDateTime = (createdAt) => {
  if (!createdAt) return 'N/A';
  let date;
  if (typeof createdAt === 'object') {
    if (createdAt._seconds !== undefined) {
      date = new Date(createdAt._seconds * 1000);
    } else if (createdAt.seconds !== undefined) {
      date = new Date(createdAt.seconds * 1000);
    } else {
      date = new Date(createdAt);
    }
  } else {
    date = new Date(createdAt);
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-US', options);
};

const formatMetadata = (metadata) => {
  if (!metadata) return '-';
  let obj = metadata;
  if (typeof metadata === 'string') {
    try {
      obj = JSON.parse(metadata);
    } catch (e) {
      return metadata;
    }
  }
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }
  return Object.entries(obj)
    .map(([key, val]) => {
      const cleanKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .trim();
      const capitalizedKey = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
      const cleanVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);
      return `${capitalizedKey}: ${cleanVal}`;
    })
    .join(', ');
};

const formatMetadataTooltip = (metadata) => {
  if (!metadata) return '';
  let obj = metadata;
  if (typeof metadata === 'string') {
    try {
      obj = JSON.parse(metadata);
    } catch (e) {
      return metadata;
    }
  }
  if (typeof obj !== 'object' || obj === null) {
    return String(obj);
  }
  return Object.entries(obj)
    .map(([key, val]) => {
      const cleanKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]/g, ' ')
        .trim();
      const capitalizedKey = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
      const cleanVal = typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : String(val);
      return `${capitalizedKey}: ${cleanVal}`;
    })
    .join('\n');
};

function ClinicianDashboard() { 
 const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('clinicianToken'));
 const [loginData, setLoginData] = useState({ username: '', department: 'all' });
 const [dashboardData, setDashboardData] = useState(null); 
 const [loading, setLoading] = useState(false); 
 const [selectedIntake, setSelectedIntake] = useState(null); 
 const [showHandoff, setShowHandoff] = useState(false); 
 const [handoffNotes, setHandoffNotes] = useState(''); 
 const [filterDepartment, setFilterDepartment] = useState('all'); 
 const [notifications, setNotifications] = useState([]); 

 // Advanced clinician tab state
 const [activeTab, setActiveTab] = useState('queue');
 
 // SBAR Modal action state
 const [fhirBundle, setFhirBundle] = useState(null);
 const [fhirLoading, setFhirLoading] = useState(false);
 const [consultDoctorName, setConsultDoctorName] = useState('');
 const [consultDepartment, setConsultDepartment] = useState('emergency');
 const [consultLoading, setConsultLoading] = useState(false);
 const [verifiedPriority, setVerifiedPriority] = useState('medium');
 const [clinicianNotes, setClinicianNotes] = useState('');
 const [verifyLoading, setVerifyLoading] = useState(false);

 // Analytics & Audit Trail state
 const [analyticsData, setAnalyticsData] = useState(null);
 const [analyticsLoading, setAnalyticsLoading] = useState(false);
 const [auditLogsData, setAuditLogsData] = useState([]);
 const [auditLogsLoading, setAuditLogsLoading] = useState(false);
 const [showDoctorRegModal, setShowDoctorRegModal] = useState(false);
 const [loginMode, setLoginMode] = useState('login'); // 'login' or 'register'
 const [regDoctorForm, setRegDoctorForm] = useState({ name: '', phone: '', department: 'general-medicine' });
 const [registeredDoctorId, setRegisteredDoctorId] = useState(null);
 const [treatmentNotes, setTreatmentNotes] = useState('');
 const [showTreatModal, setShowTreatModal] = useState(false);
 const [treatIntakeId, setTreatIntakeId] = useState(null);

 const clinicianInfo = JSON.parse(localStorage.getItem('clinicianInfo') || '{}');
 const isAdmin = clinicianInfo.role === 'admin';

 useEffect(() => { 
  if (isLoggedIn) {
    fetchDashboard(); 
    
    const socket = io('http://localhost:8001'); 
    socket.emit('join-room', 'clinicians'); 
    
    socket.on('emergency-alert', (data) => { 
      toast.error(`EMERGENCY: ${data.message}`, { duration: 10000, icon: '🚨' }); 
      setNotifications(prev => [{ ...data, type: 'emergency' }, ...prev]); 
      fetchDashboard(); 
    }); 
    
    socket.on('new-intake', (data) => { 
      toast(`New patient in ${data.department}`, { icon: '🩺' }); 
      setNotifications(prev => [{ ...data, type: 'new' }, ...prev]); 
      fetchDashboard(); 
    }); 

    const interval = setInterval(fetchDashboard, 30000); 
    return () => { 
      socket.disconnect(); 
      clearInterval(interval); 
    }; 
  }
 }, [isLoggedIn]); 

 const handleLogin = async (e) => {
   e.preventDefault();
   setLoading(true);
   try {
     const response = await clinicianLogin(loginData);
     if (response.data.success) {
       localStorage.setItem('clinicianToken', response.data.token);
       localStorage.setItem('clinicianInfo', JSON.stringify(response.data.clinician));
       setIsLoggedIn(true);
       setActiveTab('queue');
       toast.success(`Welcome, ${response.data.clinician.name}`);
     }
   } catch (error) {
     toast.error('Login failed. Please check credentials.');
   } finally {
     setLoading(false);
   }
 };

 const handleLogout = () => {
   localStorage.removeItem('clinicianToken');
   localStorage.removeItem('clinicianInfo');
   setIsLoggedIn(false);
   setDashboardData(null);
   setActiveTab('queue');
 };

 const fetchDashboard = async () => { 
  try { 
    const response = await getDashboard(); 
    if (response.data.success) { 
      setDashboardData(response.data); 
    } 
  } catch (error) { 
    console.error('Dashboard fetch error:', error); 
    if (error.response?.status === 401) handleLogout();
  } finally { 
    setLoading(false); 
  } 
 }; 

 const handleAccept = async (intakeId) => { 
  const info = JSON.parse(localStorage.getItem('clinicianInfo'));
  try { 
    const response = await acceptPatient(intakeId, info.name); 
    if (response.data.success) { 
      toast.success('Patient accepted and assigned to you'); 
      fetchDashboard(); 
    } 
  } catch (error) { 
    toast.error('Failed to accept patient'); 
  } 
 }; 

 const handleViewHandoff = async (intake) => { 
  setSelectedIntake(intake); 
  setHandoffNotes('');
  setFhirBundle(null); 
  setVerifiedPriority((intake.priority || 'medium').toLowerCase());
  setClinicianNotes(intake.clinicianNotes || '');
  setConsultDoctorName('');
  setConsultDepartment(intake.departmentCode || intake.department || 'general-medicine');
  setShowHandoff(true);
  try { 
    const response = await getHandoff(intake.id || intake._id); 
    if (response.data.success) { 
      setHandoffNotes(response.data.handoffNotes); 
    } 
  } catch (error) { 
    setHandoffNotes(intake.handoffNotes || 'Notes not available'); 
  } 
 }; 

 const handleComplete = async (intakeId) => { 
  try { 
    await completeIntake(intakeId, { notes: 'Consultation completed' }); 
    toast.success('Intake marked as completed'); 
    setShowHandoff(false); 
    fetchDashboard(); 
  } catch (error) { 
    toast.error('Failed to complete intake'); 
  } 
 }; 

 const handleExportFhir = async (sessionId) => {
  setFhirLoading(true);
  try {
    const response = await exportFhir(sessionId);
    if (response.data.success) {
      setFhirBundle(response.data.fhirBundle);
      toast.success('FHIR R4 Bundle generated successfully!');
    }
  } catch (error) {
    toast.error('Failed to generate FHIR Bundle');
  } finally {
    setFhirLoading(false);
  }
 };

 const handleConsultSpecialist = async (sessionId) => {
  if (!consultDoctorName.trim()) {
    toast.error('Please specify the specialist doctor name');
    return;
  }
  setConsultLoading(true);
  try {
    const response = await consultDoctor(sessionId, consultDoctorName, consultDepartment);
    if (response.data.success) {
      toast.success(`Consult request sent to ${consultDoctorName} (${consultDepartment})`);
      fetchDashboard();
      setSelectedIntake(prev => ({
        ...prev,
        status: 'consulting',
        consultedDoctor: consultDoctorName,
        consultedDepartment: consultDepartment
      }));
    }
  } catch (error) {
    toast.error('Failed to request consultation');
  } finally {
    setConsultLoading(false);
  }
 };

 const handleVerifyIntake = async (sessionId) => {
  setVerifyLoading(true);
  try {
    const response = await verifyIntake(sessionId, {
      priority: verifiedPriority,
      notes: clinicianNotes
    });
    if (response.data.success) {
      toast.success('Intake verified and triage details updated');
      fetchDashboard();
      setSelectedIntake(prev => ({
        ...prev,
        priority: verifiedPriority,
        isEmergency: verifiedPriority === 'emergency',
        clinicianNotes: clinicianNotes,
        status: 'verified'
      }));
    }
  } catch (error) {
    toast.error('Failed to verify intake details');
  } finally {
    setVerifyLoading(false);
  }
 };

 const fetchAnalytics = async () => {
  setAnalyticsLoading(true);
  try {
    const response = await getAnalytics();
    if (response.data.success) {
      setAnalyticsData(response.data.analytics);
    }
  } catch (error) {
    toast.error('Failed to retrieve operational analytics');
  } finally {
    setAnalyticsLoading(false);
  }
 };

 const fetchAuditLogs = async () => {
  setAuditLogsLoading(true);
  try {
    const response = await getAuditLogs();
    if (response.data.success) {
      setAuditLogsData(response.data.logs);
    }
  } catch (error) {
    toast.error('Failed to retrieve compliance audit trail');
  } finally {
    setAuditLogsLoading(false);
  }
 };

 const handleRegisterDoctor = async (e) => {
   e.preventDefault();
   setLoading(true);
   try {
     const response = await registerDoctor(regDoctorForm);
     if (response.data.success) {
       setRegisteredDoctorId(response.data.doctor.doctorId);
       toast.success(`Doctor registered! ID: ${response.data.doctor.doctorId}`);
     }
   } catch (error) {
     toast.error(error.response?.data?.message || 'Registration failed');
   } finally {
     setLoading(false);
   }
 };

 const handleTreatPatient = async () => {
   if (!treatIntakeId) return;
   setLoading(true);
   try {
     await completeIntake(treatIntakeId, { notes: treatmentNotes || 'Treatment completed', diagnosis: treatmentNotes });
     toast.success('Patient treated successfully! Removed from queue.');
     setShowTreatModal(false);
     setShowHandoff(false);
     setTreatmentNotes('');
     setTreatIntakeId(null);
     fetchDashboard();
   } catch (error) {
     toast.error('Failed to complete treatment');
   } finally {
     setLoading(false);
   }
 };

 const openTreatModal = (intakeId) => {
   setTreatIntakeId(intakeId);
   setTreatmentNotes('');
   setShowTreatModal(true);
 };

 const getPriorityBadge = (priority, isEmergency) => { 
  if (isEmergency) return 'bg-red-600 text-white animate-pulse'; 
  const styles = { 
    'emergency': 'bg-red-600 text-white', 
    'urgent': 'bg-orange-500 text-white', 
    'semi-urgent': 'bg-yellow-500 text-white', 
    'non-urgent': 'bg-green-500 text-white',
    'high': 'bg-orange-500 text-white',
    'medium': 'bg-blue-500 text-white',
    'low': 'bg-green-500 text-white'
  }; 
  return styles[priority] || 'bg-gray-500 text-white'; 
 }; 

 if (!isLoggedIn) {
   return (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] flex items-center justify-center p-4">
       <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md w-full">
         <div className="flex flex-col items-center mb-8">
           <div className="bg-primary-50 p-4 rounded-2xl mb-4">
             <Stethoscope className="h-10 w-10 text-primary-600" />
           </div>
           <h2 className="text-3xl font-black text-gray-900 tracking-tight">
             {loginMode === 'login' ? 'Clinician Login' : 'Register Doctor'}
           </h2>
           <p className="text-gray-500 font-medium">
             {loginMode === 'login' ? 'Enter your unique DOC- or ADM- ID' : 'Create a new doctor account'}
           </p>
         </div>

         {loginMode === 'login' ? (
           <form onSubmit={handleLogin} className="space-y-6">
             <div>
               <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Unique ID</label>
               <input 
                 type="text" 
                 required
                 placeholder="e.g. DOC-75C721 or ADM-123456"
                 className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 focus:border-primary-500 focus:bg-white outline-none transition-all font-bold"
                 value={loginData.username}
                 onChange={e => setLoginData({...loginData, username: e.target.value})}
               />
             </div>
             <div>
               <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Department (optional for doctors)</label>
               <select 
                 className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 focus:border-primary-500 focus:bg-white outline-none transition-all font-bold"
                 value={loginData.department}
                 onChange={e => setLoginData({...loginData, department: e.target.value})}
               >
                 <option value="all">All Departments</option>
                 <option value="emergency">Emergency</option>
                 <option value="cardiology">Cardiology</option>
                 <option value="neurology">Neurology</option>
                 <option value="orthopedics">Orthopedics</option>
                 <option value="psychiatry">Psychiatry</option>
                 <option value="general-medicine">General Medicine</option>
               </select>
             </div>
             <button 
               disabled={loading}
               className="w-full bg-primary-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all flex items-center justify-center space-x-2"
             >
               <span>Access Dashboard</span>
               <ChevronRight className="h-6 w-6" />
             </button>
           </form>
         ) : registeredDoctorId ? (
           <div className="space-y-6 text-center">
             <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
               <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
               <p className="text-sm font-bold text-green-800 mb-2">Doctor Registered Successfully!</p>
               <p className="text-xs text-gray-500 mb-4">Your unique login ID is:</p>
               <div className="bg-white rounded-xl p-4 border border-green-200 flex items-center justify-center space-x-3">
                 <span className="text-2xl font-black text-gray-900 font-mono tracking-wider">{registeredDoctorId}</span>
                 <button
                   onClick={() => { navigator.clipboard.writeText(registeredDoctorId); toast.success('ID copied!'); }}
                   className="text-xs font-bold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1 rounded-lg"
                 >
                   Copy
                 </button>
               </div>
               <p className="text-xs text-gray-400 mt-3">Save this ID — you'll need it to log in.</p>
             </div>
             <button
               onClick={() => { setLoginMode('login'); setRegisteredDoctorId(null); setLoginData({...loginData, username: registeredDoctorId}); }}
               className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all"
             >
               Login with This ID
             </button>
           </div>
         ) : (
           <form onSubmit={handleRegisterDoctor} className="space-y-5">
             <div>
               <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Doctor Full Name</label>
               <input 
                 type="text" required placeholder="e.g. Dr. Gregory House"
                 className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 focus:border-primary-500 focus:bg-white outline-none transition-all font-bold"
                 value={regDoctorForm.name}
                 onChange={e => setRegDoctorForm({...regDoctorForm, name: e.target.value})}
               />
             </div>
             <div>
               <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Phone Number</label>
               <input 
                 type="tel" placeholder="e.g. 123-456-7890"
                 className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 focus:border-primary-500 focus:bg-white outline-none transition-all font-bold"
                 value={regDoctorForm.phone}
                 onChange={e => setRegDoctorForm({...regDoctorForm, phone: e.target.value})}
               />
             </div>
             <div>
               <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Department</label>
               <select 
                 className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 focus:border-primary-500 focus:bg-white outline-none transition-all font-bold"
                 value={regDoctorForm.department}
                 onChange={e => setRegDoctorForm({...regDoctorForm, department: e.target.value})}
               >
                 <option value="emergency">Emergency</option>
                 <option value="cardiology">Cardiology</option>
                 <option value="neurology">Neurology</option>
                 <option value="orthopedics">Orthopedics</option>
                 <option value="psychiatry">Psychiatry</option>
                 <option value="general-medicine">General Medicine</option>
               </select>
             </div>
             <button 
               disabled={loading}
               className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center space-x-2"
             >
               <span>{loading ? 'Registering...' : 'Register Doctor'}</span>
             </button>
           </form>
         )}

         <div className="mt-6 text-center">
           <button
             onClick={() => { setLoginMode(loginMode === 'login' ? 'register' : 'login'); setRegisteredDoctorId(null); }}
             className="text-sm font-bold text-primary-600 hover:text-primary-800 transition-colors"
           >
             {loginMode === 'login' ? 'Register as a new Doctor →' : '← Back to Login'}
           </button>
         </div>
       </div>
     </motion.div>
   );
 }

 if (loading && !dashboardData) { 
  return ( 
   <div className="flex items-center justify-center h-96"> 
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-600"></div> 
   </div> 
  ); 
 } 

 return ( 
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-20"> 
   {/* Header */} 
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"> 
    <div> 
     <div className="flex items-center space-x-3 mb-2">
       <div className="bg-primary-600 p-2 rounded-xl">
         <Stethoscope className="h-6 w-6 text-white" />
       </div>
        <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">Clinician Dashboard</h1> 
     </div>
     <p className="text-gray-500 font-medium ml-12">
       Welcome back, <span className="text-primary-600 font-bold">{dashboardData?.clinician?.name}</span> • {dashboardData?.clinician?.department.replace(/-/g, ' ')}
     </p> 
    </div> 
    <div className="flex flex-wrap items-center gap-2 md:gap-4 ml-12 md:ml-0"> 
     <div className="relative group"> 
      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-all">
        <Bell className="h-6 w-6 text-gray-600" /> 
        {notifications.length > 0 && ( 
         <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white"> 
          {notifications.length} 
         </span> 
        )} 
       </div>
     </div> 
     <button onClick={fetchDashboard} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all"> 
      <RefreshCw className={`h-6 w-6 text-gray-600 ${loading ? 'animate-spin' : ''}`} /> 
     </button> 
     <button onClick={handleLogout} className="bg-red-50 p-3 rounded-2xl border border-red-100 shadow-sm hover:bg-red-100 transition-all group"> 
      <LogOut className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform" /> 
     </button> 
    </div> 
   </div> 

   {/* Stats Cards */} 
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"> 
    {[
      { label: 'Emergencies', value: dashboardData?.stats?.totalEmergencies || 0, icon: <AlertTriangle />, color: 'red' },
      { label: 'Urgent', value: dashboardData?.stats?.totalUrgent || 0, icon: <Clock />, color: 'orange' },
      { label: 'My Queue', value: dashboardData?.stats?.totalMyQueue || 0, icon: <UserCheck />, color: 'blue' },
      { label: 'Total Today', value: dashboardData?.stats?.totalToday || 0, icon: <Activity />, color: 'green' }
    ].map((stat, i) => (
      <motion.div 
        key={i}
        whileHover={{ y: -5 }}
        className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 flex items-center justify-between overflow-hidden relative group`}
      >
        <div className={`absolute top-0 left-0 w-1.5 h-full bg-${stat.color}-500`} />
        <div> 
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p> 
          <p className={`text-4xl font-black text-${stat.color}-600`}>{stat.value}</p> 
        </div> 
        <div className={`p-3 bg-${stat.color}-50 rounded-2xl text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
          {React.cloneElement(stat.icon, { className: "h-8 w-8" })}
        </div>
      </motion.div> 
    ))}
   </div> 

   {/* Tabs Navigation */}
   <div className="flex border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-none">
     <button
       onClick={() => setActiveTab('queue')}
       className={`py-4 px-6 font-black text-sm uppercase tracking-wider border-b-2 transition-all flex-shrink-0 ${
         activeTab === 'queue'
           ? 'border-primary-600 text-primary-600'
           : 'border-transparent text-gray-400 hover:text-gray-600'
       }`}
     >
       Active Queue
     </button>
     {isAdmin && (
       <>
         <button
           onClick={() => {
             setActiveTab('analytics');
             fetchAnalytics();
           }}
           className={`py-4 px-6 font-black text-sm uppercase tracking-wider border-b-2 transition-all flex-shrink-0 ${
             activeTab === 'analytics'
               ? 'border-primary-600 text-primary-600'
               : 'border-transparent text-gray-400 hover:text-gray-600'
           }`}
         >
           Operational Analytics
         </button>
         <button
           onClick={() => {
             setActiveTab('auditLogs');
             fetchAuditLogs();
           }}
           className={`py-4 px-6 font-black text-sm uppercase tracking-wider border-b-2 transition-all flex-shrink-0 ${
             activeTab === 'auditLogs'
               ? 'border-primary-600 text-primary-600'
               : 'border-transparent text-gray-400 hover:text-gray-600'
           }`}
         >
           Compliance Audit Logs
         </button>
       </>
     )}
   </div>

   {/* Tab Contents */}
   {activeTab === 'queue' && (
     <div className="space-y-8">
       {/* Emergency Section */}
       <AnimatePresence>
         {dashboardData?.emergencies?.length > 0 && ( 
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-red-200 overflow-hidden relative"
          > 
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <AlertTriangle className="h-64 w-64" />
            </div>
            <h2 className="text-2xl font-black mb-6 flex items-center relative z-10"> 
              <AlertTriangle className="h-8 w-8 mr-3 animate-pulse" /> 
              Critical Emergency Cases ({dashboardData.emergencies.length}) 
            </h2> 
            <div className="space-y-4 relative z-10"> 
              {dashboardData.emergencies.map((intake) => ( 
              <motion.div 
                key={intake.id || intake._id} 
                whileHover={{ scale: 1.01 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              > 
                <div> 
                  <p className="text-xl font-black mb-1">{intake.chiefComplaint}</p> 
                  <p className="text-sm font-bold text-red-100"> 
                    Patient: {intake.patientId} | Dept: {intake.department?.replace(/-/g, ' ')} | 
                    {formatIntakeDateTime(intake.createdAt)} 
                  </p> 
                </div> 
                <div className="flex space-x-3"> 
                  <button 
                    onClick={() => handleViewHandoff(intake)} 
                    className="px-6 py-3 bg-white text-red-600 rounded-xl font-black hover:bg-red-50 transition-all flex items-center" 
                  > 
                    <Eye className="h-5 w-5 mr-2" /> View SBAR
                  </button> 
                  <button 
                    onClick={() => handleAccept(intake.id || intake._id)} 
                    className="px-6 py-3 bg-red-900/50 text-white rounded-xl font-black hover:bg-red-900 transition-all flex items-center" 
                  > 
                    <UserCheck className="h-5 w-5 mr-2" /> Accept
                  </button> 
                </div> 
              </motion.div> 
              ))} 
            </div> 
          </motion.div> 
         )} 
       </AnimatePresence>

       {/* Main Queue */}
       <div className="grid lg:grid-cols-3 gap-8">
         {/* Patient Queue */} 
         <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
             <h2 className="text-2xl font-black text-gray-900 tracking-tight">Active Patient Queue</h2>
             <div className="flex items-center space-x-3"> 
              <Filter className="h-5 w-5 text-gray-400" /> 
              <select 
                value={filterDepartment} 
                onChange={(e) => setFilterDepartment(e.target.value)} 
                className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2 font-bold text-sm outline-none focus:border-primary-500 transition-all" 
              > 
                <option value="all">All Departments</option> 
                <option value="emergency">Emergency</option> 
                <option value="cardiology">Cardiology</option> 
                <option value="neurology">Neurology</option> 
                <option value="orthopedics">Orthopedics</option> 
                <option value="general-medicine">General Medicine</option> 
              </select> 
            </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 overflow-hidden"> 
            <div className="overflow-x-auto"> 
              <table className="w-full min-w-[800px]"> 
                <thead> 
                  <tr className="bg-gray-50/50 border-b border-gray-100"> 
                    <th className="text-left py-5 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Priority</th> 
                    <th className="text-left py-5 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Chief Complaint</th> 
                    <th className="text-left py-5 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Status</th> 
                    <th className="text-left py-5 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Assigned Doctor</th>
                    <th className="text-right py-5 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Actions</th> 
                  </tr> 
                </thead> 
                <tbody className="divide-y divide-gray-50"> 
                  {dashboardData?.pending?.filter(intake => 
                    filterDepartment === 'all' || intake.departmentCode === filterDepartment 
                  ).map((intake) => ( 
                  <tr key={intake.id || intake._id} className="hover:bg-gray-50/50 transition-colors group"> 
                    <td className="py-6 px-6"> 
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getPriorityBadge(intake.priority, intake.isEmergency)}`}> 
                        {intake.isEmergency ? 'EMERGENCY' : intake.priority} 
                      </span> 
                    </td> 
                    <td className="py-6 px-6">
                      <p className="font-bold text-gray-900 mb-0.5">{intake.chiefComplaint}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{intake.department?.replace(/-/g, ' ')} Specialist Required</p>
                    </td> 
                    <td className="py-6 px-6"> 
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${ 
                        intake.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 
                        intake.status === 'assigned' ? 'bg-blue-50 text-blue-700' : 
                        intake.status === 'verified' ? 'bg-green-50 text-green-700' : 
                        intake.status === 'consulting' ? 'bg-indigo-50 text-indigo-700' : 
                        'bg-green-50 text-green-700' 
                      }`}> 
                        {intake.status} 
                      </span> 
                    </td> 
                    <td className="py-6 px-6">
                      <span className="font-bold text-gray-700 text-sm">{intake.assignedDoctor || 'Unassigned'}</span>
                    </td>
                    <td className="py-6 px-6 text-right"> 
                      <div className="flex justify-end space-x-2"> 
                        <button 
                          onClick={() => handleViewHandoff(intake)} 
                          className="p-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-all" 
                          title="View SBAR Notes" 
                        > 
                          <FileText className="h-5 w-5" /> 
                        </button> 
                        <button 
                          onClick={() => handleAccept(intake.id || intake._id)} 
                          className="p-2.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl transition-all" 
                          title="Accept Patient" 
                        > 
                          <UserCheck className="h-5 w-5" /> 
                        </button> 
                      </div> 
                    </td> 
                  </tr> 
                  ))} 
                  {(!dashboardData?.pending || dashboardData.pending.length === 0) && ( 
                  <tr> 
                    <td colSpan="5" className="py-20 text-center"> 
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-12 w-12 text-gray-100 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No pending patients in department</p>
                      </div>
                    </td> 
                  </tr> 
                  )} 
                </tbody> 
              </table> 
            </div> 
           </div> 
         </div>

         {/* My Active Queue */}
         <div className="space-y-6">
           <h2 className="text-2xl font-black text-gray-900 tracking-tight">
             {isAdmin ? 'All Active Intakes' : 'Assigned to Me'}
           </h2>
           <div className="space-y-4">
             {dashboardData?.myQueue?.map(intake => (
               <motion.div 
                 key={intake.id || intake._id}
                 whileHover={{ x: 5 }}
                 className="bg-white p-6 rounded-[2rem] border border-primary-100 shadow-lg shadow-primary-50 relative overflow-hidden group"
               >
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                   <UserCheck className="h-16 w-16" />
                 </div>
                 <div className="flex items-center justify-between mb-4">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getPriorityBadge(intake.priority, intake.isEmergency)}`}>
                     {intake.priority}
                   </span>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     {formatIntakeDateTime(intake.createdAt)}
                   </span>
                 </div>
                 <p className="font-black text-gray-900 mb-4 line-clamp-2">{intake.chiefComplaint}</p>
                 <div className="flex space-x-2">
                   <button 
                     onClick={() => handleViewHandoff(intake)}
                     className="flex-1 bg-primary-50 text-primary-600 py-3 rounded-xl font-black text-xs hover:bg-primary-600 hover:text-white transition-all flex items-center justify-center space-x-1"
                   >
                     <span>Begin Consult</span>
                     <ChevronRight className="h-4 w-4" />
                   </button>
                   <button 
                     onClick={() => openTreatModal(intake.id || intake._id)}
                     className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-xs hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center space-x-1"
                   >
                     <span>Complete Treat</span>
                     <CheckCircle className="h-4 w-4" />
                   </button>
                 </div>
               </motion.div>
             ))}
             {(!dashboardData?.myQueue || dashboardData.myQueue.length === 0) && (
               <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-10 text-center">
                 <Users className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                 <p className="text-gray-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                   Your personal queue<br />is currently empty
                 </p>
               </div>
             )}
           </div>
         </div>
       </div>
     </div>
   )}

   {/* Operational Analytics Tab */}
   {isAdmin && activeTab === 'analytics' && (
     <div className="space-y-8">
       {analyticsLoading ? (
         <div className="flex items-center justify-center h-64">
           <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-100 border-t-primary-600"></div>
         </div>
       ) : analyticsData ? (
         <>
           {/* Analytics Summary Stats */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 flex flex-col justify-between">
               <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Total Sessions</p>
               <p className="text-4xl font-black text-gray-900">{analyticsData.totalSessions}</p>
               <span className="text-[10px] text-gray-400 font-medium mt-2">Active + Completed sessions</span>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 flex flex-col justify-between">
               <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Avg AI Latency</p>
               <p className="text-4xl font-black text-blue-600">{analyticsData.averageAiLatencyMs} ms</p>
               <span className="text-[10px] text-gray-400 font-medium mt-2">Symptom extraction response time</span>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 flex flex-col justify-between">
               <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Critical ESI Rate</p>
               <p className="text-4xl font-black text-red-600">
                 {analyticsData.totalSessions > 0
                   ? Math.round(
                       (((analyticsData.priorityDistribution.emergency || 0) +
                         (analyticsData.priorityDistribution.high || 0) +
                         (analyticsData.priorityDistribution.urgent || 0)) /
                         analyticsData.totalSessions) *
                         100
                     )
                   : 0}%
               </p>
               <span className="text-[10px] text-gray-400 font-medium mt-2">Emergency + High priority cases</span>
             </div>
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50 flex flex-col justify-between">
               <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Peak Department</p>
               <p className="text-xl font-black text-indigo-600 truncate">
                 {analyticsData.departmentDistribution?.length > 0
                   ? analyticsData.departmentDistribution.reduce((prev, current) => (prev.count > current.count ? prev : current)).name
                   : 'None'}
               </p>
               <span className="text-[10px] text-gray-400 font-medium mt-2">Most routed medical specialty</span>
             </div>
           </div>

           {/* Charts Section */}
           <div className="grid lg:grid-cols-2 gap-8">
             {/* ESI Triage Distribution */}
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
               <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center">
                 <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                 ESI Priority Distribution
               </h3>
               <div className="space-y-4">
                 {['emergency', 'high', 'urgent', 'medium', 'low'].map(priority => {
                   const count = analyticsData.priorityDistribution[priority] || 0;
                   const pct = analyticsData.totalSessions > 0 ? Math.round((count / analyticsData.totalSessions) * 100) : 0;
                   const colors = {
                     emergency: 'bg-red-500',
                     high: 'bg-orange-500',
                     urgent: 'bg-yellow-500',
                     medium: 'bg-blue-500',
                     low: 'bg-green-500'
                   };
                   return (
                     <div key={priority} className="space-y-1">
                       <div className="flex justify-between text-xs font-bold text-gray-700 uppercase tracking-wider">
                         <span>{priority}</span>
                         <span>{count} ({pct}%)</span>
                       </div>
                       <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                         <div
                           className={`${colors[priority]} h-full transition-all duration-1000`}
                           style={{ width: `${pct}%` }}
                         />
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>

             {/* Department Distribution */}
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-6">
               <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center">
                 <Activity className="h-5 w-5 text-indigo-500 mr-2" />
                 Department Load Distribution
               </h3>
               <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {analyticsData.departmentDistribution?.map((dept, i) => {
                   const maxVal = analyticsData.totalSessions || 1;
                   const pct = Math.round((dept.count / maxVal) * 100);
                   return (
                     <div key={i} className="space-y-1">
                       <div className="flex justify-between text-xs font-bold text-gray-700 capitalize">
                         <span>{dept.name.replace(/-/g, ' ')}</span>
                         <span>{dept.count} cases ({pct}%)</span>
                       </div>
                       <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                         <div
                           className="bg-indigo-500 h-full transition-all duration-1000"
                           style={{ width: `${pct}%` }}
                         />
                       </div>
                     </div>
                   );
                 })}
                 {(!analyticsData.departmentDistribution || analyticsData.departmentDistribution.length === 0) && (
                   <p className="text-center text-sm font-bold text-gray-400 py-12">No department routing records yet.</p>
                 )}
               </div>
             </div>
           </div>
         </>
       ) : (
         <div className="bg-white p-12 rounded-[2.5rem] border border-gray-100 text-center">
           <p className="text-gray-400 font-bold uppercase tracking-wider">No analytics data available</p>
         </div>
       )}
     </div>
   )}

   {/* Compliance Audit Logs Tab */}
   {isAdmin && activeTab === 'auditLogs' && (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
             <FileText className="h-6 w-6 text-indigo-600 mr-2" />
             HIPAA Audit Trail & Compliance Log
           </h3>
           <p className="text-sm font-medium text-gray-500">Immutable security event logs for compliance verification.</p>
         </div>
         <button
           onClick={fetchAuditLogs}
           disabled={auditLogsLoading}
           className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs hover:bg-gray-50 flex items-center space-x-2 animate-none"
         >
           <RefreshCw className={`h-4 w-4 ${auditLogsLoading ? 'animate-spin' : ''}`} />
           <span>Refresh Logs</span>
         </button>
       </div>

       <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 overflow-hidden">
         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
               <tr className="bg-gray-50 border-b border-gray-100">
                 <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                 <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-400">User / Actor</th>
                 <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Action Event</th>
                 <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Session ID</th>
                 <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-gray-400">Details</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
               {auditLogsLoading ? (
                 <tr>
                   <td colSpan="5" className="py-20 text-center">
                     <div className="flex items-center justify-center">
                       <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-100 border-t-primary-600"></div>
                     </div>
                   </td>
                 </tr>
               ) : auditLogsData?.length > 0 ? (
                 auditLogsData.map((log, i) => (
                   <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                     <td className="py-4 px-6 font-mono text-xs text-gray-500">
                       {new Date(log.timestamp).toLocaleString()}
                     </td>
                     <td className="py-4 px-6 font-bold text-gray-900">
                       {log.userId}
                     </td>
                     <td className="py-4 px-6 font-bold text-gray-800">
                       {log.action}
                     </td>
                     <td className="py-4 px-6 font-mono text-xs text-indigo-600">
                       {log.sessionId ? log.sessionId : 'N/A'}
                     </td>
                      <td className="py-4 px-6 text-xs max-w-xs truncate" title={formatMetadataTooltip(log.metadata)}>
                        {formatMetadata(log.metadata)}
                      </td>
                   </tr>
                 ))
               ) : (
                 <tr>
                   <td colSpan="5" className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
                     No security logs recorded.
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       </div>
     </div>
   )}

   {/* Handoff Notes Modal */} 
   <AnimatePresence>
     {showHandoff && selectedIntake && ( 
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"> 
       <motion.div 
         initial={{ opacity: 0, scale: 0.9, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.9, y: 20 }}
         className="bg-white rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-3xl border border-gray-100 flex flex-col"
       > 
        <div className="p-5 md:p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30"> 
          <div className="flex items-center space-x-4">
            <div className="bg-primary-600 p-3 rounded-2xl shadow-lg shadow-primary-100">
              <FileText className="h-6 w-6 text-white" /> 
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Clinical Handoff Report</h3> 
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">SBAR Documentation • AI Generated</p>
            </div>
          </div>
          <button onClick={() => setShowHandoff(false)} className="bg-white p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-600 transition-colors"> 
           <LogOut className="h-6 w-6 rotate-90" /> 
          </button> 
        </div> 

        <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-8">
          {/* Patient Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Patient ID</p>
              <p className="font-mono font-bold text-gray-900">{selectedIntake.patientId?.slice(-8).toUpperCase()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Priority</p>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${getPriorityBadge(selectedIntake.priority, selectedIntake.isEmergency)}`}>
                {selectedIntake.priority}
              </span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Department</p>
              <p className="font-bold text-gray-900 capitalize">{selectedIntake.department?.replace(/-/g, ' ')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Triage Score</p>
              <p className="font-black text-primary-600 text-xl">{selectedIntake.triageLevel}/5</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Clinical Actions & Interoperability Section */}
            <div className="space-y-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Clinical Actions & Interoperability</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Triage Verification Form */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-left">
                  <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Triage Override / Verification
                  </h5>
                  <p className="text-xs text-gray-500">
                    Verify the triage priority level or override it based on clinical judgment.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Verify Priority</label>
                      <select
                        value={verifiedPriority}
                        onChange={e => setVerifiedPriority(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-sm outline-none focus:border-primary-500 transition-all"
                      >
                        <option value="emergency">Emergency (ESI 1)</option>
                        <option value="high">High (ESI 2)</option>
                        <option value="urgent">Urgent (ESI 3)</option>
                        <option value="medium">Medium (ESI 4)</option>
                        <option value="low">Low (ESI 5)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Triage Notes</label>
                      <textarea
                        value={clinicianNotes}
                        onChange={e => setClinicianNotes(e.target.value)}
                        placeholder="Verify patient state, ESI override explanation..."
                        rows={2}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => handleVerifyIntake(selectedIntake.id || selectedIntake._id)}
                    disabled={verifyLoading}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                  >
                    {verifyLoading ? 'Updating...' : 'Verify Triage Priority'}
                  </button>
                </div>

                {/* Specialist Consult Form */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-left">
                  <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
                    <Stethoscope className="h-5 w-5 mr-2 text-primary-600" />
                    Specialist Consultation
                  </h5>
                  <p className="text-xs text-gray-500">
                    Consult a department specialist to co-manage or take over this patient.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Doctor Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. House"
                        value={consultDoctorName}
                        onChange={e => setConsultDoctorName(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-sm outline-none focus:border-primary-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Department</label>
                      <select
                        value={consultDepartment}
                        onChange={e => setConsultDepartment(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-sm outline-none focus:border-primary-500 transition-all"
                      >
                        <option value="emergency">Emergency</option>
                        <option value="cardiology">Cardiology</option>
                        <option value="neurology">Neurology</option>
                        <option value="orthopedics">Orthopedics</option>
                        <option value="psychiatry">Psychiatry</option>
                        <option value="general-medicine">General Medicine</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleConsultSpecialist(selectedIntake.id || selectedIntake._id)}
                    disabled={consultLoading}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                  >
                    {consultLoading ? 'Consulting...' : 'Request Specialist Consult'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

         <div className="p-5 sm:p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"> 
           <p className="text-xs font-bold text-gray-400 italic">This AI summary is a clinical aid and requires professional validation.</p>
           <div className="flex flex-col sm:flex-row gap-3"> 
             <button onClick={() => setShowHandoff(false)} className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-50 transition-all"> 
               Close 
             </button> 
             <button 
               onClick={() => openTreatModal(selectedIntake.id || selectedIntake._id)} 
               className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center" 
             > 
               <Stethoscope className="h-5 w-5 mr-2" /> Treat Patient 
             </button> 
             <button 
               onClick={() => handleComplete(selectedIntake.id || selectedIntake._id)} 
               className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center" 
             > 
               <CheckCircle className="h-5 w-5 mr-2" /> Mark Complete 
             </button> 
           </div> 
         </div> 
       </motion.div> 
      </div> 
     )} 
   </AnimatePresence>

   {/* Treatment Notes Modal */}
   <AnimatePresence>
     {showTreatModal && (
       <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
         <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.9, y: 20 }}
           className="bg-white rounded-[2rem] max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-gray-100"
         >
           <div className="flex items-center space-x-3 mb-6">
             <div className="bg-emerald-100 p-3 rounded-2xl">
               <Stethoscope className="h-6 w-6 text-emerald-600" />
             </div>
             <div>
               <h3 className="text-xl font-black text-gray-900">Treat Patient</h3>
               <p className="text-sm text-gray-500">Enter diagnosis and treatment notes</p>
             </div>
           </div>
           <textarea
             value={treatmentNotes}
             onChange={e => setTreatmentNotes(e.target.value)}
             placeholder="Enter treatment notes, diagnosis, prescriptions..."
             rows={5}
             className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 sm:px-6 py-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium resize-none mb-6"
           />
           <div className="flex flex-col-reverse sm:flex-row gap-3">
             <button
               onClick={() => setShowTreatModal(false)}
               className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-200 transition-all"
             >
               Cancel
             </button>
             <button
               onClick={handleTreatPatient}
               disabled={loading}
               className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
             >
               {loading ? (
                 <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
               ) : (
                 <><CheckCircle className="h-5 w-5" /><span>Complete Treatment</span></>
               )}
             </button>
           </div>
         </motion.div>
       </div>
     )}
   </AnimatePresence>
  </motion.div> 
 ); 
} 

export default ClinicianDashboard;
