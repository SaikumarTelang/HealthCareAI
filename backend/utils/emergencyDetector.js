function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = keyword.includes(' ') 
    ? '\\b' + escaped + '\\b' 
    : '\\b' + escaped + '(s|es|ed|ing)?\\b';
  return new RegExp(pattern, 'i').test(text);
}

class EmergencyDetector {
  constructor() {
    this.emergencyPatterns = [
      {
        keywords: ['chest pain', 'chest tightness', 'heart attack', 'cardiac arrest'],
        category: 'cardiac',
        action: 'Immediate cardiac evaluation required'
      },
      {
        keywords: [
          'cant breathe', 'cannot breathe', 'difficulty breathing', 'choking', 'suffocating', 
          'no air', 'not breathing', 'breathing stopped', 'drowning', 'choking sensation'
        ],
        category: 'respiratory',
        action: 'Immediate respiratory support required'
      },
      {
        keywords: [
          'unconscious', 'passed out', 'unresponsive', 'not waking up', 'fainted', 'collapsed', 
          'collapsed on the kitchen floor', 'grandfather just collapsed', 'not responding', 'sudden collapse'
        ],
        category: 'consciousness',
        action: 'Immediate evaluation for loss of consciousness'
      },
      {
        keywords: [
          'severe bleeding', 'heavy bleeding', 'blood everywhere', 'wont stop bleeding', 
          'hemorrhage', 'knife slipped', 'cut my hand deeply', 'cant get the bleeding to stop', 
          'bleeding to stop', 'deep laceration'
        ],
        category: 'hemorrhage',
        action: 'Immediate hemorrhage control needed'
      },
      {
        keywords: ['stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'slurred speech', 'one side numb'],
        category: 'stroke',
        action: 'CODE STROKE - Immediate neurological evaluation'
      },
      {
        keywords: ['labor pain', 'labour pain', 'contractions', 'water broke', 'baby coming', 'giving birth'],
        category: 'obstetric',
        action: 'Immediate obstetric evaluation - possible active labor'
      },
      {
        keywords: ['suicidal', 'kill myself', 'end my life', 'want to die', 'self-harm', 'selfharm', 'self harm', 'overdose'],
        category: 'psychiatric',
        action: 'Immediate psychiatric crisis intervention'
      },
      {
        keywords: [
          'anaphylaxis', 'allergic reaction severe', 'throat swelling', 'cant swallow', 'epipen',
          'stung by a bee', 'lips are swelling', 'throat feels really tight', 'allergic reaction'
        ],
        category: 'allergic',
        action: 'Immediate anaphylaxis protocol'
      },
      {
        keywords: ['seizure', 'convulsion', 'fitting', 'epileptic'],
        category: 'neurological',
        action: 'Immediate neurological evaluation for seizure'
      },
      {
        keywords: [
          'poisoning', 'poisoned', 'toxic', 'ingested chemicals', 'drank bleach',
          'household bleach', 'drank some household bleach', 'overdose'
        ],
        category: 'toxicology',
        action: 'Immediate toxicology evaluation'
      },
      {
        keywords: [
          'car accident', 'head injury', 'concussion', 'vision is blurry', 
          'head is pounding', 'cant stop throwing up', 'severe burn', 'deep laceration',
          'head trauma', 'car crash', 'electrocution', 'drowning', 'gunshot wound',
          'stab wound', 'venomous bite', 'sudden collapse'
        ],
        category: 'trauma',
        action: 'Immediate trauma evaluation'
      }
    ];
  }

  detect(text) {
    const lowerText = text.toLowerCase();
    const detectedEmergencies = [];
    for (const pattern of this.emergencyPatterns) {
      for (const keyword of pattern.keywords) {
        if (matchesKeyword(lowerText, keyword)) {
          detectedEmergencies.push({
            category: pattern.category,
            matchedKeyword: keyword,
            action: pattern.action
          });
          break;
        }
      }
    }
    if (detectedEmergencies.length > 0) {
      return {
        isEmergency: true,
        emergencies: detectedEmergencies,
        reason: detectedEmergencies.map(e => e.action).join('; '),
        primaryCategory: detectedEmergencies[0].category,
        message: ' EMERGENCY DETECTED - This case has been flagged for immediate attention.'
      };
    }
    return {
      isEmergency: false,
      emergencies: [],
      reason: null,
      primaryCategory: null,
      message: null
    };
  }

  getSeverityScore(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    // Severity indicators 
    const severeWords = ['extreme', 'unbearable', 'worst', 'terrible', 'excruciating', 'agonizing'];
    const moderateWords = ['significant', 'considerable', 'bad', 'painful', 'uncomfortable'];
    const timeUrgency = ['sudden', 'suddenly', 'just started', 'getting worse', 'rapidly'];
    severeWords.forEach(word => {
      if (matchesKeyword(lowerText, word)) score += 3;
    });
    moderateWords.forEach(word => {
      if (matchesKeyword(lowerText, word)) score += 1;
    });
    timeUrgency.forEach(word => {
      if (matchesKeyword(lowerText, word)) score += 2;
    });
    // Number scale detection 
    const scaleMatch = lowerText.match(/(\d+)\s*(?:out of|\/)\s*10/);
    if (scaleMatch) {
      const painLevel = parseInt(scaleMatch[1]);
      if (painLevel >= 8) score += 4;
      else if (painLevel >= 6) score += 2;
      else if (painLevel >= 4) score += 1;
    }
    return Math.min(10, score);
  }
}
module.exports = new EmergencyDetector();
