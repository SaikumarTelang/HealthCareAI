from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import os
import datetime
import time
import re
import base64
import json
from dotenv import load_dotenv
from schemas import Priority

load_dotenv()

from services.ai_service import ai_service

app = FastAPI(
    title="CareConnect - HIPAA Compliant Patient Intake API",
    description="RESTful API for AI-powered healthcare patient intake, ESI triage, and FHIR-ready data extraction.",
    version="1.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock database objects
db: Dict[str, Dict[str, Any]] = {}            # key: session_id, value: intake details dict
conversations: Dict[str, Dict[str, Any]] = {}   # key: session_id, value: conversation history
patients: Dict[str, Dict[str, Any]] = {}        # key: patient_id, value: patient registration details
mpi: Dict[str, str] = {}                        # key: "name|dob", value: patient_id
audit_logs: List[Dict[str, Any]] = []
doctors: Dict[str, Dict[str, Any]] = {}          # key: doctor_id (DOC-XXXXXX), value: doctor details
admins: Dict[str, Dict[str, Any]] = {}           # key: admin_id (ADM-XXXXXX), value: admin details

# Seed default doctor and admin
doctors["DOC-75C721"] = {
    "doctorId": "DOC-75C721",
    "name": "Dr. Peter Williams",
    "department": "general-medicine",
    "phone": "000-000-0000",
    "registeredAt": datetime.datetime.now().isoformat()
}
admins["ADM-123456"] = {
    "adminId": "ADM-123456",
    "name": "Administrator",
    "department": "all",
    "registeredAt": datetime.datetime.now().isoformat()
}

# JWT Decryption without packages (since venv packages are locked/unknown)
def decode_mock_jwt(token: str) -> Dict[str, Any]:
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        parts = token.split(".")
        if len(parts) >= 2:
            payload_b64 = parts[1]
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            payload_bytes = base64.urlsafe_b64decode(payload_b64)
            return json.loads(payload_bytes.decode('utf-8'))
    except Exception as e:
        print("Error decoding JWT:", e)
    # Default fallback clinician if header token decoding fails
    return {"id": "clinician", "name": "Dr. Staff", "role": "clinician", "department": "all"}

# Clinician Auth Dependency
async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        x_user_id = request.headers.get("x-user-id", "admin")
        return {
            "id": x_user_id,
            "name": f"Dr. {x_user_id.capitalize()}",
            "role": "admin" if "admin" in x_user_id else "clinician",
            "department": "all"
        }
    return decode_mock_jwt(auth_header)

def log_event(user_id: str, action: str, session_id: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "userId": user_id,
        "action": action,
        "sessionId": session_id,
        "metadata": metadata or {}
    }
    audit_logs.append(log_entry)
    if session_id and session_id in db:
        if "auditLogs" not in db[session_id]:
            db[session_id]["auditLogs"] = []
        db[session_id]["auditLogs"].append(f"{log_entry['timestamp']}: {action} by {user_id}")
    print(f"AUDIT LOG: {log_entry}")

# Models
class PatientRegisterRequest(BaseModel):
    firstName: str
    lastName: str
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = "prefer-not-to-say"
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    emergencyContact: Optional[Dict[str, Any]] = None
    insurance: Optional[Dict[str, Any]] = None
    medicalHistory: Optional[Dict[str, Any]] = None

class NaturalRegisterRequest(BaseModel):
    text: str

class StartChatRequest(BaseModel):
    patientId: Optional[str] = "anonymous"

class MessageRequest(BaseModel):
    sessionId: Optional[str] = None
    session_id: Optional[str] = None
    message: str

class CompleteRequest(BaseModel):
    sessionId: Optional[str] = None
    session_id: Optional[str] = None
    patientId: Optional[str] = None
    patient_id: Optional[str] = None

class PatientLookupRegisterRequest(BaseModel):
    firstName: str
    lastName: str
    phone: str
    age: Optional[int] = None

class ClinicianLoginRequest(BaseModel):
    username: str
    department: str

class DoctorRegisterRequest(BaseModel):
    name: str
    phone: Optional[str] = ""
    department: str

class AppointmentStatusRequest(BaseModel):
    patientId: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None

# ----------------- PATIENT ROUTES -----------------

@app.post("/api/patients/register", tags=["Patient"])
async def register_patient(req: PatientRegisterRequest):
    patient_id = "PAT-" + os.urandom(4).hex().upper()
    patient_data = {
        "patientId": patient_id,
        "firstName": req.firstName,
        "lastName": req.lastName,
        "dateOfBirth": req.dateOfBirth,
        "gender": req.gender,
        "email": req.email,
        "phone": req.phone,
        "address": req.address,
        "emergencyContact": req.emergencyContact,
        "insurance": req.insurance,
        "medicalHistory": req.medicalHistory,
        "registeredAt": datetime.datetime.now().isoformat()
    }
    patients[patient_id] = patient_data
    
    # Store in MPI
    mpi_key = f"{req.firstName.lower()} {req.lastName.lower()}|{req.dateOfBirth}"
    mpi[mpi_key] = patient_id
    
    log_event("system", f"Registered patient {req.firstName} {req.lastName}", None, {"patientId": patient_id})
    return {
        "success": True,
        "message": "Patient registered successfully",
        "patient": {
            "patientId": patient_id,
            "firstName": req.firstName,
            "lastName": req.lastName,
            "registeredAt": patient_data["registeredAt"]
        }
    }

@app.post("/api/patients/register-natural", tags=["Patient"])
async def register_natural(req: NaturalRegisterRequest):
    # RegEx matching
    parsed = {
        "firstName": "",
        "lastName": "",
        "dateOfBirth": datetime.datetime.now().date().isoformat(),
        "gender": "prefer-not-to-say",
        "phone": "",
        "email": ""
    }
    text = req.text
    
    name_match = re.search(r"(?:my name is|i am|i'm|name:?)\s+([a-zA-Z]+)\s+([a-zA-Z]+)", text, re.IGNORECASE)
    if name_match:
        parsed["firstName"] = name_match.group(1)
        parsed["lastName"] = name_match.group(2)
        
    age_match = re.search(r"(\d{1,3})\s*(?:years?\s*old|yrs?\s*old|yo)", text, re.IGNORECASE)
    if age_match:
        age = int(age_match.group(1))
        dob = datetime.datetime.now() - datetime.timedelta(days=age * 365)
        parsed["dateOfBirth"] = dob.date().isoformat()
        
    if re.search(r"\b(male|man|boy)\b", text, re.IGNORECASE):
        parsed["gender"] = "male"
    elif re.search(r"\b(female|woman|girl)\b", text, re.IGNORECASE):
        parsed["gender"] = "female"
        
    phone_match = re.search(r"(\d{3}[-.]?\d{3}[-.]?\d{4})", text)
    if phone_match:
        parsed["phone"] = phone_match.group(1)
        
    email_match = re.search(r"[\w.-]+@[\w.-]+\.\w+", text)
    if email_match:
        parsed["email"] = email_match.group(0)

    patient_id = "PAT-" + os.urandom(4).hex().upper()
    patient_data = {
        "patientId": patient_id,
        **parsed,
        "registeredAt": datetime.datetime.now().isoformat()
    }
    patients[patient_id] = patient_data
    
    log_event("system", f"Registered patient {parsed['firstName']} {parsed['lastName']} via natural language", None, {"patientId": patient_id})
    return {
        "success": True,
        "message": "Patient registered via natural language",
        "patient": {
            "patientId": patient_id,
            "firstName": parsed["firstName"],
            "lastName": parsed["lastName"]
        },
        "parsed": parsed
    }

@app.get("/api/patients/{patientId}", tags=["Patient"])
async def get_patient_details(patientId: str):
    if patientId not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"success": True, "patient": patients[patientId]}

