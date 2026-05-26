import React from 'react'; 
import { usePatient } from '../context/PatientContext'; 
import { 
 CheckCircle, Clock, MapPin, User, AlertTriangle, 
 FileText, Activity, ArrowLeft, Printer, Info
} from 'lucide-react'; 

function IntakeSummary({ onBack }) { 
 const { patient, intakeData } = usePatient(); 

 if (!intakeData) { 
  return ( 
   <div className="card text-center py-16"> 
    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
     <Info className="h-8 w-8 text-gray-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No Intake Data Found</h3>
    <p className="text-gray-500 mb-6">We couldn't find your clinical assessment details.</p> 
    <button onClick={onBack} className="btn-secondary"> 
     <ArrowLeft className="h-4 w-4 inline mr-2" /> 
     Return to Assessment
    </button> 
   </div> 
  ); 
 } 

 const priorityColors = { 
  'emergency': 'bg-red-100 text-red-800 border-red-300', 
  'urgent': 'bg-orange-100 text-orange-800 border-orange-300', 
  'semi-urgent': 'bg-yellow-100 text-yellow-800 border-yellow-300', 
  'non-urgent': 'bg-green-100 text-green-800 border-green-300' 
 }; 

 const getPriorityStyles = (priority) => {
  return priorityColors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
 };

 const formatDept = (dept) => dept?.replace(/-/g, ' ') || 'General Medicine';

 const handlePrint = () => { 
  window.print(); 
 }; 

 return ( 
  <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4 sm:px-6 lg:px-8"> 
   {/* Header */} 
   <div className="card border-t-8 border-t-primary-600"> 
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"> 
     <div> 
      <h2 className="text-3xl font-black text-gray-900 tracking-tight">Intake Summary</h2> 
      <p className="text-gray-500 font-medium">Assessment processed & clinician notified</p> 
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400"> 
       <span className="flex items-center"><User className="h-3.5 w-3.5 mr-1.5" /> {patient?.firstName} {patient?.lastName}</span>
       <span className="flex items-center font-mono">ID: {patient?.patientId || 'GUEST'}</span>
       <span className="flex items-center"><Clock className="h-3.5 w-3.5 mr-1.5" /> {new Date().toLocaleTimeString()}</span>
      </div> 
     </div> 
     <div className="flex items-center space-x-3 self-start md:self-center"> 
      <button 
       onClick={handlePrint} 
       className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors shadow-sm" 
       title="Print Summary"
      > 
       <Printer className="h-5 w-5" /> 
      </button> 
      <div className="bg-green-100 p-3 rounded-full">
       <CheckCircle className="h-8 w-8 text-green-600" /> 
      </div>
     </div> 
    </div> 
   </div> 

   {/* Priority & Emergency Alert */} 
   {intakeData.isEmergency && ( 
    <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-6 shadow-lg shadow-red-100 animate-pulse"> 
     <div className="flex items-start space-x-4"> 
      <div className="bg-red-600 p-2 rounded-lg">
       <AlertTriangle className="h-8 w-8 text-white" /> 
      </div>
      <div> 
       <h3 className="text-2xl font-black text-red-900 uppercase tracking-wider">EMERGENCY PRIORITY</h3> 
       <p className="text-red-700 text-lg font-medium">A medical team has been alerted. You will be seen immediately.</p> 
       <p className="text-red-600 text-sm mt-2 font-bold italic">If you feel your condition is worsening, please speak to a staff member NOW.</p> 
      </div> 
     </div> 
    </div> 
   )} 

   {/* Vital Stats Grid */} 
   <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> 
    <div className={`rounded-2xl p-6 border-2 shadow-sm ${getPriorityStyles(intakeData.priority)}`}> 
     <Activity className="h-6 w-6 mb-3" /> 
     <p className="text-xs font-bold uppercase tracking-widest opacity-70">Priority Level</p> 
     <p className="text-2xl font-black capitalize mt-1">{intakeData.priority || 'Standard'}</p> 
     <p className="text-sm mt-2 font-medium">Triage Score: {intakeData.triageLevel || 'Calculated'}</p> 
    </div> 
 
    <div className="card border-2 border-gray-100 hover:border-primary-200 transition-colors"> 
     <Clock className="h-6 w-6 mb-3 text-primary-600" /> 
     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Estimated Wait</p> 
     <p className="text-2xl font-black text-primary-700 mt-1">{intakeData.estimatedWait || '15-30 min'}</p> 
     <p className="text-sm text-gray-500 mt-2 font-medium">Current Queue Load: Moderate</p>
    </div> 
 
    <div className="card border-2 border-gray-100 hover:border-primary-200 transition-colors"> 
     <MapPin className="h-6 w-6 mb-3 text-primary-600" /> 
     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Queue Position</p> 
     <p className="text-2xl font-black text-primary-700 mt-1">#{intakeData.queuePosition || '1'}</p> 
     <p className="text-sm text-gray-500 mt-2 font-medium">Check-in complete</p>
    </div> 
   </div> 

   {/* Assignment Details */} 
   <div className="card overflow-hidden"> 
    <div className="bg-gray-50 -mx-6 -mt-6 px-6 py-4 border-b border-gray-100 mb-6 flex items-center">
     <User className="h-5 w-5 mr-3 text-primary-600" /> 
     <h3 className="text-lg font-bold text-gray-900">Medical Assignment</h3> 
    </div>
    <div className="grid md:grid-cols-2 gap-8"> 
     <div className="space-y-1"> 
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assigned Department</p> 
      <p className="font-bold text-xl text-gray-900 capitalize">{formatDept(intakeData.department)}</p> 
      <p className="text-sm text-gray-500">Routing optimized by AI assessment</p>
     </div> 
     <div className="space-y-1"> 
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Attending Clinician</p> 
      <p className="font-bold text-xl text-gray-900">{intakeData.assignedDoctor || 'Clinician assignment in progress'}</p> 
      <p className="text-sm text-gray-500">Specialist notified of your arrival</p>
     </div> 
    </div> 
   </div> 

   {/* Preliminary Assessment */} 
   {intakeData.possibleConditions?.length > 0 && ( 
    <div className="card"> 
     <div className="flex items-center mb-6">
      <FileText className="h-5 w-5 mr-3 text-primary-600" /> 
      <h3 className="text-lg font-bold text-gray-900">AI Preliminary Insights</h3> 
     </div>
     <p className="text-sm text-gray-500 mb-4 font-medium"> 
      Based on your reported symptoms, our AI has identified the following areas for clinical focus: 
     </p> 
     <div className="flex flex-wrap gap-3"> 
      {intakeData.possibleConditions.map((condition, idx) => ( 
       <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm border border-blue-100 font-bold shadow-sm"> 
        {condition} 
       </span> 
      ))} 
     </div> 
     <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start"> 
      <Info className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-800 leading-relaxed"> 
       <strong>Important Medical Disclaimer:</strong> This is NOT a definitive diagnosis. These insights are provided to assist clinicians in prioritizing your care. A qualified healthcare professional will conduct a full physical examination and provide an accurate diagnosis. 
      </p> 
     </div> 
    </div> 
   )} 

   {/* Recommended Actions */} 
   {intakeData.recommendedActions?.length > 0 && ( 
    <div className="card bg-gray-50 border-dashed border-2 border-gray-200"> 
     <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended Immediate Actions</h3> 
     <ul className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
      {intakeData.recommendedActions.map((action, idx) => ( 
       <li key={idx} className="flex items-start space-x-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100"> 
        <div className="bg-green-100 p-1 rounded-full mt-0.5">
         <CheckCircle className="h-3.5 w-3.5 text-green-600" /> 
        </div>
        <span className="text-gray-700 text-sm font-medium">{action}</span> 
       </li> 
      ))} 
     </ul> 
    </div> 
   )} 

   {/* Handoff Notes Preview */} 
   {intakeData.handoffNotes && ( 
    <div className="card bg-gray-900 border-none shadow-2xl"> 
     <div className="flex items-center justify-between mb-4">
      <div className="flex items-center text-primary-400">
       <FileText className="h-5 w-5 mr-3" /> 
       <h3 className="text-lg font-bold">Clinical Handoff (SBAR)</h3> 
      </div>
      <span className="px-2 py-1 bg-gray-800 text-gray-500 rounded text-[10px] font-bold uppercase tracking-widest">Clinician Eyes Only</span>
     </div>
     <pre className="text-green-400/90 p-4 rounded-xl text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-gray-800 bg-gray-900/50"> 
      {intakeData.handoffNotes} 
     </pre> 
     <p className="mt-4 text-[11px] text-gray-500 italic text-center uppercase tracking-widest">Automated clinical documentation generated by Gemini AI</p>
    </div> 
   )} 

   {/* What's Next Steps */} 
   <div className="card bg-primary-900 text-white border-none shadow-xl shadow-primary-900/20"> 
    <h3 className="text-xl font-bold mb-8 text-primary-200">Next Steps in Your Care</h3> 
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative">
     {[
      { step: 1, title: 'Department Notification', desc: `Your record is now active in the ${formatDept(intakeData.department)} queue.` },
      { step: 2, title: 'Clinical Review', desc: 'A registered nurse or doctor is reviewing your AI-generated SBAR notes.' },
      { step: 3, title: 'Vitals & Triage', desc: 'You will be called shortly for initial vital sign measurement.' },
      { step: 4, title: 'Doctor Consultation', desc: 'Your attending physician will see you for a full clinical evaluation.' },
     ].map(({ step, title, desc }) => (
      <div key={step} className="flex space-x-4 relative">
       <div className="flex-shrink-0 w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-black text-sm shadow-lg">
        {step}
       </div>
       <div>
        <h4 className="font-bold text-white text-lg leading-tight mb-1">{title}</h4>
        <p className="text-primary-100/70 text-sm leading-relaxed">{desc}</p>
       </div>
      </div>
     ))}
    </div>
   </div> 

   {/* Footer Actions */} 
   <div className="text-center pt-4"> 
    <button onClick={onBack} className="btn-secondary px-8 py-3 text-lg rounded-2xl hover:bg-gray-100 transition-all border-2"> 
     <ArrowLeft className="h-5 w-5 inline mr-2" /> 
     Return to Assessment Chat
    </button> 
    <p className="mt-6 text-xs text-gray-400 font-medium uppercase tracking-widest">
     Confidential Medical Information • HealthFlow AI
    </p>
   </div> 
  </div> 
 ); 
} 

export default IntakeSummary; 
