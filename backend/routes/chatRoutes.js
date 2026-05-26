const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const symptomAnalyzer = require('../services/symptomAnalyzer');
const triageService = require('../services/triageService');
const departmentRouter = require('../services/departmentRouter');
const emergencyDetector = require('../utils/emergencyDetector');
const connectDB = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Start new conversation
router.post('/start', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const { patientId } = req.body;
    const sessionId = 'SES-' + uuidv4().slice(0, 8).toUpperCase();
    
    const welcomeMessage = {
      role: 'assistant',
      content: "Hello! I'm your healthcare intake assistant. I'm here to help understand your symptoms and guide you to the right care. Please describe what you're experiencing today, and I'll ask some follow-up questions to better assist you.\n\nYou can describe your symptoms in your own words - for example, 'I have a headache and feel dizzy' or 'My stomach has been hurting for 2 days'.",
      timestamp: new Date()
    };

    const conversationData = {
      patientId: patientId || 'anonymous',
      sessionId,
      messages: [welcomeMessage],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const intakeData = {
      patientId: patientId || 'anonymous',
      sessionId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('conversations').doc(sessionId).set(conversationData);
    await db.collection('intakes').doc(sessionId).set(intakeData);

    res.json({
      success: true,
      sessionId,
      message: welcomeMessage
    });
  } catch (error) {
    console.error('Start Session Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send message
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const convRef = db.collection('conversations').doc(sessionId);
    let convDoc = await convRef.get();
    
    // Auto-restore session if wiped by a server restart (e.g. MockDB reset)
    if (!convDoc.exists) {
      await convRef.set({
        patientId: 'anonymous',
        sessionId,
        messages: [{ role: 'assistant', content: 'Session restored.', timestamp: new Date() }],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await db.collection('intakes').doc(sessionId).set({
        patientId: 'anonymous',
        sessionId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      convDoc = await convRef.get();
    }

    const conversation = convDoc.data();
    
    // Add user message
    const userMsg = { role: 'user', content: message, timestamp: new Date() };
    await convRef.update({
      messages: db.FieldValue.arrayUnion(userMsg),
      updatedAt: new Date()
    });

    // Security Layer: Prompt Injection Detection
    const securityCheck = aiService.detectPromptInjection(message);
    if (securityCheck.isAttack) {
      console.warn('Security Alert: Blocked potential prompt injection', securityCheck.matchedPatterns);
      return res.status(400).json({ 
        success: false, 
        message: 'Your message contains prohibited patterns. Please describe your symptoms naturally.' 
      });
    }

    // Guardrail: Health-related check
    const isHealthRelated = await aiService.isMedicalQuery(message);
    if (!isHealthRelated) {
      const guardrailResponse = {
        role: 'assistant',
        content: 'I am a medical assistant. Please ask questions related to medical problems or describe your symptoms.',
        timestamp: new Date()
      };
      await convRef.update({
        messages: db.FieldValue.arrayUnion(guardrailResponse),
        updatedAt: new Date()
      });
      return res.json({
        success: true,
        response: guardrailResponse,
        isEmergency: false,
        analysis: {} // Empty object prevents doctor modal but stops UI loading state
      });
    }

    // 1. Emergency Detection (Critical Safety Layer)
    const emergencyCheck = emergencyDetector.detect(message);

    if (emergencyCheck.isEmergency) {
      const emergencyResponse = {
        role: 'assistant',
        content: `**EMERGENCY DETECTED**\n\n${emergencyCheck.message}\n\nBased on what you've described, this requires immediate medical attention. I've flagged your case as **EMERGENCY PRIORITY**.\n\n**Please call 911 or go to your nearest emergency room immediately if you haven't already.**\n\nA medical team has been notified and will be prepared for your arrival.\n\nEmergency Category: ${emergencyCheck.primaryCategory}\nAction: ${emergencyCheck.reason}`,
        timestamp: new Date()
      };

      await convRef.update({
        messages: db.FieldValue.arrayUnion(emergencyResponse),
        status: 'escalated',
        updatedAt: new Date()
      });

      // Update intake for emergency
      const routingInfo = departmentRouter.route('emergency', 'emergency');
      const intakeUpdate = {
        isEmergency: true,
        priority: 'emergency',
        triageLevel: 1,
        department: routingInfo.department,
        departmentCode: routingInfo.departmentCode,
        assignedDoctor: routingInfo.assignedDoctor,
        status: 'escalated',
        chiefComplaint: message,
        updatedAt: new Date()
      };
      await db.collection('intakes').doc(sessionId).update(intakeUpdate);

      // Emit socket event for real-time notification
      const io = req.app.get('io');
      if (io) {
        io.to('clinicians').emit('emergency-alert', {
          sessionId,
          patientId: conversation.patientId,
          message: emergencyCheck.reason,
          category: emergencyCheck.primaryCategory,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        response: emergencyResponse,
        isEmergency: true,
        emergencyData: emergencyCheck,
        analysis: {
          categories: [emergencyCheck.primaryCategory || 'emergency'],
          urgency: 'emergency',
          department: routingInfo.departmentCode || 'emergency',
          severity: 'Critical',
          reason: emergencyCheck.reason,
          recommendedAction: 'Immediate medical evaluation'
        }
      });
    }

    // 2. Local analysis for context
    const localAnalysis = symptomAnalyzer.analyze(message);

    // 3. AI response using chat history
    const chatHistory = [...conversation.messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    const context = localAnalysis.matched 
      ? `Local analysis suggests categories: ${localAnalysis.categories.join(', ')}. Possible conditions: ${localAnalysis.possibleConditions.join(', ')}. Recommended department for clinical routing: ${localAnalysis.department}. Consider asking about: ${localAnalysis.relatedQuestions.join('; ')}`
      : '';

    let aiResponse = await aiService.chat(chatHistory, context);

    // If AI doesn't ask follow-up questions, append local ones
    if (localAnalysis.matched && !aiResponse.includes('?')) {
      aiResponse += '\n\nI also want to ask:\n' + 
        localAnalysis.relatedQuestions.slice(0, 2).map((q, i) => `${i + 1}. ${q}`).join('\n');
    }

    const assistantMsg = { role: 'assistant', content: aiResponse, timestamp: new Date() };
    await convRef.update({
      messages: db.FieldValue.arrayUnion(assistantMsg),
      updatedAt: new Date()
    });

    // Update intake with local insights
    if (localAnalysis.matched) {
      const intakeRef = db.collection('intakes').doc(sessionId);
      await intakeRef.update({
        chiefComplaint: conversation.messages.find(m => m.role === 'user')?.content || message,
        updatedAt: new Date()
      });
    }

    res.json({
      success: true,
      response: assistantMsg,
      isEmergency: false,
      analysis: {
        categories: localAnalysis.categories || [],
        urgency: localAnalysis.urgency,
        department: localAnalysis.department,
        severity: localAnalysis.severity, // Added
        reason: localAnalysis.reason, // Added
        recommendedAction: localAnalysis.recommended_action // Added
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const convDoc = await db.collection('conversations').doc(req.params.sessionId).get();
    if (!convDoc.exists) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, conversation: convDoc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete conversation and generate summary
router.post('/complete', async (req, res) => {
  try {
    const { sessionId, patientId } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const convRef = db.collection('conversations').doc(sessionId);
    const convDoc = await convRef.get();
    
    if (!convDoc.exists) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const conversation = convDoc.data();
    const convUpdate = { status: 'completed', updatedAt: new Date() };
    if (patientId) {
      convUpdate.patientId = patientId;
    }
    await convRef.update(convUpdate);

    // Get full symptom analysis from AI
    const allUserMessages = conversation.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('. ');

    // Multi-Step Clinical Pipeline
    // Step 1: Extraction
    const structuredIntake = await aiService.analyzeSymptoms(allUserMessages);
    
    // Step 2: Risk Assessment
    const riskAssessment = await aiService.analyzeRisk(structuredIntake);
    
    // Step 3: Handoff Generation
    const handoffNotes = await aiService.generateHandoffNotes(structuredIntake, riskAssessment);
    
    const historySummary = await aiService.summarizeHistory(allUserMessages);
    
    // Perform final triage and routing
    let triage = triageService.assessPriority(structuredIntake.symptoms || [], riskAssessment);
    let routingDept = structuredIntake.department || 'general-medicine';

    if (conversation.status === 'escalated') {
      triage = {
        triageLevel: 1,
        priority: 'emergency',
        isEmergency: true,
        reason: 'Emergency status preserved from escalated conversation'
      };
      routingDept = 'emergency';
    }

    const routing = departmentRouter.route(routingDept, triage.priority);

    const intakeUpdate = {
      status: 'pending',
      symptoms: structuredIntake.symptoms || [],
      triageLevel: triage.triageLevel,
      priority: triage.priority,
      isEmergency: triage.isEmergency || triage.priority === 'emergency',
      department: routing.department,
      departmentCode: routing.departmentCode,
      assignedDoctor: routing.assignedDoctor,
      estimatedWait: routing.estimatedWait,
      possibleConditions: structuredIntake.possibleConditions || [],
      historySummary: historySummary,
      handoffNotes: handoffNotes,
      riskAssessment: riskAssessment,
      updatedAt: new Date()
    };
    if (patientId) {
      intakeUpdate.patientId = patientId;
    }

    await db.collection('intakes').doc(sessionId).update(intakeUpdate);

    // Emit socket events for real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to('clinicians').emit('new-intake', {
        intakeId: sessionId,
        patientId: patientId || conversation.patientId,
        priority: triage.priority,
        isEmergency: triage.isEmergency,
        department: routing.department,
        chiefComplaint: allUserMessages.slice(0, 100) + '...',
        timestamp: new Date()
      });

      if (triage.isEmergency) {
        io.to('clinicians').emit('emergency-alert', {
          intakeId: sessionId,
          patientId: patientId || conversation.patientId,
          message: `EMERGENCY COMPLETE: ${allUserMessages.slice(0, 50)}`,
          department: routing.department,
          timestamp: new Date()
        });
      }
    }

    res.json({
      success: true,
      message: 'Conversation completed',
      analysis: structuredIntake,
      routing: routing,
      historySummary: historySummary,
      handoffNotes: handoffNotes,
      riskAssessment: riskAssessment
    });

  } catch (error) {
    console.error('Complete Session Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Standalone history summarization
router.post('/summarize-history', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history) return res.status(400).json({ success: false, message: 'History is required' });
    
    const summary = await aiService.summarizeHistory(history);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Notice of Privacy Practices (NPP)
router.get('/npp', async (req, res) => {
  res.json({
    title: "Notice of Privacy Practices (NPP)",
    content: "This notice describes how medical information about you may be used and disclosed... (Standard HIPAA NPP text)",
    last_updated: "2026-05-20"
  });
});

// Record patient electronic consent
router.post('/consent/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { consentType } = req.body;
    const { logEvent } = require('../utils/auditLogger');
    
    await logEvent("patient", `Gave ${consentType || "electronic_npp"} consent`, sessionId);
    
    res.json({ success: true, message: 'Consent recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Patient appointment status lookup
router.post('/appointment-status', async (req, res) => {
  try {
    const { patientId, firstName, lastName, phone } = req.body;
    const db = await connectDB();
    if (!db) throw new Error('Database not connected');
    
    let resolvedPatientId = patientId;
    
    // If no patientId, look up by name + phone
    if (!resolvedPatientId && firstName && lastName && phone) {
      const patientsSnapshot = await db.collection('patients').where('phone', '==', phone).get();
      patientsSnapshot.forEach(doc => {
        const data = doc.data();
        if (
          data.firstName?.trim().toLowerCase() === firstName.trim().toLowerCase() &&
          data.lastName?.trim().toLowerCase() === lastName.trim().toLowerCase()
        ) {
          resolvedPatientId = data.patientId;
        }
      });
    }
    
    if (!resolvedPatientId) {
      return res.status(404).json({ success: false, message: 'Patient not found. Please check your details.' });
    }
    
    // Find the latest intake for this patient
    const intakesSnapshot = await db.collection('intakes').where('patientId', '==', resolvedPatientId).get();
    let latestIntake = null;
    
    intakesSnapshot.forEach(doc => {
      const data = doc.data();
      if (!latestIntake || new Date(data.createdAt) > new Date(latestIntake.createdAt)) {
        latestIntake = { id: doc.id, ...data };
      }
    });
    
    if (!latestIntake) {
      return res.status(404).json({ success: false, message: 'No appointment found for this patient.' });
    }
    
    // Also get patient details
    const patientDoc = await db.collection('patients').doc(resolvedPatientId).get();
    const patientData = patientDoc.exists ? patientDoc.data() : null;
    
    res.json({
      success: true,
      appointment: {
        patientId: resolvedPatientId,
        patientName: patientData ? `${patientData.firstName} ${patientData.lastName}` : resolvedPatientId,
        status: latestIntake.status,
        department: latestIntake.department,
        assignedDoctor: latestIntake.assignedDoctor,
        priority: latestIntake.priority,
        triageLevel: latestIntake.triageLevel,
        estimatedWait: latestIntake.estimatedWait,
        createdAt: latestIntake.createdAt,
        chiefComplaint: latestIntake.chiefComplaint
      }
    });
  } catch (error) {
    console.error('Appointment status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit review for an appointment/session
router.post('/review/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, reviewText } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakeRef = db.collection('intakes').doc(sessionId);
    const intakeDoc = await intakeRef.get();
    
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    const intakeData = intakeDoc.data();
    const doctorName = intakeData.assignedDoctor || intakeData.clinicianAssigned || 'Unknown Doctor';

    const reviewData = {
      rating: Number(rating) || 5,
      reviewText: reviewText || '',
      doctorName,
      createdAt: new Date()
    };

    await intakeRef.update({
      review: reviewData,
      updatedAt: new Date()
    });

    // Also write to a global reviews collection for admin tracking
    const reviewId = 'REV-' + uuidv4().slice(0, 8).toUpperCase();
    await db.collection('reviews').doc(reviewId).set({
      reviewId,
      sessionId,
      patientId: intakeData.patientId,
      rating: Number(rating) || 5,
      reviewText: reviewText || '',
      doctorName,
      department: intakeData.department || 'General Medicine',
      createdAt: new Date()
    });

    // Log the review event in audit logs
    const { logEvent } = require('../utils/auditLogger');
    await logEvent(intakeData.patientId || 'patient', 'Submitted doctor review', sessionId, { rating, doctorName });

    res.json({ success: true, message: 'Review submitted successfully' });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