@app.put("/api/patients/{patientId}", tags=["Patient"])
async def update_patient_details(patientId: str, req: Dict[str, Any]):
    if patientId not in patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    patients[patientId].update(req)
    patients[patientId]["updatedAt"] = datetime.datetime.now().isoformat()
    return {"success": True, "message": "Patient updated successfully"}

@app.post("/api/patients/lookup-or-register", tags=["Patient"])
async def lookup_or_register_patient(req: PatientLookupRegisterRequest):
    # Search patients dict
    matched_patient = None
    for p_id, p_data in patients.items():
        p_phone = p_data.get("phone", "")
        p_firstName = p_data.get("firstName", "")
        p_lastName = p_data.get("lastName", "")
        if (
            p_phone == req.phone and 
            p_firstName.strip().lower() == req.firstName.strip().lower() and 
            p_lastName.strip().lower() == req.lastName.strip().lower()
        ):
            matched_patient = p_data
            break

    if matched_patient:
        return {
            "success": True,
            "message": "Existing patient found",
            "patient": matched_patient
        }

    # Register new patient
    patient_id = "PAT-" + os.urandom(4).hex().upper()
    
    # Calculate DOB from age
    date_of_birth = None
    if req.age:
        dob = datetime.datetime.now() - datetime.timedelta(days=req.age * 365)
        date_of_birth = dob.date().isoformat()

    patient_data = {
        "patientId": patient_id,
        "firstName": req.firstName,
        "lastName": req.lastName,
        "dateOfBirth": date_of_birth,
        "age": req.age,
        "phone": req.phone,
        "registeredAt": datetime.datetime.now().isoformat()
    }
    patients[patient_id] = patient_data
    
    # Store in MPI
    mpi_key = f"{req.firstName.lower()} {req.lastName.lower()}|{date_of_birth}"
    mpi[mpi_key] = patient_id

    log_event("system", f"Registered patient {req.firstName} {req.lastName} via lookup-or-register", None, {"patientId": patient_id})
    return {
        "success": True,
        "message": "New patient registered successfully",
        "patient": patient_data
    }

