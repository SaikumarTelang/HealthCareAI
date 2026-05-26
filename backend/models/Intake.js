const mongoose = require('mongoose');

const intakeSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true
  },
  patient_info: {
    full_name: String,
    date_of_birth: String,
    gender: String,
    contact_number: String
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  symptoms: [{
    name: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'critical']
    },
    duration: String,
    location: String,
    related_issues: [String]
  }],
  vitalSigns: {
    temperature: String,
    bloodPressure: String,
    heartRate: String,
    respiratoryRate: String,
    oxygenSaturation: String
  },
  chiefComplaint: String,
  triageLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 4
  },
  priority: {
    type: String,
    enum: ['emergency', 'urgent', 'semi-urgent', 'non-urgent'],
    default: 'non-urgent'
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  department: {
    type: String,
    enum: [
      'emergency',
      'cardiology',
      'neurology',
      'orthopedics',
      'gastroenterology',
      'pulmonology',
      'obstetrics',
      'pediatrics',
      'psychiatry',
      'dermatology',
      'ophthalmology',
      'ent',
      'urology',
      'general-medicine',
      'oncology'
    ],
    default: 'general-medicine'
  },
  possibleConditions: [String],
  recommendedActions: [String],
  clarifyingQuestions: [String],
  patientResponses: mongoose.Schema.Types.Mixed,
  handoffNotes: String,
  clinicianAssigned: String,
  status: {
    type: String,
    enum: ['pending', 'in-review', 'assigned', 'completed'],
    default: 'pending'
  },
  // Clinical Governance & Verification (Integrated from previous version)
  is_clinician_verified: {
    type: Boolean,
    default: false
  },
  verified_by: String,
  verification_notes: String,
  validation_accuracy: Number,
  audit_logs: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

intakeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Intake', intakeSchema);
