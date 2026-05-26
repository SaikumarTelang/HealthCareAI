import React, { useEffect, useRef } from 'react'; 
import { Mic, MicOff } from 'lucide-react'; 
import toast from 'react-hot-toast'; 
function VoiceInput({ onResult, isListening, setIsListening }) { 
 const recognitionRef = useRef(null); 
 useEffect(() => { 
 if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in 
window) { 
 const SpeechRecognition = window.SpeechRecognition || 
window.webkitSpeechRecognition; 
 recognitionRef.current = new SpeechRecognition(); 
 recognitionRef.current.continuous = false; 
 recognitionRef.current.interimResults = false; 
 recognitionRef.current.lang = 'en-US'; 
 recognitionRef.current.onresult = (event) => { 
 const transcript = event.results[0][0].transcript; 
 onResult(transcript); 
 setIsListening(false); 
 }; 
 recognitionRef.current.onerror = (event) => { 
 console.error('Speech recognition error:', event.error); 
 setIsListening(false); 
 if (event.error === 'not-allowed') { 
 toast.error('Microphone access denied. Please enable it in browser settings.'); 
 } 
 }; 
 recognitionRef.current.onend = () => { 
 setIsListening(false); 
 }; 
 } 
 return () => { 
 if (recognitionRef.current) { 
 recognitionRef.current.abort(); 
 } 
 }; 
 }, []); 
 const toggleListening = () => { 
 if (!recognitionRef.current) { 
 toast.error('Speech recognition is not supported in your browser.'); 
 return; 
 } 
 if (isListening) { 
 recognitionRef.current.stop(); 
 setIsListening(false); 
 } else { 
 recognitionRef.current.start(); 
 setIsListening(true); 
 toast.success('Listening... Speak your symptoms', { duration: 
2000 }); 
 } 
 }; 
 return ( 
 <button 
 onClick={toggleListening} 
 className={`p-4 rounded-xl transition-colors ${ 
 isListening 
 ? 'bg-red-100 text-red-600 animate-pulse border-2 border-red-300' 
 : 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
 }`} 
 title={isListening ? 'Stop recording' : 'Start voice input'} 
 > 
 {isListening ? <MicOff className="h-5 w-5" /> : <Mic 
className="h-5 w-5" />} 
 </button> 
 ); 
} 
export default VoiceInput; 
