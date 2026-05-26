class HandoffGenerator {
  generate(intake, patient, conversation) {
    const timestamp = new Date().toISOString();

    const handoff = `
 ══════════════════════════════════════════════════════════════
  CLINICIAN HANDOFF NOTES
 ══════════════════════════════════════════════════════════════
 Generated: ${timestamp}
 Priority: ${intake.priority?.toUpperCase()}
 ${intake.isEmergency ? ' *** EMERGENCY CASE ***' : ''}
 ──────────────────────────────────────────────────────────────
 S - SITUATION
 ──────────────────────────────────────────────────────────────
 Patient: ${patient?.firstName || 'Unknown'} ${patient?.lastName || 'Unknown'}
 DOB: ${patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not provided'}
 Chief Complaint: ${intake.chiefComplaint || 'See symptoms below'}
 Triage Level: ${intake.triageLevel} (${intake.priority})
 Department: ${intake.department}
 ──────────────────────────────────────────────────────────────
 B - BACKGROUND
 ──────────────────────────────────────────────────────────────
 Reported Symptoms:
 ${intake.symptoms?.map(s => ` • ${s.name || s} ${s.severity ? `(Severity: ${s.severity})` : ''} ${s.duration ? `- Duration: ${s.duration}` : ''}`).join('\n') || ' No symptoms recorded'}
 Medical History:
  Allergies: ${patient?.medicalHistory?.allergies?.join(', ') || 'None reported'}
  Current Medications:
 ${patient?.medicalHistory?.currentMedications?.join(', ') || 'None reported'}
  Past Conditions: ${patient?.medicalHistory?.pastConditions?.join(', ') || 'None reported'}
 ──────────────────────────────────────────────────────────────
 A - ASSESSMENT
 ──────────────────────────────────────────────────────────────
 Possible Conditions:
 ${intake.possibleConditions?.map(c => ` • ${c}`).join('\n') || ' Pending clinical evaluation'}
 AI Confidence: Preliminary assessment - requires clinical verification
 ──────────────────────────────────────────────────────────────
 R - RECOMMENDATION
 ──────────────────────────────────────────────────────────────
 Recommended Actions:
 ${intake.recommendedActions?.map(a => ` • ${a}`).join('\n') || ' Standard clinical evaluation'}
 Additional Notes:
 ${intake.patientResponses ? this.formatResponses(intake.patientResponses) : ' No additional responses recorded'}
 ══════════════════════════════════════════════════════════════
 DISCLAIMER: AI-assisted triage - all assessments require
 clinician verification. This is not a diagnosis.
 ══════════════════════════════════════════════════════════════
  `.trim();
    return handoff;
  }

  formatResponses(responses) {
    if (typeof responses === 'string') return ` ${responses}`;
    if (typeof responses === 'object') {
      return Object.entries(responses)
        .map(([q, a]) => ` Q: ${q}\n A: ${a}`)
        .join('\n');
    }
    return ' No additional responses';
  }
}
module.exports = new HandoffGenerator();
