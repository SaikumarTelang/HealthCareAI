import os
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from schemas import IntakeSession, Symptom, Priority, PatientRegistration

class AIService:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        
        # DETERMINISTIC CONFIGURATION: Set temperature to 0 to minimize non-deterministic hallucinations
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=self.api_key,
            temperature=0.0,
            max_retries=3
        )

    async def sanitize_input(self, text: str) -> str:
        """Simple input sanitization to prevent basic prompt injection patterns."""
        forbidden_patterns = ["ignore all previous instructions", "system prompt", "as an admin", "bypass"]
        sanitized = text
        for pattern in forbidden_patterns:
            if pattern in sanitized.lower():
                sanitized = sanitized.replace(pattern, "[REDACTED]")
        return sanitized

    async def process_chat(self, message: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        # Input Sanitization
        safe_message = await self.sanitize_input(message)
        
        # FAILSAFE EMERGENCY DETECTION (TIERED)
        tier1_keywords = ["chest pain", "difficulty breathing", "severe bleeding", "stroke", "unresponsive", "anaphylaxis", "labor pain", "suicidal", "seizure", "head trauma"]
        tier2_keywords = ["high fever", "abdominal pain", "dehydration", "vision loss", "confusion"]
        
        is_tier1 = any(kw in safe_message.lower() for kw in tier1_keywords)
        is_tier2 = any(kw in safe_message.lower() for kw in tier2_keywords)

        system_prompt = f"""
        You are an expert Healthcare Patient Intake Assistant. Your mission is to conduct a rigorous, comprehensive patient intake using a TIERED EMERGENCY DETECTION FRAMEWORK.

        EMERGENCY TIERS & TRIAGE:
        - Tier 1: Immediate Emergency (ESI 1-2). Priority: EMERGENCY. Examples: Chest pain, can't breathe, severe bleeding, stroke, labor, suicidal ideation, seizures.
        - Tier 2: Urgent (ESI 3). Priority: HIGH. Examples: High fever (>103°F), severe abdominal pain, sudden vision loss, new onset confusion.
        - Tier 3: Semi-Urgent (ESI 4). Priority: MEDIUM. Examples: Moderate pain (4-7/10), persistent vomiting, minor injuries.
        - Tier 4: Non-Urgent (ESI 5). Priority: LOW. Examples: Cold symptoms, minor aches, administrative needs.

        CONFIRMATION & CLARITY:
        - MANDATORY CONFIRMATION: If a patient reports a Tier 1 or Tier 2 symptom, your NEXT response must include a clear confirmation question (e.g., "I've recorded that you're experiencing severe chest pain. Is that correct?").
        - READING LEVEL: Maintain a 6th-grade reading level. Avoid jargon.

        DETECTION RULES:
        1. CONTEXTUAL ANALYSIS: "Chest pain" + "radiating to arm" = Tier 1.
        2. TEMPORAL CONTEXT: "Having chest pain now" (Tier 1) vs "Had chest pain last month" (Tier 3/4).
        3. NEGATION: "I don't have chest pain" = NO Tier 1 trigger.
        4. ESCALATION BIAS: When in doubt, escalate UP (e.g., if unsure between Tier 2 and Tier 3, choose Tier 2).

        LIABILITY & SAFETY RULES:
        1. MANDATORY DISCLAIMER: Every response MUST begin or end with a statement that you are an AI assistant and NOT a substitute for professional medical advice, diagnosis, or treatment.
        2. SCOPE LIMITATION: You do NOT provide definitive diagnoses. You only suggest potential departments and triage levels.
        3. EMERGENCY FIRST: If life-threatening symptoms are detected, prioritize safety instructions over data collection.

        USABILITY & ACCESSIBILITY:
        1. MULTI-LANGUAGE: Respond in the same language used by the patient. Support English, Spanish, French, and Mandarin.
        2. HEALTH LITERACY: Use clear, simple language (6th-grade reading level) unless technical terms are necessary for clinician notes.
        3. PROGRESSION: Briefly acknowledge what information has been captured and what is still needed.

        GOALS:
        1. Consent: Verify the user has agreed to the Notice of Privacy Practices (NPP).
        2. Registration: Capture Name, DOB, Gender, Address, Contact.
        3. History: Past conditions, surgeries, allergies, meds.
        4. Triage: Assign ESI (1-5) based on evidence.
        """

        messages = [SystemMessage(content=system_prompt)]
        
        for msg in history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        
        messages.append(HumanMessage(content=message))
        
        try:
            response = await self.llm.ainvoke(messages)
            
            # Extraction logic
            extraction_prompt = f"""
            Extract structured data from the following conversation.
            Latest Message: {safe_message}
            History: {history}

            Respond ONLY with a JSON object matching the IntakeSession schema.
            Fields to extract:
            - patient_info: (full_name, date_of_birth, gender, address, contact_number, email, emergency_contact, insurance, consent_given)
            - medical_history: (past_conditions, surgeries, allergies, current_medications, family_history)
            - symptoms: (name, severity, duration, related_issues)
            - triage_score: (1-5 based on ESI)
            - priority: (low, medium, high, emergency)
            - suggested_department: (e.g., Cardiology, OBGYN, etc.)
            - validation_accuracy: (A float between 0.0 and 1.0 representing your confidence in this extraction)

            Example structure:
            {{
                "patient_info": {{}},
                "medical_history": {{}},
                "symptoms": [],
                "triage_score": 3,
                "priority": "medium",
                "suggested_department": "General Medicine",
                "validation_accuracy": 0.95
            }}
            """
            
            extraction_response = await self.llm.ainvoke([SystemMessage(content=extraction_prompt)])
            
            # Clean up JSON if necessary
            json_str = extraction_response.content
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            
            try:
                import json
                extracted_data = json.loads(json_str)
            except:
                extracted_data = None
        except Exception as e:
            print("Google Generative AI error in process_chat, using fallback:", e)
            fallback_text = "Thank you for sharing. Could you provide more details about your symptoms? (Note: I am an AI assistant and NOT a substitute for professional medical advice.)"
            if "pain" in safe_message.lower() or "hurt" in safe_message.lower():
                fallback_text = "I understand you're experiencing pain. Can you tell me: 1) Where exactly is the pain located? 2) How long have you been experiencing it? 3) On a scale of 1-10, how severe is it? (Note: I am an AI assistant and NOT a substitute for professional medical advice.)"
            
            priority_val = "medium"
            if is_tier1:
                priority_val = "emergency"
            elif is_tier2:
                priority_val = "high"
                
            extracted_data = {
                "patient_info": {},
                "medical_history": {},
                "symptoms": [{"name": safe_message, "severity": "critical" if is_tier1 else "moderate", "category": "general"}],
                "triage_score": 1 if is_tier1 else (3 if is_tier2 else 4),
                "priority": priority_val,
                "suggested_department": "Cardiology" if is_tier1 else "General Medicine",
                "validation_accuracy": 0.5
            }
            
            return {
                "message": fallback_text,
                "extracted_data": extracted_data,
                "is_emergency": is_tier1,
                "is_urgent": is_tier2
            }

        return {
            "message": response.content,
            "extracted_data": extracted_data,
            "is_emergency": (extracted_data.get("priority") == "emergency" if extracted_data else False) or is_tier1,
            "is_urgent": (extracted_data.get("priority") == "high" if extracted_data else False) or is_tier2
        }

    async def generate_handoff_notes(self, intake_data: Dict[str, Any]) -> str:
        try:
            prompt = f"""
            Generate a professional clinician handoff note in SBAR format.
            
            MANDATORY LEGAL FOOTER: Include a disclaimer that this is an AI-generated summary and must be verified by a licensed clinician.
            
            DATA: {intake_data}

            SITUATION: Current priority, chief complaint, and ESI score.
            BACKGROUND: Demographics, medical history, allergies, and current medications.
            ASSESSMENT: Clinical analysis of symptoms and urgency.
            RECOMMENDATION: Department routing and immediate next steps.
            """
            response = await self.llm.ainvoke([SystemMessage(content=prompt)])
            return response.content
        except Exception as e:
            print("Google Generative AI error in generate_handoff_notes, using fallback:", e)
            chief_complaint = intake_data.get("chiefComplaint", "Symptom evaluation")
            triage_level = intake_data.get("triageLevel", 3)
            return f"SBAR HANDOFF (FALLBACK)\nS: {chief_complaint}\nB: Triage level {triage_level}\nA: Evaluation required\nR: Clinical review. Note: This is an AI-generated summary and must be verified by a licensed clinician."

ai_service = AIService()
