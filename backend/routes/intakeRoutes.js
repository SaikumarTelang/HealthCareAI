const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const triageService = require('../services/triageService');
const departmentRouter = require('../services/departmentRouter');
const handoffGenerator = require('../utils/handoffGenerator');
const connectDB = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Create intake from conversation
router.post('/create', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const { patientId, sessionId, symptoms, chiefComplaint, patientResponses } = req.body;

    // 1. Analyze symptoms using AI
    const symptomsString = Array.isArray(symptoms) 
      ? symptoms.map(s => s.name || s).join(', ') 
      : symptoms;
    
    const analysis = await aiService.analyzeSymptoms(symptomsString);

    // 2. Assess priority using Triage Service
    const triage = triageService.assessPriority(symptoms, analysis);

    // 3. Route to department
    const departmentCode = analysis.recommendedDepartment || 'general-medicine';
    const routing = departmentRouter.route(departmentCode, triage.priority);

    // 4. Fetch Patient details for handoff
    let patientData = null;
    if (patientId && patientId !== 'anonymous') {
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (patientDoc.exists) {
        patientData = patientDoc.data();
      }
    }

    // 5. Build Intake Record
    const intakeId = sessionId; // Using sessionId as doc ID for consistency
    const intakeData = {
      intakeId,
      patientId: patientId || 'PAT-' + uuidv4().slice(0, 8).toUpperCase(),
      sessionId,
      symptoms: Array.isArray(symptoms) 
        ? symptoms.map(s => typeof s === 'string' ? { name: s, severity: 'moderate' } : s)
        : [{ name: symptoms, severity: 'moderate' }],
      chiefComplaint: chiefComplaint || symptomsString,
      triageLevel: triage.triageLevel,
      priority: triage.priority,
      isEmergency: triage.isEmergency,
      department: routing.department,
      departmentCode: routing.departmentCode,
      assignedDoctor: routing.assignedDoctor,
      estimatedWait: routing.estimatedWait,
      queuePosition: routing.queuePosition,
      possibleConditions: analysis.possibleConditions || [],
      recommendedActions: analysis.recommendedActions || [],
      clarifyingQuestions: analysis.followUpQuestions || [],
      patientResponses: patientResponses || {},
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 6. Generate professional handoff notes
    intakeData.handoffNotes = handoffGenerator.generate(intakeData, patientData, null);

    // 7. Save to Firestore
    await db.collection('intakes').doc(intakeId).set(intakeData);

    // 8. Real-time notification to clinicians via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('clinicians').emit('new-intake', {
        intakeId: intakeId,
        patientId: intakeData.patientId,
        priority: intakeData.priority,
        isEmergency: intakeData.isEmergency,
        department: intakeData.department,
        chiefComplaint: intakeData.chiefComplaint,
        timestamp: new Date()
      });

      if (intakeData.isEmergency) {
        io.to('clinicians').emit('emergency-alert', {
          intakeId: intakeId,
          patientId: intakeData.patientId,
          message: `EMERGENCY: ${intakeData.chiefComplaint}`,
          department: intakeData.department,
          timestamp: new Date()
        });
      }
    }

    res.status(201).json({
      success: true,
      intake: {
        id: intakeId,
        patientId: intakeData.patientId,
        triageLevel: intakeData.triageLevel,
        priority: intakeData.priority,
        isEmergency: intakeData.isEmergency,
        department: intakeData.department,
        assignedDoctor: intakeData.assignedDoctor,
        estimatedWait: intakeData.estimatedWait,
        queuePosition: intakeData.queuePosition,
        possibleConditions: intakeData.possibleConditions,
        recommendedActions: intakeData.recommendedActions,
        handoffNotes: intakeData.handoffNotes
      }
    });
  } catch (error) {
    console.error('Intake creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all intakes (for clinician dashboard) with filters
router.get('/all', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const { priority, department, status } = req.query;
    let query = db.collection('intakes');

    if (priority) query = query.where('priority', '==', priority);
    if (department) query = query.where('departmentCode', '==', department);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('isEmergency', 'desc').orderBy('triageLevel', 'asc').orderBy('createdAt', 'asc').limit(50).get();
    
    let intakes = [];
    snapshot.forEach(doc => intakes.push({ id: doc.id, ...doc.data() }));

    res.json({ success: true, intakes });
  } catch (error) {
    console.error('Get intakes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get specific intake
router.get('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const doc = await db.collection('intakes').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    res.json({ success: true, intake: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update intake status
router.patch('/:id/status', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const { status, clinicianAssigned } = req.body;
    const intakeRef = db.collection('intakes').doc(req.params.id);
    
    const updateData = { 
      status, 
      updatedAt: new Date() 
    };
    if (clinicianAssigned) updateData.clinicianAssigned = clinicianAssigned;

    await intakeRef.update(updateData);
    
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Quick symptom analysis endpoint
router.post('/analyze-symptoms', async (req, res) => {
  try {
    const { symptoms, patientHistory } = req.body;

    const analysis = await aiService.analyzeSymptoms(symptoms, patientHistory);
    const triage = triageService.assessPriority(
      [{ name: symptoms, severity: analysis.urgencyLevel === 'emergency' ? 'critical' : 'moderate' }],
      analysis
    );

    res.json({
      success: true,
      analysis: {
        ...analysis,
        triageLevel: triage.triageLevel,
        priority: triage.priority,
        isEmergency: triage.isEmergency,
        estimatedWait: triageService.getRecommendedWaitTime(triage.priority)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
