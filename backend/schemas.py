from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EMERGENCY = "emergency"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"

class Symptom(BaseModel):
    name: str
    severity: str
    duration: Optional[str] = None
    related_issues: List[str] = []

class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str

class InsuranceInfo(BaseModel):
    provider: str
    policy_number: str
    group_number: Optional[str] = None

class MedicalHistory(BaseModel):
    past_conditions: List[str] = []
    surgeries: List[str] = []
    allergies: List[str] = []
    current_medications: List[str] = []
    family_history: List[str] = []

class PatientRegistration(BaseModel):
    full_name: str
    date_of_birth: str
    gender: Gender
    address: Optional[str] = None
    contact_number: str
    email: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    insurance: Optional[InsuranceInfo] = None
    consent_given: bool = False

class IntakeSession(BaseModel):
    session_id: str
    patient_info: Optional[PatientRegistration] = None
    medical_history: Optional[MedicalHistory] = None
    symptoms: List[Symptom] = []
    triage_score: Optional[int] = Field(None, description="ESI score from 1 (most urgent) to 5 (least urgent)")
    summary: Optional[str] = None
    priority: Priority = Priority.LOW
    suggested_department: Optional[str] = None
    audit_logs: List[str] = []
    is_clinician_verified: bool = False
    verified_by: Optional[str] = None
    verification_notes: Optional[str] = None
    validation_accuracy: Optional[float] = Field(None, description="Confidence score of AI extraction")

class ChatMessage(BaseModel):
    role: str # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    message: str
    extracted_data: Optional[IntakeSession] = None
    is_emergency: bool = False
    clarifying_questions: List[str] = []
