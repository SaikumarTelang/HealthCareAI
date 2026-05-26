import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
 Heart, Bot, Clock, Shield, ArrowRight, Activity, Users,
 Brain, Zap, CheckCircle, Phone, MessageCircle, Stethoscope,
 AlertTriangle, FileText, Globe, Lock, Mic, ChevronDown,
 ChevronUp, Star, TrendingUp, Layers, Monitor, Cpu
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

function Home() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
      {/* ========== HERO SECTION ========== */}
      <section className="text-center py-20 relative min-h-[80vh] flex flex-col justify-center">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-10 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl"
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-40 right-10 w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl"
          />
          <motion.div 
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-20 left-1/2 w-96 h-96 bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full mb-8 border border-primary-100 mx-auto"
        >
          <Cpu className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">AI-Powered Healthcare Intake</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black text-gray-900 mb-8 leading-tight tracking-tighter"
        >
          Smart Patient<br />
          <span className="bg-gradient-to-r from-primary-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Intake Agent
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-xl text-gray-500 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
        >
          Revolutionizing healthcare onboarding with intelligent symptom analysis,
          real-time emergency detection, and seamless clinician routing.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          <Link to="/patient" className="group relative bg-primary-600 text-white text-xl px-12 py-5 rounded-2xl font-black flex items-center space-x-3 shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all hover:-translate-y-1">
            <span>Start Intake Now</span>
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/doctor" className="bg-white border-2 border-gray-100 text-gray-900 text-xl px-12 py-5 rounded-2xl font-black flex items-center space-x-3 hover:bg-gray-50 transition-all hover:border-gray-200">
            <Stethoscope className="h-6 w-6" />
            <span>Clinician Dashboard</span>
          </Link>
        </motion.div>
      </section>

      {/* ========== SERVICES SECTION ========== */}
      <section className="py-32">
        <motion.div 
          {...fadeInUp}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Our Agentic Capabilities</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">
            A complete AI-driven ecosystem designed for clinical excellence.
          </p>
        </motion.div>

        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
        >
          {[
            { 
              icon: <MessageCircle className="text-blue-600" />, 
              title: "Natural Language", 
              desc: "Talk to our AI like a human. No forms, no complex menus — just natural conversation.",
              bg: "bg-blue-50"
            },
            { 
              icon: <Brain className="text-purple-600" />, 
              title: "Clinical Analysis", 
              desc: "Deep symptom analysis using Gemini 1.5 Flash to identify potential conditions and urgency.",
              bg: "bg-purple-50"
            },
            { 
              icon: <Zap className="text-green-600" />, 
              title: "Instant Triage", 
              desc: "Automated routing to 13+ specialized departments with zero manual intervention.",
              bg: "bg-green-50"
            },
            { 
              icon: <AlertTriangle className="text-red-600" />, 
              title: "Emergency Guard", 
              desc: "Real-time detection of life-threatening symptoms with immediate clinician escalation.",
              bg: "bg-red-50"
            },
            { 
              icon: <Users className="text-orange-600" />, 
              title: "Smart Routing", 
              desc: "Intelligent doctor assignment based on department availability and expertise.",
              bg: "bg-orange-50"
            },
            { 
              icon: <FileText className="text-indigo-600" />, 
              title: "SBAR Reporting", 
              desc: "Auto-generated clinical handoff notes ready for doctor review before you even meet.",
              bg: "bg-indigo-50"
            }
          ].map((service, idx) => (
            <motion.div 
              key={idx}
              variants={fadeInUp}
              whileHover={{ y: -10 }}
              className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 ${service.bg} rounded-2xl mb-8 group-hover:scale-110 transition-transform`}>
                {React.cloneElement(service.icon, { className: "h-8 w-8" })}
              </div>
              <h3 className="text-2xl font-black mb-4 text-gray-900 tracking-tight">{service.title}</h3>
              <p className="text-gray-500 leading-relaxed font-medium mb-6">
                {service.desc}
              </p>
              <div className="h-1.5 w-12 bg-gray-100 rounded-full group-hover:w-full group-hover:bg-primary-500 transition-all duration-500" />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ========== STEPS SECTION ========== */}
      <section className="py-32 bg-gray-900 rounded-[3rem] px-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-24 opacity-10 pointer-events-none">
          <Activity className="h-96 w-96 text-white" />
        </div>

        <motion.div {...fadeInUp} className="text-center mb-24 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">The Patient Journey</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-medium">Simplified, Intelligent, Faster.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-12 relative z-10">
          {[
            { step: 1, title: 'Register', color: 'bg-blue-500' },
            { step: 2, title: 'Chat', color: 'bg-purple-500' },
            { step: 3, title: 'Analysis', color: 'bg-indigo-500' },
            { step: 4, title: 'Triage', color: 'bg-orange-500' },
            { step: 5, title: 'Consult', color: 'bg-green-500' },
          ].map((item, idx) => (
            <motion.div 
              key={item.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15 }}
              className="text-center group"
            >
              <div className={`w-20 h-20 ${item.color} text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black/20 group-hover:scale-110 transition-transform`}>
                <span className="text-2xl font-black">{item.step}</span>
              </div>
              <h4 className="font-black text-xl mb-3 tracking-tight">{item.title}</h4>
              <p className="text-sm text-gray-500 font-medium">AI-guided step {item.step}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section className="py-32">
        <motion.div {...fadeInUp} className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight">Got Questions?</h2>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-6">
          {[
            {
              q: 'Is this a real AI doctor?',
              a: 'No, this is an AI Health Agent designed to gather clinical data and route you to the correct human specialist. It does not provide definitive medical diagnoses.'
            },
            {
              q: 'How safe is my data?',
              a: 'We use military-grade encryption and follow strict HIPAA guidelines. Your medical information is only accessible by your assigned clinical team.'
            },
            {
              q: 'What if it\'s an emergency?',
              a: 'Our AI is trained to recognize 20+ emergency markers. If detected, your case is instantly moved to the top of the clinician queue with a high-priority alert.'
            }
          ].map((faq, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between p-5 md:p-8 text-left bg-white border-2 border-gray-50 rounded-3xl hover:border-primary-200 transition-all shadow-sm"
              >
                <span className="text-xl font-black text-gray-900 tracking-tight">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openFaq === idx ? 180 : 0 }}
                  className="bg-gray-50 p-2 rounded-xl"
                >
                  <ChevronDown className="h-6 w-6 text-gray-400" />
                </motion.div>
              </button>
              <motion.div
                initial={false}
                animate={{ height: openFaq === idx ? "auto" : 0, opacity: openFaq === idx ? 1 : 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 md:p-8 bg-gray-50/50 rounded-b-3xl -mt-4 border-x-2 border-b-2 border-gray-50">
                  <p className="text-gray-600 text-lg leading-relaxed font-medium">{faq.a}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-32">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl md:rounded-[4rem] px-6 py-12 md:p-20 text-white text-center shadow-3xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black mb-8 tracking-tighter relative z-10">Experience the Future</h2>
          <p className="text-2xl text-primary-100 mb-12 max-w-2xl mx-auto font-medium relative z-10">
            Smart, fast, and clinically accurate patient intake is just a chat away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
            <Link to="/patient" className="bg-white text-primary-600 font-black px-12 py-6 rounded-[2rem] hover:shadow-2xl transition-all text-2xl hover:scale-105 active:scale-95">
              Launch Agent
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-20 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center space-x-3">
            <Heart className="h-10 w-10 text-primary-600" fill="currentColor" />
            <span className="text-3xl font-black text-gray-900 tracking-tighter">HealthFlow</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 text-gray-400 font-black uppercase tracking-widest text-xs">
            <Link to="/patient" className="hover:text-primary-600 transition-colors">Patient</Link>
            <Link to="/doctor" className="hover:text-primary-600 transition-colors">Clinician</Link>
            <span className="cursor-not-allowed opacity-30">Security</span>
          </div>
          <div className="text-gray-400 font-bold text-sm">
            © 2026 HEALTHFLOW PLATFORM
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
