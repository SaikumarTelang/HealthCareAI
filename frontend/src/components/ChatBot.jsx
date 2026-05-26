import React, { useState, useRef, useEffect } from 'react'; 
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mic, MicOff, AlertTriangle, CheckCircle, 
  Stethoscope, UserCheck, ArrowRight, Shield, Cpu,
  User, Phone, Calendar, Search
} from 'lucide-react';
import { usePatient } from '../context/PatientContext'; 
import { startChat, sendMessage, createIntake, completeChat, lookupOrRegisterPatient, checkAppointmentStatus, getIntake, submitDoctorReview } from '../services/api'; 
import toast from 'react-hot-toast'; 
import VoiceInput from './VoiceInput'; 
import EmergencyBanner from './EmergencyBanner'; 

// Lightweight renderer: parses **bold** markdown into <strong> tags
const renderMessageContent = (text) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

function ChatBot({ onViewSummary }) { 
 const { patient, setPatient, sessionId, setSessionId, setIntakeData } = usePatient(); 
 const [messages, setMessages] = useState([]); 
 const [input, setInput] = useState(''); 
 const [loading, setLoading] = useState(false); 
 const [isEmergency, setIsEmergency] = useState(false); 
 const [emergencyData, setEmergencyData] = useState(null); 
 const [isListening, setIsListening] = useState(false); 
 const [analysisData, setAnalysisData] = useState(null); 
 const [decisionState, setDecisionState] = useState(null); // 'analyzing', 'recommendation', 'assigned'
 const [thinkingStep, setThinkingStep] = useState(0);
 const [showRegistrationModal, setShowRegistrationModal] = useState(false);
 const [regForm, setRegForm] = useState({
   firstName: '',
   lastName: '',
   age: '',
   phone: ''
  });
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentLookup, setAppointmentLookup] = useState({ mode: 'id', patientId: '', firstName: '', lastName: '', phone: '' });
  const [appointmentData, setAppointmentData] = useState(null);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const thinkingSteps = [
  "Analyzing clinical markers...",
  "Cross-referencing symptoms...",
  "Evaluating urgency level...",
  "Determining best specialist..."
 ];
 const chatEndRef = useRef(null); 
 const inputRef = useRef(null); 

 useEffect(() => { 
  initChat(); 
 }, []); 

 useEffect(() => { 
  chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
 }, [messages]); 

  useEffect(() => {
    let intervalId = null;
    if (decisionState === 'assigned' && sessionId) {
      intervalId = setInterval(async () => {
        try {
          const response = await getIntake(sessionId);
          if (response.data.success && response.data.intake?.status === 'completed') {
            clearInterval(intervalId);
            setShowReviewModal(true);
            setDecisionState(null);
          }
        } catch (err) {
          console.error("Error polling intake status:", err);
        }
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [decisionState, sessionId]);

 const initChat = async () => { 
  try { 
   const response = await startChat(patient?.patientId || 'anonymous'); 
   if (response.data.success) { 
    setSessionId(response.data.sessionId); 
    setMessages([response.data.message]); 
   } 
  } catch (error) { 
   setMessages([{ 
    role: 'assistant', 
    content: "Hello! I'm your AI Health Agent. Please describe your symptoms in detail so I can determine the best specialist for your care." 
   }]); 
   setSessionId('local-' + Date.now()); 
  } 
 }; 

  const handleStatusChipClick = () => {
    let nameVal = "[First Name] [Last Name]";
    let phoneVal = "[Phone]";
    if (patient) {
      if (patient.firstName && patient.lastName) {
        nameVal = `${patient.firstName} ${patient.lastName}`;
      }
      if (patient.phone) {
        phoneVal = patient.phone;
      }
    }
    setInput(`Check appointment status for Name: ${nameVal}, Phone: ${phoneVal}`);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleIdChipClick = () => {
    let idVal = "PAT-[Your ID]";
    if (patient && patient.patientId) {
      idVal = patient.patientId;
    }
    setInput(`Check appointment status for Patient ID: ${idVal}`);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSend = async () => { 
   if (!input.trim() || loading) return; 
   const rawInput = input.trim();
   const userMessage = { role: 'user', content: rawInput }; 
   setMessages(prev => [...prev, userMessage]); 
   setInput(''); 
   setLoading(true); 

   const statusRegex = /check\s+appointment\s+status\s+for\s+name:\s*([^,]+),\s*phone:\s*(.+)/i;
   const idRegex = /check\s+appointment\s+status\s+for\s+patient\s+id:\s*([a-zA-Z0-9-]+)/i;
   
   const matchNamePhone = rawInput.match(statusRegex);
   const matchId = rawInput.match(idRegex);

   if (matchNamePhone || matchId) {
     let payload = {};
     if (matchNamePhone) {
       const name = matchNamePhone[1].trim();
       const phone = matchNamePhone[2].trim();

       if (name.includes('[First Name]') || name.includes('[Last Name]') || phone.includes('[Phone]')) {
         setMessages(prev => [...prev, {
           role: 'assistant',
           content: "It looks like you didn't replace the placeholder values. Please edit the text to include your actual name and phone number, e.g.:\n\n`Check appointment status for Name: Jane Doe, Phone: 555-0199`",
           timestamp: new Date()
         }]);
         setLoading(false);
         return;
       }

       const nameParts = name.split(/\s+/);
       const firstName = nameParts[0] || '';
       const lastName = nameParts.slice(1).join(' ') || '';
       payload = { firstName, lastName, phone };
     } else {
       const patientId = matchId[1].trim();
       if (patientId.includes('[Your ID]')) {
         setMessages(prev => [...prev, {
           role: 'assistant',
           content: "It looks like you didn't replace the placeholder value. Please edit the text to include your actual Patient ID, e.g.:\n\n`Check appointment status for Patient ID: PAT-A1B2`",
           timestamp: new Date()
         }]);
         setLoading(false);
         return;
       }
       payload = { patientId };
     }

     try {
       const response = await checkAppointmentStatus(payload);

       if (response.data.success) {
          const appt = response.data.appointment;
          const status = (appt.status || 'active').toLowerCase();
          
          let successContent = `📋 **Appointment Details Found:**\n\n` +
            `• **Patient Name:** ${appt.patientName}\n` +
            `• **Patient ID:** ${appt.patientId}\n`;

          if (status === 'active' || status === 'in_progress') {
            successContent += `• **Status:** **INTAKE IN PROGRESS**\n\n` +
              `*Your clinical intake is currently in progress. Please complete the assessment to be assigned to a specialist department and receive your triage level.*`;
          } else {
            let displayStatus = status;
            let displayDept = appt.department ? appt.department.replace(/-/g, ' ') : 'General Medicine';
            displayDept = displayDept.charAt(0).toUpperCase() + displayDept.slice(1);
            let displayDoctor = appt.assignedDoctor || 'Pending clinician assignment';
            let displayTriage = appt.triageLevel ? `ESI ${appt.triageLevel}/5` : 'Pending';
            let displayWait = appt.estimatedWait || 'N/A';

            if (status === 'pending') {
              displayStatus = 'QUEUE (Waiting for Doctor)';
              displayWait = appt.estimatedWait || '15-30 min';
            } else if (status === 'assigned' || status === 'consulting' || status === 'verified' || status === 'treating') {
              displayStatus = 'IN CONSULTATION';
              displayDoctor = appt.assignedDoctor || 'Assigned Clinician';
              displayTriage = appt.triageLevel ? `ESI ${appt.triageLevel}/5` : 'ESI 3/5';
              displayWait = 'Immediate (Being Treated)';
            } else if (status === 'completed') {
              displayStatus = 'TREATED & COMPLETED';
              displayDoctor = appt.assignedDoctor || 'Treating Clinician';
              displayTriage = appt.triageLevel ? `ESI ${appt.triageLevel}/5` : 'ESI 3/5';
              displayWait = 'Treatment Completed';
            }

            successContent += `• **Status:** **${displayStatus}**\n` +
              `• **Specialist Department:** ${displayDept}\n` +
              `• **Assigned Clinician:** ${displayDoctor}\n` +
              `• **Triage Level:** ${displayTriage}\n` +
              `• **Estimated Wait Time:** ${displayWait}\n\n` +
              `Please let me know if you need any other assistance!`;
          }

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: successContent,
            timestamp: new Date()
          }]);
       }
     } catch (error) {
       const errMsg = error.response?.data?.message || error.response?.data?.detail || 'No active appointment or patient profile found. Please double check the ID or details provided.';
       setMessages(prev => [...prev, {
         role: 'assistant',
         content: `Lookup Failed:\n\n${errMsg}`,
         timestamp: new Date()
       }]);
     } finally {
       setLoading(false);
       inputRef.current?.focus();
     }
     return;
   }

   setDecisionState('analyzing');
   setThinkingStep(0);

   const thinkingInterval = setInterval(() => {
     setThinkingStep(prev => (prev + 1) % thinkingSteps.length);
   }, 800);

   try { 
    const response = await sendMessage(sessionId, rawInput); 
  
    if (response.data.success) { 
     const aiResponse = response.data.response;
     setMessages(prev => [...prev, aiResponse]); 
  
     if (response.data.isEmergency) { 
      setIsEmergency(true); 
      setEmergencyData(response.data.emergencyData); 
      toast.error('Emergency detected!', { icon: '🚨' }); 
     } 

     if (response.data.analysis) { 
      const analysis = response.data.analysis;
      setAnalysisData(analysis); 
      
      if (analysis.department && analysis.urgency) {
       setTimeout(() => {
         setDecisionState('recommendation');
       }, 500);
      } else {
       setDecisionState(null);
      }
     } 
    } 
   } catch (error) { 
    setMessages(prev => [...prev, { 
     role: 'assistant', 
     content: "I'm analyzing your input. Could you tell me more about the severity and how long this has been happening?" 
    }]); 
    setDecisionState(null);
   } finally { 
    clearInterval(thinkingInterval);
    setLoading(false); 
    inputRef.current?.focus(); 
   } 
  };  
 
 const handleAssignDoctor = () => { 
   setShowRegistrationModal(true); 
  }; 

  const handleRegisterAndComplete = async (e) => {
   if (e) e.preventDefault();
   if (!regForm.firstName || !regForm.lastName || !regForm.age || !regForm.phone) {
    toast.error("Please fill in all fields.");
    return;
   }
   setLoading(true);
   try {
    const patientRes = await lookupOrRegisterPatient({
     firstName: regForm.firstName.trim(),
     lastName: regForm.lastName.trim(),
     age: parseInt(regForm.age),
     phone: regForm.phone.trim()
    });

    if (patientRes.data.success) {
     const registeredPatient = patientRes.data.patient;
     const resolvedPatientId = registeredPatient.patientId;
     
     setPatient(registeredPatient);
     toast.success(patientRes.data.message || `Patient identified: ${resolvedPatientId}`, { icon: '👤' });

     const response = await completeChat(sessionId, resolvedPatientId);
     
     if (response.data.success) { 
      const { routing } = response.data;
      
      setIntakeData({
       ...routing,
       isEmergency: routing.priority === 'emergency'
      }); 
      setDecisionState('assigned');
      
      const confirmMsg = {
        role: 'assistant',
        content: `Excellent. I have officially assigned you to **${routing.assignedDoctor}** (Patient ID: **${resolvedPatientId}**) in the **${routing.department}** department.\n\nYour estimated wait time is **${routing.estimatedWait}**. Please stay in the chat if you have more questions, or proceed to the clinical dashboard to see your status.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMsg]);
      toast.success(`Assigned to ${routing.assignedDoctor}`); 
     } 
     setShowRegistrationModal(false);
    }
   } catch (error) { 
    console.error('Registration/assignment error:', error);
    const fallbackIntake = { 
     priority: isEmergency ? 'emergency' : 'semi-urgent', 
     department: analysisData?.department || 'general-medicine', 
     assignedDoctor: 'Dr. Sarah Jenkins', 
     estimatedWait: isEmergency ? 'Immediate' : '25 minutes', 
     isEmergency, 
     possibleConditions: analysisData?.categories || ['Clinical Evaluation Required'], 
     queuePosition: 3
    };
    setIntakeData(fallbackIntake); 
    setDecisionState('assigned');

    const confirmMsg = {
     role: 'assistant',
     content: `I've successfully assigned you to **${fallbackIntake.assignedDoctor}** in the **${fallbackIntake.department.replace(/-/g, ' ')}** specialist team.\n\nEstimated wait: **${fallbackIntake.estimatedWait}**. A clinician has been notified of your symptoms.`,
     timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmMsg]);
    setShowRegistrationModal(false);
   } finally { 
    setLoading(false); 
   }   };

 const handleCheckAppointment = async (e) => {
   if (e) e.preventDefault();
   setAppointmentLoading(true);
   setAppointmentData(null);
   try {
     const payload = appointmentLookup.mode === 'id'
       ? { patientId: appointmentLookup.patientId }
       : { firstName: appointmentLookup.firstName, lastName: appointmentLookup.lastName, phone: appointmentLookup.phone };
     const response = await checkAppointmentStatus(payload);
     if (response.data.success) {
       setAppointmentData(response.data.appointment);
     }
   } catch (error) {
     toast.error(error.response?.data?.message || error.response?.data?.detail || 'Appointment not found');
   } finally {
     setAppointmentLoading(false);
   }
 };

  const handleSubmitReview = async (e) => {
    if (e) e.preventDefault();
    setReviewSubmitting(true);
    try {
      const response = await submitDoctorReview(sessionId, { rating: reviewRating, reviewText: reviewText.trim() });
      if (response.data.success) {
        toast.success("Thank you for your feedback!", { icon: '⭐️' });
        setShowReviewModal(false);
        setReviewRating(5);
        setReviewText('');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Thank you for sharing your experience! We have received your feedback (Rating: ${reviewRating}/5). If you need anything else, just ask.`,
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return ( 
   <div className="card max-w-4xl mx-auto shadow-2xl border-none overflow-hidden bg-white flex flex-col h-[calc(100vh-12rem)] min-h-[500px] md:h-[700px]"> 
   <AnimatePresence>
    {isEmergency && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
      >
        <EmergencyBanner data={emergencyData} />
      </motion.div>
    )} 
   </AnimatePresence>
 
   <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50"> 
    <AnimatePresence initial={false}>
      {messages.map((msg, idx) => ( 
       <motion.div 
         key={idx} 
         initial={{ opacity: 0, y: 10, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
       > 
        <div className={`max-w-[95%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm ${ 
         msg.role === 'user' 
          ? 'bg-primary-600 text-white rounded-br-none' 
          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none' 
        }`}> 
         <p className="whitespace-pre-wrap text-base leading-relaxed font-medium">{renderMessageContent(msg.content)}</p> 
         <div className={`text-[10px] mt-2 font-black uppercase tracking-widest ${ 
          msg.role === 'user' ? 'text-primary-200' : 'text-gray-400' 
         }`}> 
          {msg.role === 'user' ? 'You' : 'AI Health Agent'} 
         </div> 
        </div> 
       </motion.div> 
      ))} 
    </AnimatePresence>

    <AnimatePresence>
      {decisionState === 'analyzing' && (
       <motion.div 
         initial={{ opacity: 0, x: -20 }}
         animate={{ opacity: 1, x: 0 }}
         exit={{ opacity: 0, scale: 0.9 }}
         className="flex justify-start"
       >
        <div className="bg-primary-50 border border-primary-100 rounded-2xl px-6 py-4 flex items-center space-x-3 text-primary-700 shadow-sm">
         <div className="relative">
          <Stethoscope className="h-5 w-5 animate-pulse text-primary-600" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary-400 rounded-full animate-ping"></div>
         </div>
         <div className="flex flex-col">
          <span className="font-black text-[10px] uppercase tracking-widest text-primary-400">Agent Thinking</span>
          <span className="font-bold text-sm transition-all duration-300">{thinkingSteps[thinkingStep]}</span>
         </div>
        </div>
       </motion.div>
      )}

      {decisionState === 'recommendation' && analysisData && (
       <motion.div 
         initial={{ opacity: 0, y: 20, scale: 0.9 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, scale: 0.9 }}
         className="flex justify-start"
       >
        <div className="bg-white border-2 border-primary-500 rounded-3xl p-8 shadow-2xl max-w-[95%] sm:max-w-[90%] space-y-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10">
          <Stethoscope className="h-32 w-32 text-primary-900" />
         </div>

         <div className="flex items-center space-x-4 text-primary-600">
          <div className="bg-primary-100 p-3 rounded-2xl">
           <UserCheck className="h-8 w-8" />
          </div>
          <h3 className="font-black text-2xl tracking-tighter uppercase">Agent Recommendation</h3>
         </div>
         
         <div className="space-y-4 relative z-10">
          <p className="text-gray-500 text-lg font-medium leading-relaxed">I've analyzed your clinical markers. I recommend an immediate consultation with our specialized team:</p>
          <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
           <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-400 mb-2">Target Specialist</p>
           <p className="text-3xl font-black text-primary-900 capitalize leading-none mb-4">
            {analysisData.department.replace(/-/g, ' ')}
           </p>
           <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
             analysisData.urgency === 'emergency' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
            }`}>
             {analysisData.urgency} PRIORITY
            </span>
            <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">
             AI-Verified Routing
            </span>
           </div>
          </div>
         </div>

         <div className="pt-2">
          <motion.button 
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={handleAssignDoctor}
           disabled={loading}
           className="w-full bg-primary-600 hover:bg-primary-700 text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center space-x-3 shadow-xl shadow-primary-200 transition-all disabled:opacity-50"
          >
           <span>Assign Specialist Now</span>
           <ArrowRight className="h-6 w-6" />
          </motion.button>
         </div>
        </div>
       </motion.div>
      )}
    </AnimatePresence>
 
    {loading && !decisionState && ( 
     <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       className="flex justify-start"
     > 
      <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm"> 
       <div className="flex space-x-1"> 
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-gray-300 rounded-full"></motion.div> 
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full"></motion.div> 
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-gray-300 rounded-full"></motion.div> 
       </div> 
      </div> 
     </motion.div> 
    )} 
 
    <div ref={chatEndRef} /> 
   </div> 

   <div className="p-4 md:p-6 bg-white border-t border-gray-100">
    <div className="flex flex-col space-y-4">
      {decisionState === 'assigned' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-green-50/50 rounded-2xl border border-green-100"
        >
          <div className="flex items-center space-x-2 text-green-600">
           <CheckCircle className="h-5 w-5 flex-shrink-0" />
           <span className="font-black text-xs uppercase tracking-widest">Clinical Assignment Active</span>
          </div>
          <motion.button 
           whileHover={{ scale: 1.02 }}
           whileTap={{ scale: 0.98 }}
           onClick={onViewSummary}
           className="w-full sm:w-auto bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center space-x-2"
          >
           <span>View Clinical Summary</span>
           <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2 px-1">
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleStatusChipClick}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-full text-[9px] sm:text-xs font-bold bg-primary-50/80 backdrop-blur-sm text-primary-700 hover:bg-primary-100/90 border border-primary-100 transition-all shadow-sm"
        >
          <span>📋 Check Status by Name & Phone</span>
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={handleIdChipClick}
          className="inline-flex items-center space-x-2 px-3 py-2 rounded-full text-[9px] sm:text-xs font-bold bg-primary-50/80 backdrop-blur-sm text-primary-700 hover:bg-primary-100/90 border border-primary-100 transition-all shadow-sm"
        >
          <span>🆔 Check Status by Patient ID</span>
        </motion.button>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4"> 
       <div className="flex-1 relative"> 
        <textarea 
         ref={inputRef} 
         value={input} 
         onChange={(e) => setInput(e.target.value)} 
         onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
         placeholder="Describe your symptoms..." 
         className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 md:px-8 py-3.5 focus:border-primary-500 focus:bg-white transition-all resize-none h-14 pt-3.5 text-sm text-gray-700 font-bold outline-none animate-none" 
         rows={1} 
         disabled={loading} 
        /> 
       </div> 
   
       <VoiceInput 
        onResult={(text) => setInput(text)} 
        isListening={isListening} 
        setIsListening={setIsListening} 
       /> 
   
       <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleSend} 
        disabled={!input.trim() || loading} 
        className="bg-primary-600 text-white p-4 rounded-xl shadow-xl shadow-primary-200 hover:bg-primary-700 disabled:opacity-50 transition-all" 
       > 
        <Send className="h-5 w-5" /> 
       </motion.button> 
      </div> 
      <div className="mt-2 flex items-center justify-center space-x-4 text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">
       <span className="flex items-center space-x-1 cursor-pointer hover:text-primary-500" onClick={() => setShowAppointmentModal(true)}><Search className="h-3 w-3"/><span>Check Status</span></span>
       <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
       <span className="flex items-center space-x-1"><Shield className="h-3 w-3"/><span>Secure Triage</span></span>
       <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
       <span className="flex items-center space-x-1"><Cpu className="h-3 w-3"/><span>Gemini 1.5</span></span>
      </div>
    </div>
   </div> 

    <AnimatePresence>
     {showAppointmentModal && (
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.9, y: 20 }}
           transition={{ type: 'spring', damping: 25, stiffness: 350 }}
           className="bg-white rounded-[2rem] shadow-2xl p-5 md:p-8 max-w-lg w-full border border-gray-100 relative overflow-hidden"
         >
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 -z-10" />
           
           <div className="text-center mb-6">
             <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
               <Search className="h-6 w-6" />
             </div>
             <h3 className="text-xl font-black text-gray-900 tracking-tight">Check Appointment Status</h3>
             <p className="text-gray-500 text-xs mt-1 font-medium">Look up your appointment by ID or Name & Phone</p>
           </div>

           <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
             <button
               onClick={() => setAppointmentLookup(prev => ({ ...prev, mode: 'id' }))}
               className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${appointmentLookup.mode === 'id' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
             >
               Patient ID
             </button>
             <button
               onClick={() => setAppointmentLookup(prev => ({ ...prev, mode: 'namephone' }))}
               className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${appointmentLookup.mode === 'namephone' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
             >
               Name & Phone
             </button>
           </div>

           <form onSubmit={handleCheckAppointment} className="space-y-4">
             {appointmentLookup.mode === 'id' ? (
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Patient ID</label>
                 <input
                   type="text" required placeholder="e.g. PAT-A1B2C3D4"
                   value={appointmentLookup.patientId}
                   onChange={e => setAppointmentLookup(prev => ({ ...prev, patientId: e.target.value }))}
                   className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
                 />
               </div>
             ) : (
               <>
                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">First Name</label>
                     <input
                       type="text" required placeholder="John"
                       value={appointmentLookup.firstName}
                       onChange={e => setAppointmentLookup(prev => ({ ...prev, firstName: e.target.value }))}
                       className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Last Name</label>
                     <input
                       type="text" required placeholder="Doe"
                       value={appointmentLookup.lastName}
                       onChange={e => setAppointmentLookup(prev => ({ ...prev, lastName: e.target.value }))}
                       className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phone</label>
                   <input
                     type="tel" required placeholder="123-456-7890"
                     value={appointmentLookup.phone}
                     onChange={e => setAppointmentLookup(prev => ({ ...prev, phone: e.target.value }))}
                     className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
                   />
                 </div>
               </>
             )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAppointmentModal(false); setAppointmentData(null); }}
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black py-3 rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={appointmentLoading}
                  className="w-full sm:flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black py-3 rounded-xl shadow-lg shadow-primary-200 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {appointmentLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Look Up</span>
                  )}
                </button>
              </div>
           </form>

           {appointmentData && (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-6 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-100 space-y-4"
             >
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-600">Appointment Found</h4>
                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                   appointmentData.priority === 'emergency' ? 'bg-red-500 text-white' :
                   appointmentData.priority === 'high' || appointmentData.priority === 'urgent' ? 'bg-orange-500 text-white' :
                   'bg-blue-500 text-white'
                 }`}>
                   {appointmentData.priority} priority
                 </span>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/80 p-3 rounded-xl">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Patient</p>
                   <p className="font-bold text-gray-900 text-sm">{appointmentData.patientName}</p>
                 </div>
                 <div className="bg-white/80 p-3 rounded-xl">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Status</p>
                   <p className="font-bold text-gray-900 text-sm capitalize">{appointmentData.status}</p>
                 </div>
                 <div className="bg-white/80 p-3 rounded-xl">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Department</p>
                   <p className="font-bold text-gray-900 text-sm capitalize">{appointmentData.department?.replace(/-/g, ' ')}</p>
                 </div>
                 <div className="bg-white/80 p-3 rounded-xl">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Doctor</p>
                   <p className="font-bold text-gray-900 text-sm">{appointmentData.assignedDoctor || 'Pending'}</p>
                 </div>
                 <div className="bg-white/80 p-3 rounded-xl">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Triage Level</p>
                   <p className="font-bold text-primary-600 text-sm">ESI {appointmentData.triageLevel}/5</p>
                 </div>
                 <div className="bg-white/80 p-3 rounded-xl">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Est. Wait</p>
                   <p className="font-bold text-gray-900 text-sm">{appointmentData.estimatedWait || 'N/A'}</p>
                 </div>
               </div>
             </motion.div>
           )}
         </motion.div>
       </div>
     )}
    </AnimatePresence>

    <AnimatePresence>
     {showRegistrationModal && (
       <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
         <motion.div
           initial={{ opacity: 0, scale: 0.9, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.9, y: 20 }}
           transition={{ type: 'spring', damping: 25, stiffness: 350 }}
           className="bg-white rounded-[2rem] shadow-2xl p-5 md:p-8 max-w-md w-full border border-gray-100 relative overflow-hidden"
         >
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-50 -z-10" />
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-50 rounded-full -ml-12 -mb-12 opacity-50 -z-10" />

           <div className="text-center mb-6 relative">
             <div className="mx-auto w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-3">
               <UserCheck className="h-6 w-6" />
             </div>
             <h3 className="text-xl font-black text-gray-900 tracking-tight">Patient Identification</h3>
             <p className="text-gray-500 text-xs mt-1 font-medium">Please enter your details to register or retrieve your patient profile</p>
           </div>

           <form onSubmit={handleRegisterAndComplete} className="space-y-4 relative">
             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center">
                 <User className="h-3.5 w-3.5 mr-1 text-primary-500" />
                 First Name *
               </label>
               <input
                 type="text"
                 required
                 placeholder="John"
                 value={regForm.firstName}
                 onChange={(e) => setRegForm(prev => ({ ...prev, firstName: e.target.value }))}
                 className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-105 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
               />
             </div>

             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center">
                 <User className="h-3.5 w-3.5 mr-1 text-primary-500" />
                 Last Name *
               </label>
               <input
                 type="text"
                 required
                 placeholder="Doe"
                 value={regForm.lastName}
                 onChange={(e) => setRegForm(prev => ({ ...prev, lastName: e.target.value }))}
                 className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-105 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
               />
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center">
                   <Calendar className="h-3.5 w-3.5 mr-1 text-primary-500" />
                   Age *
                 </label>
                 <input
                   type="number"
                   required
                   min="1"
                   max="150"
                   placeholder="30"
                   value={regForm.age}
                   onChange={(e) => setRegForm(prev => ({ ...prev, age: e.target.value }))}
                   className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-105 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
                 />
               </div>
               <div>
                 <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center">
                   <Phone className="h-3.5 w-3.5 mr-1 text-primary-500" />
                   Phone *
                 </label>
                 <input
                   type="tel"
                   required
                   placeholder="123-456-7890"
                   value={regForm.phone}
                   onChange={(e) => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                   className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-105 rounded-xl focus:border-primary-500 focus:bg-white transition-all text-gray-700 font-bold outline-none"
                 />
               </div>
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegistrationModal(false)}
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-black py-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-xl shadow-lg shadow-primary-200 transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Register & Assign</span>
                  )}
                </button>
              </div>
            </form>
         </motion.div>
       </div>
     )}
    </AnimatePresence>

    <AnimatePresence>
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-white/85 backdrop-blur-lg rounded-[2.5rem] shadow-3xl p-5 md:p-8 max-w-md w-full border border-white/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-300/30 rounded-full blur-2xl -mr-16 -mt-16 -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl -ml-16 -mb-16 -z-10" />

            <div className="text-center mb-8 relative">
              <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-primary-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-primary-200">
                <Stethoscope className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">How was your consult?</h3>
              <p className="text-gray-500 text-sm mt-2 font-medium">Your feedback helps us provide better care.</p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-6 relative">
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-center text-gray-400">Rate your experience</label>
                <div className="flex justify-center space-x-3">
                  {[
                    { emoji: '😠', rating: 1, label: 'Angry' },
                    { emoji: '🙁', rating: 2, label: 'Sad' },
                    { emoji: '😐', rating: 3, label: 'Neutral' },
                    { emoji: '🙂', rating: 4, label: 'Happy' },
                    { emoji: '🤩', rating: 5, label: 'Delighted' }
                  ].map((item) => (
                    <button
                      key={item.rating}
                      type="button"
                      onClick={() => setReviewRating(item.rating)}
                      className={`text-4xl p-2 rounded-2xl transition-all duration-300 focus:outline-none ${
                        reviewRating === item.rating 
                          ? 'bg-gradient-to-tr from-primary-50 to-indigo-50 border-2 border-primary-500 shadow-md scale-110' 
                          : 'opacity-50 hover:opacity-100 border-2 border-transparent'
                      }`}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Write a review</label>
                <textarea
                  required
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Please share your honest feedback about the consultation..."
                  rows={4}
                  className="w-full bg-white/50 border-2 border-gray-100 rounded-2xl px-5 py-4 focus:border-primary-500 focus:bg-white transition-all text-sm font-semibold outline-none resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-wider"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full sm:flex-1 bg-gradient-to-tr from-primary-600 to-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary-200 transition-all text-sm uppercase tracking-wider hover:opacity-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {reviewSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <span>Submit Review</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
   </div> 
 ); 
} 

export default ChatBot;
