# AI Healthcare Intake & Triage System

An intelligent, AI-driven healthcare web application that automates the patient intake process, assesses symptoms, and dynamically routes patients to the appropriate medical department based on severity and clinical guidelines.

## 🚀 Features
- **AI-Powered Chat Assistant**: Uses Google Generative AI (Gemini) to conduct natural, empathetic conversations to understand patient symptoms.
- **RAG-based Clinical Knowledge**: Employs Retrieval-Augmented Generation (RAG) to reference clinical protocols for accurate symptom analysis.
- **Automated Triage**: Classifies patient priority (Low, Medium, High, Critical) and instantly triggers emergency protocols if severe symptoms (e.g., chest pain, stroke signs) are detected.
- **Smart Department Routing**: Automatically routes patients to specialized departments (Cardiology, Neurology, etc.) based on symptom keywords and AI extraction.
- **Clinician Handoff**: Generates structured, concise clinical notes (SBAR format) for doctors to review.

## 🛠️ Tech Stack
**Frontend:**
- React.js (Vite)
- Tailwind CSS (for styling)
- Axios (for API requests)

**Backend:**
- Node.js & Express.js
- Google Generative AI (Gemini 2.5 Flash / Text-Embedding-004) for LLM and Embeddings
- Firebase Firestore (Database for patient records, intakes, and chat sessions)
- Socket.io (for real-time emergency alerts to the frontend)

---

## ⚙️ Installation & Setup

### Prerequisites
1. **Node.js**: Make sure you have Node.js (v18+) installed.
2. **Firebase Account**: You need a Firebase project with a Firestore database initialized in **Native Mode**.
3. **Google Gemini API Key**: You need an API key from Google AI Studio.

### 1. Clone the Repository
```bash
git clone <your-github-repo-url>
cd HealthCareApp
```

### 2. Set Up the Backend
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder and add your credentials:
```env
# Server Port
PORT=5000

# Google Gemini API
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Firebase Admin SDK Credentials (Required for Database)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
```
*(Make sure your Firebase Firestore database is created as `(default)` in your Google Cloud Console!)*

### 3. Set Up the Frontend
Open a new terminal window, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder (if applicable):
```env
VITE_API_URL=http://localhost:5000
```

---

## ▶️ Running the Application

You will need two terminal windows running simultaneously—one for the backend, one for the frontend.

**Start the Backend Server:**
```bash
cd backend
npm run dev
# The server should start on http://localhost:5000 and connect to Firebase
```

**Start the Frontend App:**
```bash
cd frontend
npm run dev
# The app will be available on http://localhost:5173 (or similar port)
```

## 📂 Project Structure
```text
HealthCareApp/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # API route logic
│   ├── routes/          # Express route definitions (chat, clinician, etc)
│   ├── services/        # AI Service, Symptom Analyzer, Triage, Embeddings
│   ├── utils/           # Helper functions & Mock DB
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React UI components (ChatBot, Admin Dashboard)
│   │   ├── App.jsx      # Main application component
│   │   └── index.css    # Tailwind styling
│   └── package.json
├── .gitignore           # Ignores node_modules and .env secrets
└── README.md            # This file
```

## 🔒 Security Notes
- **Never push `.env` files to GitHub**. The `.gitignore` file provided in this repository automatically excludes them.
- Keep your Firebase Private Key and Google API Keys strictly local or in a secure secrets manager.
