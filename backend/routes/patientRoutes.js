const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');
const connectDB = require('../config/db');

// Register new patient
router.post('/register', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      email,
      phone,
      address,
      emergencyContact,
      insurance,
      medicalHistory
    } = req.body;

    const patientId = 'PAT-' + uuidv4().slice(0, 8).toUpperCase();
    
    const patientData = {
      patientId,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      email,
      phone,
      address,
      emergencyContact,
      insurance,
      medicalHistory,
      registeredAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('patients').doc(patientId).set(patientData);

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient: {
        patientId: patientData.patientId,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        registeredAt: patientData.registeredAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Get patient by ID
router.get('/:patientId', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const patientDoc = await db.collection('patients').doc(req.params.patientId).get();
    
    if (!patientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient: patientDoc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update patient
router.put('/:patientId', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // If dateOfBirth is being updated, ensure it's a Date object
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateData.dateOfBirth);
    }

    const patientRef = db.collection('patients').doc(req.params.patientId);
    const patientDoc = await patientRef.get();

    if (!patientDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    await patientRef.update(updateData);
    
    res.json({
      success: true,
      message: 'Patient updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Natural language registration
router.post('/register-natural', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const { text } = req.body;

    // Parse natural language input
    const parsed = parseNaturalLanguageRegistration(text);

    const patientId = 'PAT-' + uuidv4().slice(0, 8).toUpperCase();

    const patientData = {
      patientId,
      ...parsed,
      registeredAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('patients').doc(patientId).set(patientData);

    res.status(201).json({
      success: true,
      message: 'Patient registered via natural language',
      patient: {
        patientId: patientData.patientId,
        firstName: patientData.firstName,
        lastName: patientData.lastName
      },
      parsed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

function parseNaturalLanguageRegistration(text) {
  const result = {
    firstName: '',
    lastName: '',
    dateOfBirth: new Date(),
    gender: 'prefer-not-to-say'
  };
  
  // Name patterns
  const nameMatch = text.match(/(?:my name is|i am|i'm|name:?)\s+([a-zA-Z]+)\s+([a-zA-Z]+)/i);
  if (nameMatch) {
    result.firstName = nameMatch[1];
    result.lastName = nameMatch[2];
  }
  
  // Age/DOB patterns
  const ageMatch = text.match(/(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|yo)/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    result.dateOfBirth = dob;
  }
  
  // Gender patterns
  if (text.match(/\b(male|man|boy)\b/i)) result.gender = 'male';
  else if (text.match(/\b(female|woman|girl)\b/i)) result.gender = 'female';
  
  // Phone pattern
  const phoneMatch = text.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
  if (phoneMatch) result.phone = phoneMatch[1];
  
  // Email pattern
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) result.email = emailMatch[0];
  
  return result;
}

// Lookup or register patient by Name and Phone
router.post('/lookup-or-register', async (req, res) => {
  try {
    const db = await connectDB();
    if (!db) throw new Error("Database not connected");

    const { firstName, lastName, phone, age } = req.body;
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and phone number are required'
      });
    }

    // Search by phone in database
    const patientDocs = await db.collection('patients').where('phone', '==', phone).get();
    let matchedPatient = null;

    patientDocs.forEach(doc => {
      const data = doc.data();
      if (
        data.firstName?.trim().toLowerCase() === firstName.trim().toLowerCase() &&
        data.lastName?.trim().toLowerCase() === lastName.trim().toLowerCase()
      ) {
        matchedPatient = data;
      }
    });

    if (matchedPatient) {
      return res.json({
        success: true,
        message: 'Existing patient found',
        patient: matchedPatient
      });
    }

    // Create new patient
    const patientId = 'PAT-' + uuidv4().slice(0, 8).toUpperCase();
    
    // Estimate date of birth from age
    let dateOfBirth = null;
    if (age) {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - parseInt(age));
      dateOfBirth = dob;
    }

    const patientData = {
      patientId,
      firstName,
      lastName,
      dateOfBirth,
      phone,
      age: parseInt(age) || null,
      registeredAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('patients').doc(patientId).set(patientData);

    res.status(201).json({
      success: true,
      message: 'New patient registered successfully',
      patient: patientData
    });
  } catch (error) {
    console.error('Lookup/register error:', error);
    res.status(500).json({
      success: false,
      message: 'Lookup or registration failed',
      error: error.message
    });
  }
});

module.exports = router;
