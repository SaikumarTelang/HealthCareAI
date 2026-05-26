import React from 'react'; 
import { AlertTriangle, Phone } from 'lucide-react'; 
function EmergencyBanner({ data }) { 
 return ( 
 <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 
mb-4 animate-pulse"> 
 <div className="flex items-start space-x-3"> 
 <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 
mt-0.5" /> 
 <div> 
 <h3 className="text-red-800 font-bold text-lg"> Emergency 
Detected</h3> 
 <p className="text-red-700 mt-1"> 
 Your symptoms indicate a potentially serious condition. 
 Your case has been marked as <strong>EMERGENCY 
PRIORITY</strong>. 
 </p> 
 {data?.reason && ( 
 <p className="text-red-600 text-sm mt-2"> 
 Category: {data.primaryCategory} | {data.reason} 
 </p> 
 )} 
 <div className="mt-3 flex items-center space-x-2"> 
 <Phone className="h-4 w-4 text-red-600" /> 
 <span className="text-red-800 font-medium"> 
 If life-threatening, call 911 immediately 
 </span> 
 </div> 
 </div> 
 </div> 
 </div> 
 ); 
} 
export default EmergencyBanner; 
