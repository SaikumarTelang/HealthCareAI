const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db');
const departmentRouter = require('../services/departmentRouter');
const aiService = require('../services/aiService');
const { clinicianAuth } = require('../middleware/auth');

const getPriorityWeight = (intake) => {
  const p = (intake.priority || '').toLowerCase();
  const triage = parseInt(intake.triageLevel, 10);
  if (p === 'emergency' || triage === 1) return 1;
  if (p === 'high' || p === 'urgent' || triage === 2) return 2;
  if (p === 'medium' || p === 'semi-urgent' || triage === 3) return 3;
  if (p === 'low' || p === 'non-urgent' || triage === 4) return 4;
  return 5;
};

const parseDate = (d) => {
  if (!d) return new Date(0);
  if (typeof d.toDate === 'function') return d.toDate();
  if (d._seconds !== undefined) return new Date(d._seconds * 1000);
  if (d.seconds !== undefined) return new Date(d.seconds * 1000);
  return new Date(d);
};

const sortQueue = (a, b) => {
  const weightA = getPriorityWeight(a);
  const weightB = getPriorityWeight(b);
  if (weightA !== weightB) {
    return weightA - weightB;
  }
  const dateA = parseDate(a.createdAt);
  const dateB = parseDate(b.createdAt);
  return dateA.getTime() - dateB.getTime();
};

// Seed default doctor and admin
const seedDefaults = async () => {
  const db = await connectDB();
  const defaultAdmin = await db.collection('admins').doc('ADM-123456').get();
  if (!defaultAdmin.exists) {
    await db.collection('admins').doc('ADM-123456').set({
      adminId: 'ADM-123456',
      name: 'Administrator',
      department: 'all',
      registeredAt: new Date()
    });
  }

  // Seed all doctors from departmentRouter
  const crypto = require('crypto');
  const departments = departmentRouter.departments;
  for (const [deptCode, deptInfo] of Object.entries(departments)) {
    for (const docName of deptInfo.doctors) {
      let docId;
      if (docName === 'Dr. Peter Williams') {
        docId = 'DOC-75C721';
      } else {
        const hash = crypto.createHash('md5').update(docName).digest('hex').toUpperCase();
        docId = `DOC-${hash.substring(0, 6)}`;
      }

      const docRef = db.collection('doctors').doc(docId);
      const docSnapshot = await docRef.get();
      if (!docSnapshot.exists) {
        await docRef.set({
          doctorId: docId,
          name: docName,
          department: deptCode,
          phone: '000-000-0000',
          registeredAt: new Date()
        });
        console.log(`Seeded doctor: ${docName} (${docId}) in department ${deptCode}`);
      }
    }
  }
};
seedDefaults().catch(err => console.error('Seed defaults error:', err));

