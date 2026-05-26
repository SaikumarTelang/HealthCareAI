import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBot from '../components/ChatBot';
import IntakeSummary from '../components/IntakeSummary';
import { usePatient } from '../context/PatientContext';

function PatientPortal() {
  const { intakeData } = usePatient();
  const [showSummary, setShowSummary] = React.useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto py-12 px-4"
    >
      <AnimatePresence mode="wait">
        {!showSummary ? (
          <motion.div 
            key="chat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-4">
              <motion.h1 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-5xl font-black text-gray-900 tracking-tighter"
              >
                AI Health Agent
              </motion.h1>
              <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
                Describe your symptoms naturally. Our agent will analyze your health markers and assign the right specialist instantly.
              </p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[2.5rem] shadow-2xl shadow-primary-100/50 border border-primary-50 overflow-hidden"
            >
              <ChatBot onViewSummary={() => setShowSummary(true)} />
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
          >
            <IntakeSummary onBack={() => setShowSummary(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PatientPortal;
