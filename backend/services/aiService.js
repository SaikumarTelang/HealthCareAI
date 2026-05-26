const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

if (process.env.GOOGLE_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

const SYSTEM_PROMPT = `You are a cautious healthcare intake assistant working under clinical supervision. 
Your role is to help patients describe their symptoms clearly and collect structured medical information for clinical review.

Task:
1. Help patients describe their symptoms clearly.
2. Ask relevant follow-up questions to understand their condition better.
3. Classify the patient's urgency using the following labels: Low, Medium, High, Critical.
4. Collect structured medical information (SBAR/ESI ready).
5. When you have identified a likely department (provided in context), mention it to the patient and explain why you're recommending that specialist.

Rules:
- Do not diagnose conditions definitively. Use phrases like "This could potentially be..." or "Based on your symptoms, possible conditions include..."
- Do not prescribe medication or treatment.
- Always recommend consulting with a healthcare professional.
- If emergency symptoms are present (chest pain, difficulty breathing, severe bleeding, stroke symptoms, labor pain, loss of consciousness), recommend urgent clinician review and flag as Critical.
- If a "Recommended department" is provided in the context, your response should lean towards suggesting that specialist while still being empathetic.
- Ask one question at a time.
- Keep responses concise but thorough.

MANDATORY DISCLAIMER: Every response MUST begin or end with a statement that you are an AI assistant and NOT a substitute for professional medical advice.`;

const fs = require('fs');
const path = require('path');

let knowledgeBase = [];
try {
  const kbPath = path.join(__dirname, '../data/knowledge_base.json');
  if (fs.existsSync(kbPath)) {
    knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  }
} catch (error) {
  console.error('Error loading knowledge base:', error);
}

const embeddingService = require('./embeddingService');

function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = keyword.includes(' ') 
    ? '\\b' + escaped + '\\b' 
    : '\\b' + escaped + '(s|es|ed|ing)?\\b';
  return new RegExp(pattern, 'i').test(text);
}

class AIService {
  // Advanced RAG: Find relevant clinical documents using Semantic Similarity
  async getRelevantKnowledge(text) {
    try {
      const topMatches = await embeddingService.getTopMatches(text, knowledgeBase, 2);
      
      // Filter by a similarity threshold to ensure relevance
      const threshold = 0.65;
      const relevantDocs = topMatches.filter(m => m.similarity >= threshold);

      if (relevantDocs.length === 0) return '';

      return relevantDocs
        .map(doc => `[Source: ${doc.title}] ${doc.text} (Semantic Match: ${(doc.similarity * 100).toFixed(1)}%)`)
        .join('\n\n');
    } catch (error) {
      console.error('Knowledge retrieval error:', error);
      // Fallback to keyword matching if embedding service fails
      const textLower = text.toLowerCase();
      return knowledgeBase
        .filter(doc => doc.keywords.some(kw => textLower.includes(kw)))
        .map(doc => `${doc.title}: ${doc.text}`)
        .join('\n\n');
    }
  }