// Register a new doctor
router.post('/register-doctor', async (req, res) => {
  try {
    const { name, phone, department } = req.body;
    if (!name || !department) {
      return res.status(400).json({ success: false, message: 'Name and department are required' });
    }
    const db = await connectDB();
    if (!db) throw new Error('Database not connected');
    
    // Generate unique doctor ID
    const crypto = require('crypto');
    const doctorId = 'DOC-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    
    const doctorData = {
      doctorId,
      name,
      phone: phone || '',
      department,
      registeredAt: new Date()
    };
    
    await db.collection('doctors').doc(doctorId).set(doctorData);
    
    res.status(201).json({
      success: true,
      message: 'Doctor registered successfully',
      doctor: doctorData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Clinician login with unique ID
router.post('/login', async (req, res) => {
  try {
    const { username, department } = req.body;
    const db = await connectDB();
    if (!db) throw new Error('Database not connected');
    
    let role, name, loginDept, doctorId;
    
    if (username.startsWith('ADM-')) {
      // Admin login
      const adminDoc = await db.collection('admins').doc(username).get();
      if (!adminDoc.exists) {
        return res.status(401).json({ success: false, message: 'Invalid admin ID. Please check your credentials.' });
      }
      const adminData = adminDoc.data();
      role = 'admin';
      name = adminData.name || 'Administrator';
      loginDept = 'all';
      doctorId = username;
    } else if (username.startsWith('DOC-')) {
      // Doctor login
      const doctorDoc = await db.collection('doctors').doc(username).get();
      if (!doctorDoc.exists) {
        return res.status(401).json({ success: false, message: 'Invalid doctor ID. Please register first or check your credentials.' });
      }
      const doctorData = doctorDoc.data();
      role = 'clinician';
      name = doctorData.name;
      loginDept = department || doctorData.department;
      doctorId = username;
    } else {
      return res.status(400).json({ success: false, message: 'Username must start with DOC- or ADM-' });
    }
    
    const token = jwt.sign({ 
      id: username, 
      role, 
      department: loginDept,
      name,
      doctorId
    }, process.env.JWT_SECRET || 'dev-secret');

    res.json({
      success: true,
      token,
      clinician: {
        name,
        department: loginDept,
        role,
        doctorId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get clinician dashboard data
router.get('/dashboard', clinicianAuth, async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakesRef = db.collection('intakes');
    const { department, name, role } = req.user;
    
    // Fetch all active intakes once to use for building queues & department stats
    const activeIntakesSnapshot = await intakesRef
      .where('status', '!=', 'completed')
      .get();

    let activeIntakes = [];
    activeIntakesSnapshot.forEach(doc => activeIntakes.push({ id: doc.id, ...doc.data() }));

    // Non-admins (doctors) can only see their assigned patients
    if (role !== 'admin') {
      activeIntakes = activeIntakes.filter(intake => 
        intake.assignedDoctor === name || intake.clinicianAssigned === name
      );
    }

    // 1. Filter Emergencies (In department or assigned to me)
    let emergencies = activeIntakes.filter(intake => {
      const isEmerg = intake.isEmergency === true || (intake.priority || '').toLowerCase() === 'emergency';
      if (!isEmerg) return false;
      if (role === 'admin' && department && department !== 'all') {
        return intake.departmentCode === department;
      }
      return true;
    });
    emergencies.sort(sortQueue);

    // 2. Filter Urgent
    let urgent = activeIntakes.filter(intake => {
      const isUrgent = (intake.priority || '').toLowerCase() === 'urgent';
      if (!isUrgent) return false;
      if (role === 'admin' && department && department !== 'all') {
        return intake.departmentCode === department;
      }
      return true;
    });
    urgent.sort(sortQueue);

    // 3. Fetch My Queue (role-based)
    let myQueue = [...activeIntakes];
    myQueue.sort(sortQueue);

    // 4. Fetch Pending (Top 20 in department)
    let pending = activeIntakes.filter(intake => {
      const isPending = intake.status === 'pending';
      if (!isPending) return false;
      if (role === 'admin' && department && department !== 'all') {
        return intake.departmentCode === department;
      }
      return true;
    });
    pending.sort(sortQueue);
    pending = pending.slice(0, 20);

    // 5. Calculate Stats
    let totalPending = 0;
    if (role === 'admin') {
      let pendingQuery = intakesRef.where('status', '==', 'pending');
      if (department && department !== 'all') {
        pendingQuery = pendingQuery.where('departmentCode', '==', department);
      }
      const totalPendingCount = await pendingQuery.count().get();
      totalPending = totalPendingCount.data().count;
    } else {
      totalPending = activeIntakes.filter(intake => intake.status === 'pending').length;
    }
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    let totalToday = 0;
    if (role === 'admin') {
      const totalTodayCount = await intakesRef.where('createdAt', '>=', startOfToday).count().get();
      totalToday = totalTodayCount.data().count;
    } else {
      // Query today's intakes and filter by assigned doctor
      const todaySnapshot = await intakesRef.where('createdAt', '>=', startOfToday).get();
      todaySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.assignedDoctor === name || data.clinicianAssigned === name) {
          totalToday++;
        }
      });
    }

    // Group by department using our activeIntakes list
    const deptStats = {};
    activeIntakes.forEach(item => {
      const dept = item.department || 'General Medicine';
      deptStats[dept] = (deptStats[dept] || 0) + 1;
    });

    const stats = {
      totalPending: totalPending,
      totalEmergencies: emergencies.length,
      totalUrgent: urgent.length,
      totalToday: totalToday,
      totalMyQueue: myQueue.length,
      byDepartment: Object.entries(deptStats).map(([name, count]) => ({ _id: name, count }))
    };

    res.json({
      success: true,
      emergencies,
      urgent,
      pending,
      myQueue,
      stats,
      clinician: req.user
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get patient queue by department
router.get('/queue/:department', clinicianAuth, async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const queueSnapshot = await db.collection('intakes')
      .where('departmentCode', '==', req.params.department)
      .where('status', '!=', 'completed')
      .get();
    
    let queue = [];
    queueSnapshot.forEach(doc => queue.push({ id: doc.id, ...doc.data() }));

    if (req.user.role !== 'admin') {
      queue = queue.filter(intake => 
        intake.assignedDoctor === req.user.name || intake.clinicianAssigned === req.user.name
      );
    }
    
    queue.sort(sortQueue);

    res.json({ success: true, queue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept/assign patient
router.post('/accept/:intakeId', clinicianAuth, async (req, res) => {
  try {
    const { clinicianName } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    if (req.user.role !== 'admin' && clinicianName !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot assign to another doctor' });
    }

    const intakeRef = db.collection('intakes').doc(req.params.intakeId);
    const intakeDoc = await intakeRef.get();
    
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    const intake = intakeDoc.data();
    const updateData = {
      status: 'assigned',
      clinicianAssigned: clinicianName,
      assignedDoctor: clinicianName,
      updatedAt: new Date()
    };

    await intakeRef.update(updateData);

    // Notify patient via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`patient-${intake.patientId}`).emit('assigned', {
        clinician: clinicianName,
        department: intake.department,
        message: `You have been assigned to ${clinicianName}. They will see you shortly.`
      });
    }

    res.json({ success: true, intake: { id: req.params.intakeId, ...intake, ...updateData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate/refresh handoff notes
router.get('/handoff/:intakeId', clinicianAuth, async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakeRef = db.collection('intakes').doc(req.params.intakeId);
    const intakeDoc = await intakeRef.get();
    
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    const intake = intakeDoc.data();
    if (req.user.role !== 'admin' && intake.assignedDoctor !== req.user.name && intake.clinicianAssigned !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Forbidden: Patient not assigned to you' });
    }

    let handoffNotes = intake.handoffNotes;

    // Regenerate with AI if requested or missing
    if (!handoffNotes || req.query.refresh === 'true') {
      handoffNotes = await aiService.generateHandoffNotes(intake);
      await intakeRef.update({ handoffNotes, updatedAt: new Date() });
    }

    res.json({ success: true, handoffNotes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get department info
router.get('/departments', clinicianAuth, async (req, res) => {
  try {
    const departments = departmentRouter.getAllDepartments();
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Complete intake
router.post('/complete/:intakeId', clinicianAuth, async (req, res) => {
  try {
    const { notes, diagnosis } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakeRef = db.collection('intakes').doc(req.params.intakeId);
    const intakeDoc = await intakeRef.get();
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    const intake = intakeDoc.data();
    if (req.user.role !== 'admin' && intake.assignedDoctor !== req.user.name && intake.clinicianAssigned !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Forbidden: Patient not assigned to you' });
    }

    await intakeRef.update({
      status: 'completed',
      updatedAt: new Date(),
      recommendedActions: db.FieldValue.arrayUnion(notes || diagnosis)
    });

    const { logEvent } = require('../utils/auditLogger');
    await logEvent(req.user.name || req.user.id || 'clinician', 'Completed intake', req.params.intakeId, { notes, diagnosis });

    res.json({ success: true, message: 'Intake completed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify intake & edit details
router.post('/verify-intake/:sessionId', clinicianAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { priority, notes } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakeRef = db.collection('intakes').doc(sessionId);
    const intakeDoc = await intakeRef.get();
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    const previousData = intakeDoc.data();
    if (req.user.role !== 'admin' && previousData.assignedDoctor !== req.user.name && previousData.clinicianAssigned !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Forbidden: Patient not assigned to you' });
    }

    const updateData = {
      priority: priority.toLowerCase(),
      isEmergency: priority.toLowerCase() === 'emergency',
      clinicianNotes: notes,
      status: 'verified',
      updatedAt: new Date()
    };

    await intakeRef.update(updateData);

    const { logEvent } = require('../utils/auditLogger');
    await logEvent(
      req.user.name || req.user.id || 'clinician',
      'Verified intake details',
      sessionId,
      {
        previousPriority: previousData.priority,
        newPriority: priority.toLowerCase(),
        notes
      }
    );

    res.json({ success: true, message: 'Intake verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Consult specialized department doctor
router.post('/consult-doctor/:sessionId', clinicianAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { doctorName, department } = req.body;
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakeRef = db.collection('intakes').doc(sessionId);
    const intakeDoc = await intakeRef.get();
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake not found' });
    }

    const intake = intakeDoc.data();
    if (req.user.role !== 'admin' && intake.assignedDoctor !== req.user.name && intake.clinicianAssigned !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Forbidden: Patient not assigned to you' });
    }

    const updateData = {
      status: 'consulting',
      consultedDoctor: doctorName || 'Dr. Specialist',
      consultedDepartment: department || 'Specialty Medicine',
      updatedAt: new Date()
    };

    await intakeRef.update(updateData);

    const { logEvent } = require('../utils/auditLogger');
    await logEvent(
      req.user.name || req.user.id || 'clinician',
      `Requested consultation from ${doctorName || 'Specialist'} (${department || 'Specialty'})`,
      sessionId,
      { doctorName, department }
    );

    res.json({ success: true, message: 'Specialist consultation requested' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get clinician analytics metrics
router.get('/analytics', clinicianAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access restricted to administrators only' });
    }

    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const snapshot = await db.collection('intakes').get();
    const intakes = [];
    snapshot.forEach(doc => intakes.push({ id: doc.id, ...doc.data() }));

    const priorityCounts = { emergency: 0, high: 0, urgent: 0, medium: 0, low: 0 };
    const departmentCounts = {};
    let totalLatency = 0;
    let latencyCount = 0;

    intakes.forEach(item => {
      let p = (item.priority || 'medium').toLowerCase();
      if (p === 'urgent') priorityCounts.urgent++;
      else if (p === 'emergency') priorityCounts.emergency++;
      else if (p === 'high') priorityCounts.high++;
      else if (p === 'medium') priorityCounts.medium++;
      else if (p === 'low') priorityCounts.low++;

      const dept = item.department || 'General Medicine';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;

      if (item.riskAssessment && item.riskAssessment.latency_ms) {
        totalLatency += item.riskAssessment.latency_ms;
        latencyCount++;
      } else if (item.auditLogs) {
        item.auditLogs.forEach(logLine => {
          const match = logLine.match(/latency_ms":\s*(\d+(\.\d+)?)/);
          if (match) {
            totalLatency += parseFloat(match[1]);
            latencyCount++;
          }
        });
      }
    });

    const averageLatency = latencyCount > 0 ? parseFloat((totalLatency / latencyCount).toFixed(2)) : 1240;

    const { logEvent } = require('../utils/auditLogger');
    await logEvent(req.user.name || req.user.id || 'clinician', 'Viewed clinician analytics dashboard');

    res.json({
      success: true,
      analytics: {
        totalSessions: intakes.length,
        priorityDistribution: priorityCounts,
        departmentDistribution: Object.entries(departmentCounts).map(([name, count]) => ({ name, count })),
        averageAiLatencyMs: averageLatency
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get global audit logs for admin audit trails
router.get('/audit-logs', clinicianAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Access restricted to administrators only' });
    }

    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const snapshot = await db.collection('audit-logs').get();
    const logs = [];
    snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const { logEvent } = require('../utils/auditLogger');
    await logEvent(req.user.name || req.user.id || 'clinician', 'Accessed global audit logs');

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Generate and export a FHIR R4 Bundle
router.get('/fhir/:sessionId', clinicianAuth, async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const intakeDoc = await db.collection('intakes').doc(req.params.sessionId).get();
    if (!intakeDoc.exists) {
      return res.status(404).json({ success: false, message: 'Intake session not found' });
    }

    const intake = intakeDoc.data();
    if (req.user.role !== 'admin' && intake.assignedDoctor !== req.user.name && intake.clinicianAssigned !== req.user.name) {
      return res.status(403).json({ success: false, message: 'Forbidden: Patient not assigned to you' });
    }
    
    const fhirBundle = {
      resourceType: "Bundle",
      id: `bundle-${intake.sessionId}`,
      type: "collection",
      timestamp: new Date().toISOString(),
      entry: [
        {
          fullUrl: `urn:uuid:patient-${intake.patientId}`,
          resource: {
            resourceType: "Patient",
            id: intake.patientId,
            active: true,
            name: [
              {
                use: "official",
                text: intake.patientId
              }
            ]
          }
        },
        {
          fullUrl: `urn:uuid:encounter-${intake.sessionId}`,
          resource: {
            resourceType: "Encounter",
            id: intake.sessionId,
            status: "finished",
            class: {
              system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
              code: "EMER",
              display: "emergency"
            },
            subject: {
              reference: `Patient/${intake.patientId}`
            }
          }
        },
        {
          fullUrl: `urn:uuid:observation-triage-${intake.sessionId}`,
          resource: {
            resourceType: "Observation",
            id: `triage-${intake.sessionId}`,
            status: "final",
            category: [
              {
                coding: [
                  {
                    system: "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "exam",
                    display: "Exam"
                  }
                ]
              }
            ],
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "54505-3",
                  display: "Emergency severity index"
                }
              ],
              text: "Triage Priority Level"
            },
            subject: {
              reference: `Patient/${intake.patientId}`
            },
            valueString: intake.priority || "medium"
          }
        }
      ]
    };

    if (intake.patientId && intake.patientId !== 'anonymous') {
      const patientDoc = await db.collection('patients').doc(intake.patientId).get();
      if (patientDoc.exists) {
        const patientData = patientDoc.data();
        fhirBundle.entry[0].resource.name[0] = {
          use: "official",
          family: patientData.lastName,
          given: [patientData.firstName]
        };
        fhirBundle.entry[0].resource.telecom = [
          { system: "phone", value: patientData.phone },
          { system: "email", value: patientData.email }
        ];
        fhirBundle.entry[0].resource.gender = patientData.gender;
        fhirBundle.entry[0].resource.birthDate = patientData.date_of_birth || patientData.dateOfBirth;
      }
    }

    if (intake.chiefComplaint) {
      fhirBundle.entry.push({
        fullUrl: `urn:uuid:observation-complaint-${intake.sessionId}`,
        resource: {
          resourceType: "Observation",
          id: `complaint-${intake.sessionId}`,
          status: "final",
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: "10154-3",
                display: "Chief complaint Narrative - Reported"
              }
            ]
          },
          subject: {
            reference: `Patient/${intake.patientId}`
          },
          valueString: intake.chiefComplaint
        }
      });
    }

    const { logEvent } = require('../utils/auditLogger');
    await logEvent(req.user.name || req.user.id || 'clinician', 'Exported FHIR R4 Bundle', req.params.sessionId);

    res.json({ success: true, fhirBundle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
