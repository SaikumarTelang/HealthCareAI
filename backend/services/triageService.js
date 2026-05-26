const emergencyDetector = require('../utils/emergencyDetector');

class TriageService {
  assessPriority(symptoms, analysisResult) {
    // Check for emergency first 
    const emergencyCheck = emergencyDetector.detect(
      symptoms.map(s => s.name || s).join(' ')
    );

    if (emergencyCheck.isEmergency) {
      return {
        triageLevel: 1,
        priority: 'emergency',
        isEmergency: true,
        reason: emergencyCheck.reason
      };
    }

    // Use AI analysis result if available 
    if (analysisResult?.severity === 'Critical' || analysisResult?.urgencyLevel === 'emergency') {
      return {
        triageLevel: 1,
        priority: 'emergency',
        isEmergency: true,
        reason: analysisResult?.reason || 'AI analysis indicates critical emergency'
      };
    }

    if (analysisResult?.severity === 'High' || analysisResult?.urgencyLevel === 'urgent') {
      return {
        triageLevel: 2,
        priority: 'urgent',
        isEmergency: false,
        reason: analysisResult?.reason || 'Urgent care needed'
      };
    }

    if (analysisResult?.severity === 'Medium' || analysisResult?.urgencyLevel === 'semi-urgent') {
      return {
        triageLevel: 3,
        priority: 'semi-urgent',
        isEmergency: false,
        reason: analysisResult?.reason || 'Moderate severity'
      };
    }

    if (analysisResult?.severity === 'Low' || analysisResult?.urgencyLevel === 'non-urgent') {
      return {
        triageLevel: 4,
        priority: 'non-urgent',
        isEmergency: false,
        reason: analysisResult?.reason || 'Low severity'
      };
    }

    // Score-based assessment 
    const score = this.calculateTriageScore(symptoms);
    if (score >= 8) {
      return {
        triageLevel: 2,
        priority: 'urgent',
        isEmergency: false,
        reason: 'High severity score'
      };
    } else if (score >= 5) {
      return {
        triageLevel: 3,
        priority: 'semi-urgent',
        isEmergency: false,
        reason: 'Moderate severity'
      };
    } else {
      return {
        triageLevel: 4,
        priority: 'non-urgent',
        isEmergency: false,
        reason: 'Low severity'
      };
    }
  }

  calculateTriageScore(symptoms) {
    let score = 0;
    const severityScores = { mild: 1, moderate: 3, severe: 6, critical: 10 };
    symptoms.forEach(symptom => {
      if (typeof symptom === 'object') {
        score += severityScores[symptom.severity] || 2;
      } else {
        score += 2;
      }
    });
    // Normalize to 1-10 
    return Math.min(10, score);
  }

  getRecommendedWaitTime(priority) {
    const waitTimes = {
      'emergency': 'Immediate',
      'urgent': '10-15 minutes',
      'semi-urgent': '30-60 minutes',
      'non-urgent': '1-2 hours'
    };
    return waitTimes[priority] || '1-2 hours';
  }
}

module.exports = new TriageService();