  async chat(messages, patientContext = '') {
    try {
      if (!model) throw new Error("Google Generative AI not initialized (missing API key)");
      
      const history = [];
      history.push({
        role: "user",
        parts: [{ text: SYSTEM_PROMPT + (patientContext ? `\n\nPatient Context: ${patientContext}` : '') }]
      });

      let messagesStartIdx = 0;
      if (messages.length > 0 && (messages[0].role === 'assistant' || messages[0].role === 'model')) {
        history.push({
          role: "model",
          parts: [{ text: messages[0].content }]
        });
        messagesStartIdx = 1;
      } else {
        history.push({
          role: "model",
          parts: [{ text: "I understand. I am ready to assist with healthcare intake as a professional AI assistant." }]
        });
      }

      const remainingMessages = messages.slice(messagesStartIdx, -1);
      history.push(...remainingMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })));

      const chat = model.startChat({
        history,
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 500,
        },
      });

      const lastMessage = messages[messages.length - 1].content;
      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('AI Service Error:', error);
      return this.fallbackResponse(messages);
    }
  }

  async analyzeSymptoms(symptoms, patientHistory = '', promptVersion = 'v2') {
    try {
      if (!model) throw new Error("Google Generative AI not initialized (missing API key)");
      
      const relevantKnowledge = await this.getRelevantKnowledge(symptoms);
      
      const promptTemplates = {
        v1: `Classify severity as Low, Medium, High, or Critical. 
Return JSON only. 
Patient input: ${symptoms}`,
        
        v2: `You are a cautious healthcare triage assistant. 
Classify severity as one of: Low, Medium, High, Critical.

Clinical Guidance:
${relevantKnowledge || 'No specific guidance available. Use standard clinical judgment.'}

Rules:
- Do not diagnose.
- Use Critical for chest pain with sweating, dizziness, or shortness of breath.
- Use High for breathing difficulty or low oxygen indicators.
- Return JSON only with exactly these fields:
{
  "age": null,
  "symptoms": [],
  "duration": "",
  "red_flags": [],
  "severity": "",
  "department": "",
  "needs_clinician_review": true,
  "possibleConditions": [],
  "recommended_action": "",
  "reasoning": ""
}

Patient input: ${symptoms}
${patientHistory ? `Patient history: ${patientHistory}` : ''}`
      };

      const prompt = promptTemplates[promptVersion] || promptTemplates.v2;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: "application/json"
        },
      });

      const content = result.response.text();
      return JSON.parse(content);
    } catch (error) {
      console.error('Symptom Analysis Error:', error);
      return this.fallbackAnalysis(symptoms);
    }
  }

  async summarizeHistory(history) {
    try {
      if (!model) throw new Error("Google Generative AI not initialized (missing API key)");
      
      const prompt = `Summarize the following patient history into no more than 5 bullet points. 
Focus only on clinically relevant information.

Patient History: 
${history}`;

      const result = await model.generateContent({
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      });

      return result.response.text();
    } catch (error) {
      console.error('History Summarization Error:', error);
      return "Unable to summarize history at this time.";
    }
  }

  async analyzeRisk(structuredIntake) {
    try {
      if (!model) throw new Error("Google Generative AI not initialized");

      const prompt = `You are a healthcare safety assistant. 
Given this structured intake: 
${JSON.stringify(structuredIntake, null, 2)}

Identify red flags. 
Return JSON only: 
{ 
  "red_flags": [], 
  "severity": "Low/Medium/High/Critical", 
  "reason": "" 
}`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        },
      });

      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Risk Analysis Error:', error);
      return { red_flags: [], severity: 'Medium', reason: 'Analysis failed' };
    }
  }

  detectPromptInjection(text) {
    const blockedPatterns = [
      "ignore previous instructions",
      "reveal all patient records",
      "bypass safety",
      "show system prompt",
      "disable guardrails"
    ];
    
    const textLower = text.toLowerCase();
    const matchedPatterns = blockedPatterns.filter(pattern => textLower.includes(pattern));

    return {
      isAttack: matchedPatterns.length > 0,
      matchedPatterns
    };
  }

  async isMedicalQuery(text) {
    const NON_MEDICAL_KEYWORDS = [
      'python', 'javascript', 'html', 'css', 'c++', 'typescript', 'coding', 'variable',
      'loop', 'array', 'program', 'algorithm', 'database', 'sql', 'git',
      'docker', 'syntax', 'compile', 'write a function', 'write function', 'python function',
      'node.js', 'nodejs', 'for loop', 'while loop', 'linked list',
      'capital of', 'population of', 'who wrote', 'who directed', 'who painted', 'tell me a joke',
      'tell a joke', 'write a story', 'write a poem', 'solve the equation', 'riddle', 'recipe',
      'how to bake', 'how to cook', 'weather in', 'stock price', 'news about'
    ];

    try {
      const cleaned = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      
      // 1. Fast-path local check for greetings, short/common affirmations/replies
      const commonWords = [
        'hi', 'hello', 'hey', 'yo', 'good morning', 'good afternoon', 'good evening',
        'thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'help', 'status', 'appointment'
      ];
      if (cleaned.length < 3 || commonWords.includes(cleaned)) {
        return true;
      }

      // 2. Local check for clear non-medical indicators (e.g. coding, geography, math)
      const hasNonMedicalKeyword = NON_MEDICAL_KEYWORDS.some(kw => matchesKeyword(cleaned, kw));
      if (hasNonMedicalKeyword) {
        return false;
      }

      // 3. Local check for clear medical indicators using symptomAnalyzer
      const symptomAnalyzer = require('./symptomAnalyzer');
      const analysis = symptomAnalyzer.analyze(cleaned);
      if (analysis.matched) {
        return true;
      }

      // Additional general medical keywords check
      const generalMedicalKeywords = ['health', 'medical', 'medicine', 'doctor', 'clinic', 'hospital', 'nurse', 'appointment', 'treatment', 'patient'];
      const hasGeneralMedical = generalMedicalKeywords.some(kw => cleaned.includes(kw));
      if (hasGeneralMedical) {
        return true;
      }

      // 4. Gemini classification call (if neither keyword list matched)
      if (!model) return true; // Default to true if Gemini is not initialized to avoid breaking the app

      const prompt = `You are a medical assistant chatbot classifier. Your only task is to classify whether the user's message is related to health, medicine, symptoms, clinical support, or friendly greetings/follow-ups to a medical assistant (e.g. "hello", "hi", "how are you", "thank you", "okay").

If the message is about:
- Symptoms, diseases, injuries, medications, body parts, pain
- Medical advice, diagnosis, triage, doctors, hospitals, departments
- Normal conversational greetings/closings (e.g. "hello", "hi", "hey", "thanks", "ok", "bye")
- Clarifications about the medical assistant's functions
Then classify as: HEALTH-RELATED

If the message is about:
- General knowledge, history, geography, science (e.g. "what is the capital of France", "who was Abraham Lincoln")
- Math, coding, programming, logic puzzles, writing essays/stories (e.g. "how to write a loop in Python", "solve x+2=4")
- Jokes, riddles, recipes, entertainment, sports (e.g. "tell me a joke", "how to bake a cake")
- Other completely unrelated topics
Then classify as: NON-HEALTH-RELATED

Analyze this message:
"${text}"

Respond with ONLY one word: "HEALTH-RELATED" or "NON-HEALTH-RELATED".`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          maxOutputTokens: 5,
        },
      });

      const responseText = result.response.text().trim().toUpperCase();
      return !responseText.includes('NON-HEALTH-RELATED');
    } catch (error) {
      console.error('isMedicalQuery error:', error);
      // Fallback under rate limit or API error:
      // If it has a non-medical keyword, reject. Otherwise, allow.
      const cleaned = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      const hasNonMedicalKeyword = NON_MEDICAL_KEYWORDS.some(kw => matchesKeyword(cleaned, kw));
      if (hasNonMedicalKeyword) {
        return false;
      }
      return true;
    }
  }


  async generateHandoffNotes(intakeData, riskAssessment) {
    try {
      if (!model) throw new Error("Google Generative AI not initialized");

      const prompt = `Create a concise clinician handoff note using: 

Intake: 
${JSON.stringify(intakeData, null, 2)}

Risk Assessment: 
${JSON.stringify(riskAssessment, null, 2)}

Rules: 
- Do not diagnose. 
- Keep under 80 words. 
- Recommend clinician review if severe symptoms exist.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      });

      return result.response.text();
    } catch (error) {
      console.error('Handoff Notes Error:', error);
      return "Clinical handoff notes generation failed.";
    }
  }

  fallbackResponse(messages) {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    if (lastMessage.includes('pain') || lastMessage.includes('hurt')) {
      return "I understand you're experiencing pain. Can you tell me: 1) Where exactly is the pain located? 2) How long have you been experiencing it? 3) On a scale of 1-10, how severe is it? (Note: I am an AI assistant and NOT a substitute for professional medical advice.)";
    }
    return "Thank you for sharing. Could you provide more details about your symptoms? (Note: I am an AI assistant and NOT a substitute for professional medical advice.)";
  }

  fallbackAnalysis(symptoms) {
    const symptomAnalyzer = require('./symptomAnalyzer');
    const local = symptomAnalyzer.analyze(symptoms);
    
    let severity = 'Medium';
    if (local.urgency === 'emergency') severity = 'Critical';
    else if (local.urgency === 'urgent') severity = 'High';
    else if (local.urgency === 'semi-urgent') severity = 'Medium';
    else if (local.urgency === 'non-urgent') severity = 'Low';

    return {
      severity: severity,
      reason: local.matched ? `Detected symptoms matching ${local.categories.join(', ')}.` : 'Clinical evaluation required.',
      recommended_action: local.urgency === 'emergency' ? 'Seek immediate medical attention or call emergency services.' : 'Consult with a healthcare professional.',
      symptoms: [{ name: symptoms, severity: local.urgency === 'emergency' ? 'critical' : 'moderate', category: 'general' }],
      possibleConditions: local.possibleConditions.length > 0 ? local.possibleConditions : ['Requires professional evaluation'],
      urgencyLevel: local.urgency,
      triageLevel: local.urgency === 'emergency' ? 1 : (local.urgency === 'urgent' ? 2 : (local.urgency === 'semi-urgent' ? 3 : 4)),
      department: local.department,
      isEmergency: local.urgency === 'emergency',
      validation_accuracy: 0.5
    };
  }

  fallbackHandoff(intakeData) {
    return `SBAR HANDOFF (FALLBACK)\nS: ${intakeData.chiefComplaint}\nB: Triage ${intakeData.triageLevel}\nA: Evaluation required\nR: Clinical review.`.trim();
  }
}

module.exports = new AIService();