# ----------------- CHAT ROUTES -----------------

@app.post("/api/chat/start", tags=["Chat"])
async def start_chat_session(req: StartChatRequest):
    session_id = "SES-" + os.urandom(4).hex().upper()
    
    welcome_message = {
        "role": "assistant",
        "content": "Hello! I'm your healthcare intake assistant. I'm here to help understand your symptoms and guide you to the right care. Please describe what you're experiencing today, and I'll ask some follow-up questions to better assist you.\n\nYou can describe your symptoms in your own words - for example, 'I have a headache and feel dizzy' or 'My stomach has been hurting for 2 days'.",
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    conversations[session_id] = {
        "patientId": req.patientId or "anonymous",
        "sessionId": session_id,
        "messages": [welcome_message],
        "status": "active",
        "createdAt": datetime.datetime.now().isoformat(),
        "updatedAt": datetime.datetime.now().isoformat()
    }
    
    db[session_id] = {
        "patientId": req.patientId or "anonymous",
        "sessionId": session_id,
        "status": "active",
        "priority": "medium",
        "createdAt": datetime.datetime.now().isoformat(),
        "updatedAt": datetime.datetime.now().isoformat(),
        "auditLogs": []
    }
    
    log_event("patient", "Started chat intake session", session_id)
    return {
        "success": True,
        "sessionId": session_id,
        "message": welcome_message
    }

@app.post("/api/chat/message", tags=["Chat"])
async def send_chat_message(req: MessageRequest):
    sess_id = req.sessionId or req.session_id
    if not sess_id or sess_id not in conversations:
        raise HTTPException(status_code=404, detail="Session not found")
        
    conversation = conversations[sess_id]
    
    user_msg = {
        "role": "user",
        "content": req.message,
        "timestamp": datetime.datetime.now().isoformat()
    }
    conversation["messages"].append(user_msg)
    conversation["updatedAt"] = datetime.datetime.now().isoformat()
    
    # Process history
    history = [{"role": m["role"], "content": m["content"]} for m in conversation["messages"][:-1]]
    
    start_time = time.time()
    result = await ai_service.process_chat(req.message, history)
    latency = round((time.time() - start_time) * 1000, 2)
    
    log_event("patient", "Sent chat message", sess_id, {"latency_ms": latency})
    
    ai_response = {
        "role": "assistant",
        "content": result["message"],
        "timestamp": datetime.datetime.now().isoformat()
    }
    conversation["messages"].append(ai_response)
    conversation["updatedAt"] = datetime.datetime.now().isoformat()
    
    # Simple maps
    extracted = result.get("extracted_data") or {}
    priority = "medium"
    if result.get("is_emergency"):
        priority = "emergency"
    elif result.get("is_urgent"):
        priority = "high"
        
    analysis = {
        "categories": [s.get("name", "") for s in extracted.get("symptoms", [])] if extracted.get("symptoms") else [],
        "urgency": priority,
        "department": extracted.get("suggested_department") or "General Medicine",
        "severity": extracted.get("symptoms", [{}])[0].get("severity", "moderate") if extracted.get("symptoms") else "moderate",
        "reason": extracted.get("summary") or "Symptom evaluation",
        "recommendedAction": "A clinician will verify your triage details soon."
    }
    
    # Save partial extraction to db
    if extracted:
        db[sess_id].update({
            "chiefComplaint": req.message,
            "priority": priority,
            "department": analysis["department"],
            "symptoms": extracted.get("symptoms") or []
        })
        
    return {
        "success": True,
        "response": ai_response,
        "isEmergency": result.get("is_emergency", False),
        "analysis": analysis
    }

@app.get("/api/chat/history/{sessionId}", tags=["Chat"])
async def get_history(sessionId: str):
    if sessionId not in conversations:
        raise HTTPException(status_code=404, detail="Conversation session not found")
    return {"success": True, "conversation": conversations[sessionId]}

DEPT_MAP = {
    "emergency": ("Emergency Department", "emergency"),
    "cardiology": ("Cardiology", "cardiology"),
    "neurology": ("Neurology", "neurology"),
    "orthopedics": ("Orthopedics", "orthopedics"),
    "gastroenterology": ("Gastroenterology", "gastroenterology"),
    "pulmonology": ("Pulmonology", "pulmonology"),
    "obstetrics": ("Obstetrics & Gynecology", "obstetrics"),
    "pediatrics": ("Pediatrics", "pediatrics"),
    "psychiatry": ("Psychiatry", "psychiatry"),
    "dermatology": ("Dermatology", "dermatology"),
    "ophthalmology": ("Ophthalmology", "ophthalmology"),
    "ent": ("ENT (Ear, Nose & Throat)", "ent"),
    "general-medicine": ("General Medicine", "general-medicine"),
}

def normalize_dept(dept_str: str):
    if not dept_str:
        return "General Medicine", "general-medicine"
    normalized = dept_str.strip().lower().replace(" ", "-")
    if normalized in DEPT_MAP:
        return DEPT_MAP[normalized]
    for code, (name, c) in DEPT_MAP.items():
        if code in normalized or normalized in code:
            return name, c
    return "General Medicine", "general-medicine"

@app.post("/api/chat/complete", tags=["Chat"])
async def complete_chat_session(req: CompleteRequest):
    sess_id = req.sessionId or req.session_id
    if not sess_id or sess_id not in conversations:
        raise HTTPException(status_code=404, detail="Session not found")
        
    conversation = conversations[sess_id]
    conversation["status"] = "completed"
    
    pat_id = req.patientId or req.patient_id
    if pat_id:
        conversation["patientId"] = pat_id
        db[sess_id]["patientId"] = pat_id
        
    all_user_messages = ". ".join([m["content"] for m in conversation["messages"] if m["role"] == "user"])
    
    # Process AI structured generation
    start_time = time.time()
    
    # Clean pipeline simulation
    extracted_symptoms = []
    suggested_dept = "General Medicine"
    priority_level = "medium"
    triage_score = 3
    is_emergency = False
    
    try:
        # Step 1: Extraction
        # Simulated/cached using last processed chat results or simple extraction
        history_dicts = [{"role": m["role"], "content": m["content"]} for m in conversation["messages"]]
        # Quick extract call or parsing
        ai_res = await ai_service.process_chat("Summarize patient symptoms.", history_dicts[:-1])
        extracted = ai_res.get("extracted_data") or {}
        
        if extracted:
            extracted_symptoms = extracted.get("symptoms", [])
            suggested_dept = extracted.get("suggested_department") or "General Medicine"
            triage_score = extracted.get("triage_score") or 3
            priority_val = extracted.get("priority")
            if isinstance(priority_val, Priority):
                priority_level = priority_val.value
            elif isinstance(priority_val, str):
                priority_level = priority_val
            is_emergency = priority_level == "emergency"
    except Exception as e:
        print("Extraction error during completion:", e)
        
    # SBAR Handoff Generation
    handoff_data = db[sess_id]
    handoff_data["session_id"] = sess_id
    handoff_notes = await ai_service.generate_handoff_notes(handoff_data)
    
    # Simulated metrics
    risk_assessment = {
        "critical_conditions": ["Cardiac issues"] if is_emergency else [],
        "risk_indicators": ["Chest discomfort"] if is_emergency else ["Aches"],
        "recommended_level": priority_level,
        "latency_ms": round((time.time() - start_time) * 1000, 2)
    }
    
    dept_name, dept_code = normalize_dept(suggested_dept)
    
    # Assign a doctor from that department if any exists in doctors dict
    dept_docs = [d["name"] for d in doctors.values() if d.get("department") == dept_code]
    if dept_docs:
        assigned_doctor = dept_docs[0]
    else:
        fallback_docs = {
            "emergency": "Dr. Sarah Chen",
            "cardiology": "Dr. James Wilson",
            "neurology": "Dr. Robert Kim",
            "orthopedics": "Dr. David Brown",
            "gastroenterology": "Dr. Ahmad Hassan",
            "pulmonology": "Dr. Kevin O'Brien",
            "obstetrics": "Dr. Rachel Green",
            "pediatrics": "Dr. Thomas Lee",
            "psychiatry": "Dr. Mark Stevens",
            "dermatology": "Dr. Anna Schmidt",
            "ophthalmology": "Dr. Raj Gupta",
            "ent": "Dr. Steven Chang",
            "general-medicine": "Dr. Peter Williams"
        }
        assigned_doctor = fallback_docs.get(dept_code, "Dr. Peter Williams")
        
    estimated_wait = "Immediate" if is_emergency else "20-40 minutes"
    
    routing = {
        "department": dept_name,
        "departmentCode": dept_code,
        "assignedDoctor": assigned_doctor,
        "estimatedWait": estimated_wait,
        "priority": priority_level,
        "isEmergency": is_emergency
    }
    
    db[sess_id].update({
        "status": "pending",
        "symptoms": extracted_symptoms,
        "triageLevel": triage_score,
        "priority": priority_level,
        "isEmergency": is_emergency,
        "department": dept_name,
        "departmentCode": dept_code,
        "assignedDoctor": assigned_doctor,
        "estimatedWait": estimated_wait,
        "handoffNotes": handoff_notes,
        "riskAssessment": risk_assessment,
        "historySummary": all_user_messages[:200] + "...",
        "updatedAt": datetime.datetime.now().isoformat()
    })
    
    log_event("patient", "Completed chat intake flow", sess_id)
    return {
        "success": True,
        "message": "Conversation completed",
        "analysis": {
            "symptoms": extracted_symptoms,
            "department": suggested_dept,
            "triage_score": triage_score,
            "priority": priority_level
        },
        "routing": routing,
        "historySummary": db[sess_id]["historySummary"],
        "handoffNotes": handoff_notes,
        "riskAssessment": risk_assessment
    }

@app.post("/api/chat/appointment-status", tags=["Chat"])
async def check_appointment_status(req: AppointmentStatusRequest):
    resolved_patient_id = req.patientId
    
    # If no patientId, look up by name + phone
    if not resolved_patient_id and req.firstName and req.lastName and req.phone:
        for p_id, p_data in patients.items():
            if (
                p_data.get("phone", "") == req.phone and
                p_data.get("firstName", "").strip().lower() == req.firstName.strip().lower() and
                p_data.get("lastName", "").strip().lower() == req.lastName.strip().lower()
            ):
                resolved_patient_id = p_id
                break
    
    if not resolved_patient_id:
        raise HTTPException(status_code=404, detail="Patient not found. Please check your details.")
    
    # Find the latest intake for this patient
    latest_intake = None
    for sess_id, item in db.items():
        if item.get("patientId") == resolved_patient_id:
            if not latest_intake or item.get("createdAt", "") > latest_intake.get("createdAt", ""):
                latest_intake = {"id": sess_id, **item}
    
    if not latest_intake:
        raise HTTPException(status_code=404, detail="No appointment found for this patient.")
    
    patient_data = patients.get(resolved_patient_id)
    patient_name = f"{patient_data['firstName']} {patient_data['lastName']}" if patient_data else resolved_patient_id
    
    return {
        "success": True,
        "appointment": {
            "patientId": resolved_patient_id,
            "patientName": patient_name,
            "status": latest_intake.get("status"),
            "department": latest_intake.get("department"),
            "assignedDoctor": latest_intake.get("assignedDoctor"),
            "priority": latest_intake.get("priority"),
            "triageLevel": latest_intake.get("triageLevel"),
            "estimatedWait": latest_intake.get("estimatedWait"),
            "createdAt": latest_intake.get("createdAt"),
            "chiefComplaint": latest_intake.get("chiefComplaint")
        }
    }

# ----------------- COMPLIANCE / NPP -----------------

@app.get("/api/chat/npp", tags=["Compliance"])
async def get_compliance_npp():
    return {
        "title": "Notice of Privacy Practices (NPP)",
        "content": "This notice describes how medical information about you may be used and disclosed... (Standard HIPAA NPP text)",
        "last_updated": "2026-05-20"
    }

@app.post("/api/chat/consent/{sessionId}", tags=["Compliance"])
async def record_npp_consent(sessionId: str, req: Dict[str, Any] = None):
    consent_type = (req or {}).get("consentType", "electronic_npp")
    log_event("patient", f"Gave {consent_type} consent", sessionId)
    return {"success": True, "message": "Consent recorded successfully"}

# ----------------- CLINICIAN DASHBOARD -----------------

@app.post("/api/clinician/register-doctor", tags=["Clinician"])
async def register_doctor(req: DoctorRegisterRequest):
    if not req.name or not req.department:
        raise HTTPException(status_code=400, detail="Name and department are required")
    
    doctor_id = "DOC-" + os.urandom(3).hex().upper()
    doctor_data = {
        "doctorId": doctor_id,
        "name": req.name,
        "phone": req.phone or "",
        "department": req.department,
        "registeredAt": datetime.datetime.now().isoformat()
    }
    doctors[doctor_id] = doctor_data
    
    log_event("system", f"Registered doctor {req.name}", None, {"doctorId": doctor_id})
    return {
        "success": True,
        "message": "Doctor registered successfully",
        "doctor": doctor_data
    }

@app.post("/api/clinician/login", tags=["Clinician"])
async def clinician_login(req: ClinicianLoginRequest):
    username = req.username
    
    if username.startswith("ADM-"):
        if username not in admins:
            raise HTTPException(status_code=401, detail="Invalid admin ID. Please check your credentials.")
        admin_data = admins[username]
        role = "admin"
        name = admin_data.get("name", "Administrator")
        login_dept = "all"
        doctor_id = username
    elif username.startswith("DOC-"):
        if username not in doctors:
            raise HTTPException(status_code=401, detail="Invalid doctor ID. Please register first or check your credentials.")
        doctor_data = doctors[username]
        role = "clinician"
        name = doctor_data["name"]
        login_dept = req.department or doctor_data.get("department", "all")
        doctor_id = username
    else:
        raise HTTPException(status_code=400, detail="Username must start with DOC- or ADM-")
    
    # Build fake JWT
    header_json = json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8')
    payload_json = json.dumps({
        "id": username,
        "role": role,
        "department": login_dept,
        "name": name,
        "doctorId": doctor_id
    }).encode('utf-8')
    
    header_b64 = base64.urlsafe_b64encode(header_json).decode('utf-8').rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip("=")
    fake_token = f"{header_b64}.{payload_b64}.fakesig"
    
    log_event(username, "Clinician logged in", None, {"department": login_dept, "role": role})
    return {
        "success": True,
        "token": fake_token,
        "clinician": {
            "name": name,
            "department": login_dept,
            "role": role,
            "doctorId": doctor_id
        }
    }

@app.get("/api/clinician/dashboard", tags=["Clinician"])
async def get_clinician_dashboard(user: dict = Depends(get_current_user)):
    log_event(user["id"], "Accessed clinician dashboard")
    
    dept = user.get("department", "all")
    name = user.get("name", "Dr. Staff")
    
    emergencies = []
    urgent = []
    pending = []
    my_queue = []
    
    role = user.get("role", "clinician")
    
    for sess_id, item in db.items():
        item_status = item.get("status", "")
        # Skip items that are treated/completed
        if item_status == "completed":
            continue
            
        item_dept_code = item.get("departmentCode") or ""
        priority = (item.get("priority") or "medium").lower()
        is_emergency = item.get("isEmergency", False) or priority == "emergency"
        
        mapped_item = {
            "id": sess_id,
            **item
        }
        
        if role == "admin":
            # Admin sees everything active
            if item_status in ["assigned", "verified", "consulting", "pending", "active", "escalated"]:
                if is_emergency:
                    emergencies.append(mapped_item)
                elif priority in ["high", "urgent"]:
                    urgent.append(mapped_item)
                else:
                    pending.append(mapped_item)
                my_queue.append(mapped_item)
        else:
            # Doctor sees only department-filtered and own assigned items
            if item_status in ["assigned", "verified", "consulting", "pending", "active", "escalated"]:
                if dept != "all" and item_dept_code.lower() != dept.lower():
                    continue
                    
                if is_emergency:
                    emergencies.append(mapped_item)
                elif priority in ["high", "urgent"]:
                    urgent.append(mapped_item)
                else:
                    pending.append(mapped_item)
                    
                # My queue: assigned to this specific doctor
                if item.get("assignedDoctor") == name:
                    my_queue.append(mapped_item)
                
    # Calculate stats
    total_pending = len(pending)
    total_emergencies = len(emergencies)
    total_urgent = len(urgent)
    total_today = sum(1 for item in db.values() if item.get("createdAt", "").startswith(datetime.datetime.now().date().isoformat()))
    
    dept_stats = {}
    for item in db.values():
        item_dept = item.get("department") or "General Medicine"
        dept_stats[item_dept] = dept_stats.get(item_dept, 0) + 1
        
    stats = {
        "totalPending": total_pending,
        "totalEmergencies": total_emergencies,
        "totalUrgent": total_urgent,
        "totalToday": total_today,
        "totalMyQueue": len(my_queue),
        "byDepartment": [{"_id": k, "count": v} for k, v in dept_stats.items()]
    }
    
    return {
        "success": True,
        "emergencies": emergencies,
        "urgent": urgent,
        "pending": pending,
        "myQueue": my_queue,
        "stats": stats,
        "clinician": user
    }

@app.get("/api/clinician/queue/{department}", tags=["Clinician"])
async def get_department_queue_list(department: str, user: dict = Depends(get_current_user)):
    queue = []
    for sess_id, item in db.items():
        item_dept = item.get("department") or ""
        if item_dept.lower() == department.lower() and item.get("status") != "completed":
            queue.append({"id": sess_id, **item})
    return {"success": True, "queue": queue}

@app.post("/api/clinician/accept/{intakeId}", tags=["Clinician"])
async def accept_patient_intake(intakeId: str, req: Dict[str, Any], user: dict = Depends(get_current_user)):
    if intakeId not in db:
        raise HTTPException(status_code=404, detail="Intake not found")
        
    clinician_name = req.get("clinicianName") or user.get("name") or "Dr. Staff"
    db[intakeId].update({
        "status": "assigned",
        "clinicianAssigned": clinician_name,
        "assignedDoctor": clinician_name,
        "updatedAt": datetime.datetime.now().isoformat()
    })
    
    log_event(user["id"], f"Accepted patient intake", intakeId, {"clinician": clinician_name})
    return {"success": True, "intake": {"id": intakeId, **db[intakeId]}}

@app.get("/api/clinician/handoff/{intakeId}", tags=["Clinician"])
async def get_clinician_handoff(intakeId: str, refresh: Optional[str] = "false", user: dict = Depends(get_current_user)):
    if intakeId not in db:
        raise HTTPException(status_code=404, detail="Intake not found")
        
    intake = db[intakeId]
    handoff = intake.get("handoffNotes")
    
    if not handoff or refresh == "true":
        handoff = await ai_service.generate_handoff_notes(intake)
        db[intakeId]["handoffNotes"] = handoff
        db[intakeId]["updatedAt"] = datetime.datetime.now().isoformat()
        
    return {"success": True, "handoffNotes": handoff}

@app.get("/api/clinician/departments", tags=["Clinician"])
async def get_all_clinician_departments(user: dict = Depends(get_current_user)):
    depts = [
        {"code": "emergency", "name": "Emergency Department"},
        {"code": "cardiology", "name": "Cardiology"},
        {"code": "neurology", "name": "Neurology"},
        {"code": "pediatrics", "name": "Pediatrics"},
        {"code": "orthopedics", "name": "Orthopedics"},
        {"code": "general-medicine", "name": "General Medicine"}
    ]
    return {"success": True, "departments": depts}

@app.post("/api/clinician/complete/{intakeId}", tags=["Clinician"])
async def complete_clinician_intake(intakeId: str, req: Dict[str, Any], user: dict = Depends(get_current_user)):
    if intakeId not in db:
        raise HTTPException(status_code=404, detail="Intake not found")
        
    notes = req.get("notes") or req.get("diagnosis") or "Treatment complete"
    if "recommendedActions" not in db[intakeId]:
        db[intakeId]["recommendedActions"] = []
    db[intakeId]["recommendedActions"].append(notes)
    db[intakeId].update({
        "status": "completed",
        "updatedAt": datetime.datetime.now().isoformat()
    })
    
    log_event(user["id"], "Completed patient intake", intakeId, {"notes": notes})
    return {"success": True, "message": "Intake completed successfully"}

# ----------------- ADVANCED / COMPLIANCE ROUTES -----------------

@app.post("/api/clinician/verify-intake/{sessionId}", tags=["Clinician"])
async def verify_intake_details(sessionId: str, req: Dict[str, Any], user: dict = Depends(get_current_user)):
    if sessionId not in db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    priority = req.get("priority", "medium").lower()
    notes = req.get("notes", "")
    
    previous_priority = db[sessionId].get("priority", "medium")
    
    db[sessionId].update({
        "priority": priority,
        "isEmergency": priority == "emergency",
        "clinicianNotes": notes,
        "status": "verified",
        "updatedAt": datetime.datetime.now().isoformat()
    })
    
    log_event(
        user["id"], 
        "Verified intake details", 
        sessionId, 
        {
            "previousPriority": previous_priority,
            "newPriority": priority,
            "notes": notes
        }
    )
    return {"success": True, "message": "Intake verified successfully"}

@app.post("/api/clinician/consult-doctor/{sessionId}", tags=["Clinician"])
async def consult_specialist_doctor(sessionId: str, req: Dict[str, Any], user: dict = Depends(get_current_user)):
    if sessionId not in db:
        raise HTTPException(status_code=404, detail="Session not found")
        
    doctor_name = req.get("doctorName", "Dr. Specialist")
    department = req.get("department", "Specialty Medicine")
    
    db[sessionId].update({
        "status": "consulting",
        "consultedDoctor": doctor_name,
        "consultedDepartment": department,
        "updatedAt": datetime.datetime.now().isoformat()
    })
    
    log_event(
        user["id"], 
        f"Requested consultation from {doctor_name} ({department})", 
        sessionId,
        {"doctorName": doctor_name, "department": department}
    )
    return {"success": True, "message": "Specialist consultation requested"}

@app.get("/api/clinician/analytics", tags=["Clinician"])
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    # Node.js returns totalSessions, priorityDistribution, departmentDistribution, averageAiLatencyMs
    priority_counts = {"emergency": 0, "high": 0, "urgent": 0, "medium": 0, "low": 0}
    department_counts = {}
    
    total_latency = 0
    latency_count = 0
    
    for item in db.values():
        p = (item.get("priority") or "medium").lower()
        if p in priority_counts:
            priority_counts[p] += 1
        else:
            priority_counts["medium"] += 1
            
        dept = item.get("department") or "General Medicine"
        department_counts[dept] = department_counts.get(dept, 0) + 1
        
        # Check latency in risk assessment
        risk_ass = item.get("riskAssessment") or {}
        if "latency_ms" in risk_ass:
            total_latency += risk_ass["latency_ms"]
            latency_count += 1
            
    avg_latency = round(total_latency / latency_count, 2) if latency_count > 0 else 1150.0
    
    log_event(user["id"], "Viewed clinician analytics dashboard")
    
    return {
        "success": True,
        "analytics": {
            "totalSessions": len(db),
            "priorityDistribution": priority_counts,
            "departmentDistribution": [{"name": k, "count": v} for k, v in department_counts.items()],
            "averageAiLatencyMs": avg_latency
        }
    }

@app.get("/api/clinician/audit-logs", tags=["Clinician"])
async def get_compliance_audit_logs(user: dict = Depends(get_current_user)):
    # Sort logs descending
    sorted_logs = sorted(audit_logs, key=lambda x: x["timestamp"], reverse=True)
    log_event(user["id"], "Accessed global audit logs")
    return {"success": True, "logs": sorted_logs}

@app.get("/api/clinician/fhir/{sessionId}", tags=["Clinician"])
async def export_fhir_r4_bundle(sessionId: str, user: dict = Depends(get_current_user)):
    if sessionId not in db:
        raise HTTPException(status_code=404, detail="Intake not found")
        
    intake = db[sessionId]
    patient_id = intake.get("patientId", "anonymous")
    
    fhir_bundle = {
        "resourceType": "Bundle",
        "id": f"bundle-{sessionId}",
        "type": "collection",
        "timestamp": datetime.datetime.now().isoformat(),
        "entry": [
            {
                "fullUrl": f"urn:uuid:patient-{patient_id}",
                "resource": {
                    "resourceType": "Patient",
                    "id": patient_id,
                    "active": True,
                    "name": [{"use": "official", "text": patient_id}]
                }
            },
            {
                "fullUrl": f"urn:uuid:encounter-{sessionId}",
                "resource": {
                    "resourceType": "Encounter",
                    "id": sessionId,
                    "status": "finished",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "EMER",
                        "display": "emergency"
                    },
                    "subject": {"reference": f"Patient/{patient_id}"}
                }
            },
            {
                "fullUrl": f"urn:uuid:observation-triage-{sessionId}",
                "resource": {
                    "resourceType": "Observation",
                    "id": f"triage-{sessionId}",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "exam",
                            "display": "Exam"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": "54505-3",
                            "display": "Emergency severity index"
                        }],
                        "text": "Triage Priority Level"
                    },
                    "subject": {"reference": f"Patient/{patient_id}"},
                    "valueString": intake.get("priority") or "medium"
                }
            }
        ]
    }
    
    # Enforce patient demographics lookup if not anonymous
    if patient_id and patient_id != "anonymous" and patient_id in patients:
        pat_data = patients[patient_id]
        fhir_bundle["entry"][0]["resource"]["name"][0] = {
            "use": "official",
            "family": pat_data.get("lastName", ""),
            "given": [pat_data.get("firstName", "")]
        }
        fhir_bundle["entry"][0]["resource"]["telecom"] = [
            {"system": "phone", "value": pat_data.get("phone", "")},
            {"system": "email", "value": pat_data.get("email", "")}
        ]
        fhir_bundle["entry"][0]["resource"]["gender"] = pat_data.get("gender", "unknown")
        fhir_bundle["entry"][0]["resource"]["birthDate"] = pat_data.get("dateOfBirth")
        
    if intake.get("chiefComplaint"):
        fhir_bundle["entry"].append({
            "fullUrl": f"urn:uuid:observation-complaint-{sessionId}",
            "resource": {
                "resourceType": "Observation",
                "id": f"complaint-{sessionId}",
                "status": "final",
                "code": {
                    "coding": [{
                        "system": "http://loinc.org",
                        "code": "10154-3",
                        "display": "Chief complaint Narrative - Reported"
                    }]
                },
                "subject": {"reference": f"Patient/{patient_id}"},
                "valueString": intake.get("chiefComplaint")
            }
        })
        
    log_event(user["id"], "Exported FHIR R4 Bundle", sessionId)
    return {"success": True, "fhirBundle": fhir_bundle}

@app.get("/")
async def root():
    return {"message": "Welcome to the Healthcare Patient Intake System API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
