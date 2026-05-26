const CLINICAL_PROMPTS_LOOKUP = [
  // Cardiology
  {
    phrases: ["crushing pressure in the center of my chest", "spread down my left arm"],
    department: "cardiology",
    urgency: "urgent",
    possibleConditions: ["Angina", "Myocardial Infarction (Heart Attack)"],
    relatedQuestions: [
      "Is the pain radiating to your jaw or back?",
      "Are you experiencing shortness of breath?",
      "Are you sweating or feeling nauseous?",
      "Did the pain come on suddenly or gradually?"
    ]
  },
  {
    phrases: ["climb the stairs", "tight, squeezing feeling in my chest", "goes away after I sit down"],
    department: "cardiology",
    urgency: "urgent",
    possibleConditions: ["Stable Angina", "Coronary Artery Disease"],
    relatedQuestions: [
      "Does this only happen with physical exertion?",
      "How long does the squeezing feeling last?",
      "Is the pain radiating to your arm, jaw, or back?",
      "Are you also experiencing shortness of breath?"
    ]
  },
  {
    phrases: ["racing and skipping beats", "sitting quietly and watching tv"],
    department: "cardiology",
    urgency: "urgent",
    possibleConditions: ["Arrhythmia", "Palpitations", "Atrial Fibrillation"],
    relatedQuestions: [
      "Have you had caffeine, alcohol, or new medications recently?",
      "Do you feel lightheaded or dizzy when this happens?",
      "Is the pain radiating to your arm, jaw, or back?",
      "Are you also experiencing shortness of breath?"
    ]
  },
  {
    phrases: ["cold sweat with a sharp, stabbing pain", "left side of my chest", "take a deep breath"],
    department: "cardiology",
    urgency: "urgent",
    possibleConditions: ["Pericarditis", "Pleurisy", "Strained Chest Muscle"],
    relatedQuestions: [
      "Does the pain change when you lean forward?",
      "Do you have a fever or cough?",
      "Is the pain radiating to your arm, jaw, or back?",
      "Are you also experiencing shortness of breath?"
    ]
  },
  {
    phrases: ["breathless over the last few weeks", "ankles are super swollen"],
    department: "cardiology",
    urgency: "urgent",
    possibleConditions: ["Congestive Heart Failure", "Venous Insufficiency"],
    relatedQuestions: [
      "Do you find it harder to breathe when lying flat?",
      "Have you gained weight suddenly?",
      "Is the pain radiating to your arm, jaw, or back?",
      "Are you also experiencing shortness of breath?"
    ]
  },

  // Orthopedics
  {
    phrases: ["twisted my ankle", "loud pop", "swollen like a balloon", "cant put any weight"],
    department: "orthopedics",
    urgency: "semi-urgent",
    possibleConditions: ["Ankle Sprain", "Ligament Tear", "Ankle Fracture"],
    relatedQuestions: [
      "Are you able to put any weight on the affected limb?",
      "Did you hear a pop or snap when the injury occurred?",
      "Is there any visible deformity or swelling?",
      "Do you have any numbness, tingling, or weakness in your extremities?"
    ]
  },
  {
    phrases: ["lower back has been aching constantly", "sit at my desk for a few hours"],
    department: "orthopedics",
    urgency: "semi-urgent",
    possibleConditions: ["Lumbar Muscle Strain", "Degenerative Disc Disease", "Sciatica"],
    relatedQuestions: [
      "Does the pain radiate down your legs?",
      "Do you feel any numbness or tingling?",
      "Are you able to put any weight on the affected limb?",
      "Did you hear a pop or snap when the injury occurred?"
    ]
  },
  {
    phrases: ["pain in my right knee", "locked in place", "cannot straighten my leg"],
    department: "orthopedics",
    urgency: "semi-urgent",
    possibleConditions: ["Meniscal Tear", "Knee Dislocation", "Patellar Subluxation"],
    relatedQuestions: [
      "Did the knee pop when it locked?",
      "Is there any swelling or heat in the joint?",
      "Are you able to put any weight on the affected limb?",
      "Did you hear a pop or snap when the injury occurred?"
    ]
  },
  {
    phrases: ["hands feel incredibly stiff and achy", "joints to loosen up"],
    department: "orthopedics",
    urgency: "semi-urgent",
    possibleConditions: ["Rheumatoid Arthritis", "Osteoarthritis"],
    relatedQuestions: [
      "Are your joints swollen or red?",
      "Does the stiffness improve with movement?",
      "Are you able to put any weight on the affected limb?",
      "Did you hear a pop or snap when the injury occurred?"
    ]
  },
  {
    phrases: ["fell off my bike", "landed hard on my shoulder", "arm feels completely numb"],
    department: "orthopedics",
    urgency: "semi-urgent",
    possibleConditions: ["Shoulder Dislocation", "Clavicle Fracture", "Brachial Plexus Injury"],
    relatedQuestions: [
      "Can you move your fingers?",
      "Is your shoulder visibly out of place?",
      "Are you able to put any weight on the affected limb?",
      "Did you hear a pop or snap when the injury occurred?"
    ]
  },

  // Neurology
  {
    phrases: ["worst headache of my entire life", "suddenly, like a thunderclap"],
    department: "neurology",
    urgency: "urgent",
    possibleConditions: ["Subarachnoid Hemorrhage", "Thunderclap Headache"],
    relatedQuestions: [
      "Do you have a stiff neck or sensitivity to light?",
      "Have you lost consciousness or vomited?",
      "Did this symptom come on suddenly or gradually?",
      "Are you experiencing any weakness on one side of your body?"
    ]
  },
  {
    phrases: ["right hand has started shaking", "balance has been off"],
    department: "neurology",
    urgency: "urgent",
    possibleConditions: ["Parkinson's Disease", "Essential Tremor"],
    relatedQuestions: [
      "Does the shaking stop when you reach for objects?",
      "Have you noticed changes in your handwriting?",
      "Did this symptom come on suddenly or gradually?",
      "Are you experiencing any weakness on one side of your body?"
    ]
  },
  {
    phrases: ["left side of my face feels totally numb", "speech sounds slurred"],
    department: "neurology",
    urgency: "urgent",
    possibleConditions: ["Stroke", "Transient Ischemic Attack (TIA)", "Bell's Palsy"],
    relatedQuestions: [
      "Can you raise both arms equally?",
      "Do you have any weakness in your arm or leg?",
      "Did this symptom come on suddenly or gradually?",
      "Are you experiencing any weakness on one side of your body?"
    ]
  },
  {
    phrases: ["tingling sensations down my legs", "pins and needles"],
    department: "neurology",
    urgency: "urgent",
    possibleConditions: ["Peripheral Neuropathy", "Lumbar Radiculopathy", "Multiple Sclerosis"],
    relatedQuestions: [
      "Do you have diabetes?",
      "Are both legs affected equally?",
      "Did this symptom come on suddenly or gradually?",
      "Are you experiencing any weakness on one side of your body?"
    ]
  },
  {
    phrases: ["dizzy spells", "room feels like it's spinning", "nauseous"],
    department: "neurology",
    urgency: "urgent",
    possibleConditions: ["Benign Paroxysmal Positional Vertigo (BPPV)", "Vestibular Neuritis"],
    relatedQuestions: [
      "Does the spinning trigger when you turn your head?",
      "Do you have any ringing in your ears?",
      "Did this symptom come on suddenly or gradually?",
      "Are you experiencing any weakness on one side of your body?"
    ]
  },

  // Psychiatry
  {
    phrases: ["completely overwhelmed", "constant, heavy feeling in my chest", "get out of bed or eat for days"],
    department: "psychiatry",
    urgency: "urgent",
    possibleConditions: ["Major Depressive Disorder", "Severe Anxiety"],
    relatedQuestions: [
      "Are you having thoughts of self-harm?",
      "How long have you felt this way?",
      "Have you had similar episodes or are you currently in therapy/medication?",
      "Are these symptoms severely impacting your daily life or sleep?"
    ]
  },
  {
    phrases: ["having a panic attack", "heart is pounding out of my chest", "die"],
    department: "psychiatry",
    urgency: "urgent",
    possibleConditions: ["Panic Attack", "Panic Disorder"],
    relatedQuestions: [
      "Have you had panic attacks before?",
      "Are you experiencing chest pain or tingling?",
      "Have you had similar episodes or are you currently in therapy/medication?",
      "Are these symptoms severely impacting your daily life or sleep?"
    ]
  },
  {
    phrases: ["haven't slept in four days", "mind is racing", "take on the world", "scaring my family"],
    department: "psychiatry",
    urgency: "urgent",
    possibleConditions: ["Manic Episode", "Bipolar Disorder"],
    relatedQuestions: [
      "Are you making impulsive decisions?",
      "Do you feel irritable or unusually talkative?",
      "Have you had similar episodes or are you currently in therapy/medication?",
      "Are these symptoms severely impacting your daily life or sleep?"
    ]
  },
  {
    phrases: ["hearing voices whispering", "terrified they want to hurt me"],
    department: "psychiatry",
    urgency: "urgent",
    possibleConditions: ["Schizophrenia", "Psychotic Episode"],
    relatedQuestions: [
      "Are you seeing things that others cannot?",
      "Do you feel safe right now?",
      "Have you had similar episodes or are you currently in therapy/medication?",
      "Are these symptoms severely impacting your daily life or sleep?"
    ]
  },
  {
    phrases: ["low and hopeless", "can't shake this sadness", "point in keeping going"],
    department: "psychiatry",
    urgency: "urgent",
    possibleConditions: ["Major Depressive Disorder", "Suicidal Ideation"],
    relatedQuestions: [
      "Do you have a plan to end your life?",
      "Do you have supportive family or friends nearby?",
      "Have you had similar episodes or are you currently in therapy/medication?",
      "Are these symptoms severely impacting your daily life or sleep?"
    ]
  },

  // Gynecology & Obstetrics
  {
    phrases: ["seven months pregnant", "bleeding heavily", "intense, regular cramps"],
    department: "obstetrics",
    urgency: "semi-urgent",
    possibleConditions: ["Placental Abruption", "Placenta Previa", "Preterm Labor"],
    relatedQuestions: [
      "Is the bleeding bright red or dark?",
      "Are you feeling the baby move?",
      "If pregnant, how many weeks along are you?",
      "Is there any active bleeding or unusual discharge?"
    ]
  },
  {
    phrases: ["periods have been incredibly irregular", "cramps are so painful", "call out of work"],
    department: "obstetrics",
    urgency: "semi-urgent",
    possibleConditions: ["Endometriosis", "Polycystic Ovary Syndrome (PCOS)", "Dysmenorrhea"],
    relatedQuestions: [
      "Are your periods heavy with clots?",
      "How long have your cycles been irregular?",
      "Are you experiencing regular cramps, pelvic pain, or hot flashes?",
      "Is there any active bleeding or unusual discharge?"
    ]
  },
  {
    phrases: ["hard lump in my right breast", "skin around it looks a bit dimpled"],
    department: "obstetrics",
    urgency: "semi-urgent",
    possibleConditions: ["Fibroadenoma", "Breast Cyst", "Breast Neoplasm"],
    relatedQuestions: [
      "Does the lump change size with your period?",
      "Is there any discharge or pain?",
      "How long have you noticed the lump or changes in breast tissue?",
      "Are you experiencing regular cramps, pelvic pain, or hot flashes?"
    ]
  },
  {
    phrases: ["burning and itching down there", "foul-smelling discharge"],
    department: "obstetrics",
    urgency: "semi-urgent",
    possibleConditions: ["Bacterial Vaginosis", "Yeast Infection", "Trichomoniasis"],
    relatedQuestions: [
      "What color is the discharge?",
      "Are you experiencing pain during urination or intercourse?",
      "Is there any active bleeding or unusual discharge?",
      "Are you experiencing regular cramps, pelvic pain, or hot flashes?"
    ]
  },
  {
    phrases: ["intense hot flashes and night sweats", "moods are all over the place"],
    department: "obstetrics",
    urgency: "semi-urgent",
    possibleConditions: ["Perimenopause", "Menopause"],
    relatedQuestions: [
      "Are your periods becoming irregular or stopping?",
      "How long have you had hot flashes?",
      "Are you experiencing regular cramps, pelvic pain, or hot flashes?",
      "Is there any active bleeding or unusual discharge?"
    ]
  },

  // ENT
  {
    phrases: ["throat hurts so badly", "barely swallow my own saliva", "103 degrees"],
    department: "ent",
    urgency: "semi-urgent",
    possibleConditions: ["Tonsillitis", "Streptococcal Pharyngitis", "Peritonsillar Abscess"],
    relatedQuestions: [
      "Do you see white patches in the back of your throat?",
      "Are you having difficulty breathing?",
      "Do you have a fever, difficulty swallowing, or trouble breathing?",
      "Is there any discharge, fluid, or blood leaking from your ears or nose?"
    ]
  },
  {
    phrases: ["severe pain deep inside my right ear", "yellowish fluid leaking"],
    department: "ent",
    urgency: "semi-urgent",
    possibleConditions: ["Otitis Media", "Ruptured Eardrum"],
    relatedQuestions: [
      "Has your hearing decreased on that side?",
      "Did the pain suddenly improve when the fluid leaked?",
      "Do you have a fever, difficulty swallowing, or trouble breathing?",
      "Is there any discharge, fluid, or blood leaking from your ears or nose?"
    ]
  },
  {
    phrases: ["nose has been completely blocked", "pressure right behind my eyes and cheeks"],
    department: "ent",
    urgency: "semi-urgent",
    possibleConditions: ["Sinusitis", "Allergic Rhinitis"],
    relatedQuestions: [
      "Is there a colored nasal discharge?",
      "Do you have a headache or fever?",
      "Do you have a fever, difficulty swallowing, or trouble breathing?",
      "Is there any discharge, fluid, or blood leaking from your ears or nose?"
    ]
  },
  {
    phrases: ["swallowed a fishbone", "stuck sharply in the back of my throat"],
    department: "ent",
    urgency: "semi-urgent",
    possibleConditions: ["Foreign Body in Pharynx/Esophagus"],
    relatedQuestions: [
      "Are you spitting up blood or coughing?",
      "Can you drink water safely?",
      "Do you have a fever, difficulty swallowing, or trouble breathing?",
      "Is there any discharge, fluid, or blood leaking from your ears or nose?"
    ]
  },
  {
    phrases: ["ringing sound in my left ear", "hard to hear conversations"],
    department: "ent",
    urgency: "semi-urgent",
    possibleConditions: ["Tinnitus", "Sensorineural Hearing Loss"],
    relatedQuestions: [
      "Is the ringing constant or pulsing?",
      "Did you have exposure to loud noise?",
      "Do you have a fever, difficulty swallowing, or trouble breathing?",
      "Is there any discharge, fluid, or blood leaking from your ears or nose?"
    ]
  },

  // General Medicine
  {
    phrases: ["incredibly thirsty", "pee constantly", "totally exhausted"],
    department: "general-medicine",
    urgency: "semi-urgent",
    possibleConditions: ["Diabetes Mellitus", "Diabetes Insipidus"],
    relatedQuestions: [
      "Have you lost weight unexpectedly?",
      "Do you have a family history of diabetes?",
      "How long have you had these symptoms?",
      "Do you have a fever, chills, or any localized heat or swelling?"
    ]
  },
  {
    phrases: ["burning pain in my stomach", "throw up"],
    department: "general-medicine",
    urgency: "semi-urgent",
    possibleConditions: ["Gastritis", "Gastroesophageal Reflux Disease (GERD)", "Peptic Ulcer"],
    relatedQuestions: [
      "Does the burning worsen with certain foods?",
      "Have you noticed dark or black stools?",
      "How long have you had these symptoms?",
      "Do you have a fever, chills, or any localized heat or swelling?"
    ]
  },
  {
    phrases: ["persistent dry cough for the last three weeks"],
    department: "general-medicine",
    urgency: "semi-urgent",
    possibleConditions: ["Post-Nasal Drip", "Cough-Variant Asthma", "GERD-induced Cough"],
    relatedQuestions: [
      "Do you smoke or take ACE inhibitors?",
      "Is the cough worse at night?",
      "How long have you had these symptoms?",
      "Do you have a fever, chills, or any localized heat or swelling?"
    ]
  },
  {
    phrases: ["skin has been incredibly itchy", "whites of my eyes", "look yellow"],
    department: "general-medicine",
    urgency: "semi-urgent",
    possibleConditions: ["Jaundice", "Hepatitis", "Biliary Obstruction"],
    relatedQuestions: [
      "Have you noticed dark urine or pale stools?",
      "Have you had any abdominal pain?",
      "How long have you had these symptoms?",
      "Do you have a fever, chills, or any localized heat or swelling?"
    ]
  },
  {
    phrases: ["cut on my leg", "bright red, hot to the touch", "calf"],
    department: "general-medicine",
    urgency: "semi-urgent",
    possibleConditions: ["Cellulitis", "Erysipelas"],
    relatedQuestions: [
      "Is the redness spreading quickly?",
      "Do you have a fever or chills?",
      "How long have you had these symptoms?",
      "Do you have a fever, chills, or any localized heat or swelling?"
    ]
  },

  // Emergency & Trauma
  {
    phrases: ["bleach", "vomiting"],
    department: "emergency",
    urgency: "emergency",
    possibleConditions: ["Corrosive Ingestion", "Chemical Poisoning"],
    relatedQuestions: [
      "How much bleach was ingested?",
      "Is the child breathing and conscious?",
      "Is the person conscious and breathing?",
      "Are they experiencing severe bleeding that won't stop?"
    ]
  },
  {
    phrases: ["knife slipped", "cut my hand deeply", "bleeding to stop"],
    department: "emergency",
    urgency: "emergency",
    possibleConditions: ["Laceration with Hemorrhage", "Tendon/Nerve Injury"],
    relatedQuestions: [
      "Can you move all your fingers?",
      "Have you applied direct pressure with a clean cloth?",
      "Is the person conscious and breathing?",
      "Are they experiencing severe bleeding that won't stop?"
    ]
  },
  {
    phrases: ["stung by a bee", "lips are swelling", "hives", "throat feels really tight"],
    department: "emergency",
    urgency: "emergency",
    possibleConditions: ["Anaphylaxis (Severe Allergic Reaction)"],
    relatedQuestions: [
      "Do you have an epinephrine auto-injector (EpiPen)?",
      "Are you wheezing or dizzy?",
      "Is the person conscious and breathing?",
      "Are they experiencing severe bleeding that won't stop?"
    ]
  },
  {
    phrases: ["grandfather just collapsed", "not responding", "not breathing"],
    department: "emergency",
    urgency: "emergency",
    possibleConditions: ["Cardiac Arrest", "Respiratory Failure"],
    relatedQuestions: [
      "Have you started CPR?",
      "Is someone calling emergency services (911)?",
      "Is the person conscious and breathing?",
      "Are they experiencing severe bleeding that won't stop?"
    ]
  },
  {
    phrases: ["car accident", "vision is blurry", "head is pounding", "throwing up"],
    department: "emergency",
    urgency: "emergency",
    possibleConditions: ["Traumatic Brain Injury", "Concussion", "Internal Injury"],
    relatedQuestions: [
      "Did you lose consciousness even briefly?",
      "Are you experiencing any neck pain?",
      "Is the person conscious and breathing?",
      "Are they experiencing severe bleeding that won't stop?"
    ]
  }
];

function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const pattern = keyword.includes(' ') 
    ? '\\b' + escaped + '\\b' 
    : '\\b' + escaped + '(s|es|ed|ing)?\\b';
  return new RegExp(pattern, 'i').test(text);
}

class SymptomAnalyzer {
  constructor() {
    this.symptomPatterns = {
      'cardiology': {
        keywords: [
          'chest pain', 'tightness', 'squeezing', 'palpitations', 'racing heart', 'irregular heartbeat',
          'shortness of breath', 'radiating pain', 'arm numbness', 'sweating', 'dizziness', 'fainting',
          'high blood pressure', 'swollen ankles', 'fluttering', 'heart attack', 'angina', 'heavy chest',
          'jaw pain', 'fatigue', 'chest', 'chest pressure', 'heart pain', 'skipping beats', 'breathless',
          'crushing pressure', 'squeezing feeling', 'heart feels like', 'stabbing pain on the left side',
          'cardiology', 'cardiologist', 'heart', 'cardiac'
        ],
        relatedQuestions: [
          'Is the pain radiating to your arm, jaw, or back?',
          'Are you also experiencing shortness of breath?',
          'Are you sweating or feeling nauseous?',
          'Did the pain come on suddenly or gradually?'
        ],
        possibleConditions: ['Angina', 'Heart Attack', 'Arrhythmia', 'Pericarditis', 'Heart Failure'],
        department: 'cardiology',
        urgency: 'urgent'
      },
      'neurology': {
        keywords: [
          'headache', 'migraine', 'dizziness', 'vertigo', 'numbness', 'tingling', 'pins and needles',
          'muscle weakness', 'seizure', 'tremor', 'shaking', 'slurred speech', 'facial drooping', 'confusion',
          'memory loss', 'paralysis', 'loss of balance', 'fainting', 'blurred vision', 'brain fog',
          'head pain', 'head hurts', 'throbbing head', 'head pressure', 'balance', 'numb', 'speech', 'slurred',
          'dizzy', 'spinning', 'thunderclap', 'worst headache', 'face feels totally numb',
          'shaking uncontrollably', 'speech sounds slurred', 'spinning violently', 'neurology', 'neurologist',
          'brain', 'nerve', 'nerves', 'nervous system'
        ],
        relatedQuestions: [
          'Did this symptom come on suddenly or gradually?',
          'Are you experiencing any weakness on one side of your body?',
          'Do you have difficulty speaking or understanding speech?',
          'Are you experiencing any vision changes, neck stiffness, or severe nausea?'
        ],
        possibleConditions: ['Migraine / Tension Headache', 'Stroke / TIA', 'Parkinson\'s Disease', 'Peripheral Neuropathy', 'Vertigo / Vestibular Neuritis'],
        department: 'neurology',
        urgency: 'urgent'
      },
      'orthopedics': {
        keywords: [
          'joint pain', 'swelling', 'fracture', 'broken bone', 'sprain', 'stiffness', 'limited mobility',
          'popping sound', 'locking joint', 'arthritis', 'inflammation', 'dislocation', 'lower back pain',
          'sciatica', 'muscle spasm', 'tingling', 'ligament tear', 'knee pain', 'shoulder injury', 'limping',
          'ankle', 'knee', 'shoulder', 'joint', 'bone', 'stiff', 'back ache', 'lower back', 'pop', 'twist',
          'broken', 'arm numb', 'shoulder pain', 'knee locked', 'joints', 'ache constantly', 'straighten my leg',
          'stiff and achy', 'back hurts', 'spine', 'backache', 'orthopedics', 'orthopedic', 'orthopedist',
          'bones and joints', 'leg pain'
        ],
        relatedQuestions: [
          'Are you able to put any weight on the affected limb?',
          'Did you hear a pop or snap when the injury occurred?',
          'Is there any visible deformity or swelling?',
          'Do you have any numbness, tingling, or weakness in your extremities?'
        ],
        possibleConditions: ['Sprain / Ligament Tear', 'Muscle Strain', 'Bone Fracture / Dislocation', 'Osteoarthritis / Rheumatoid Arthritis', 'Sciatica'],
        department: 'orthopedics',
        urgency: 'semi-urgent'
      },
      'gastroenterology': {
        keywords: [
          'stomach', 'abdominal', 'belly', 'tummy', 'abdomen', 'stomach pain', 'cramps', 'bloating',
          'gastric', 'acid reflux', 'heartburn', 'burning pain in my stomach'
        ],
        relatedQuestions: [
          'Where exactly in your abdomen is the pain?',
          'Have you had any nausea, vomiting, or diarrhea?',
          'When did the pain start?',
          'Have you noticed any blood in your stool?'
        ],
        possibleConditions: ['Gastritis / GERD', 'Appendicitis', 'IBS', 'Food Poisoning', 'Peptic Ulcer'],
        department: 'gastroenterology',
        urgency: 'semi-urgent'
      },
      'pulmonology': {
        keywords: [
          'breathing', 'breath', 'shortness of breath', 'cant breathe', 'difficulty breathing', 
          'wheezing', 'gasping', 'oxygen', 'respiratory'
        ],
        relatedQuestions: [
          'When did the breathing difficulty start?',
          'Is it getting worse?',
          'Do you have any chest pain along with it?',
          'Do you have a history of asthma or COPD?'
        ],
        possibleConditions: ['Asthma Exacerbation', 'COPD', 'Pneumonia', 'Bronchitis'],
        department: 'pulmonology',
        urgency: 'urgent'
      },
      'obstetrics': {
        keywords: [
          'pelvic pain', 'severe cramps', 'irregular periods', 'heavy bleeding', 'spotting', 'vaginal discharge',
          'itching', 'burning', 'hot flashes', 'night sweats', 'breast lump', 'pregnancy', 'miscarriage',
          'contractions', 'water broke', 'painful sex', 'menopause', 'missed period', 'foul odor', 'morning sickness',
          'pregnant', 'labor', 'period', 'periods', 'menstruation', 'cramps', 'lump in breast',
          'burning and itching down there', 'discharge', 'foul-smelling', 'gynecology', 'obstetrics',
          'gynecologist', 'obstetrician', 'womens health'
        ],
        relatedQuestions: [
          'If pregnant, how many weeks along are you?',
          'Is there any active bleeding or unusual discharge?',
          'How long have you noticed the lump or changes in breast tissue?',
          'Are you experiencing regular cramps, pelvic pain, or hot flashes?'
        ],
        possibleConditions: ['Pregnancy Complication / Premature Labor', 'Dysmenorrhea / Fibroids', 'Breast Pathology', 'Vaginitis / Yeast Infection', 'Menopausal Symptoms'],
        department: 'obstetrics',
        urgency: 'semi-urgent'
      },
      'psychiatry': {
        keywords: [
          'anxiety', 'depression', 'panic attack', 'dread', 'hallucinations', 'hearing voices', 'delusions',
          'insomnia', 'mania', 'racing thoughts', 'suicidal thoughts', 'mood swings', 'agitation', 'withdrawal',
          'hopelessness', 'crying spells', 'paranoia', 'self-harm', 'selfharm', 'self harm', 'trauma', 'apathy',
          'depressed', 'anxious', 'panic', 'suicidal', 'hopeless', 'sadness', 'cant sleep',
          'voices', 'racing mind', 'overwhelmed', 'point in keeping going', 'take on the world',
          'scaring my family', 'psychiatry', 'psychiatrist', 'mental health', 'mental'
        ],
        relatedQuestions: [
          'Are you having any thoughts of harming yourself or others?',
          'How long have you been experiencing these feelings?',
          'Have you had similar episodes or are you currently in therapy/medication?',
          'Are these symptoms severely impacting your daily life or sleep?'
        ],
        possibleConditions: ['Major Depressive Disorder', 'Panic Disorder / Agoraphobia', 'Bipolar Mood Episode', 'Psychotic Symptoms', 'Suicidal Ideation'],
        department: 'psychiatry',
        urgency: 'urgent'
      },
      'dermatology': {
        keywords: ['rash', 'skin', 'itching', 'hives', 'bumps', 'lesion', 'acne', 'eczema', 'dermatitis'],
        relatedQuestions: [
          'When did the rash first appear?',
          'Is it spreading?',
          'Are you experiencing any itching or pain?',
          'Have you changed any products (soap, detergent) recently?'
        ],
        possibleConditions: ['Eczema', 'Allergic Dermatitis', 'Contact Dermatitis', 'Psoriasis', 'Acne Vulgaris'],
        department: 'dermatology',
        urgency: 'non-urgent'
      },
      'ophthalmology': {
        keywords: ['eye', 'vision', 'blurry', 'cant see', 'eye pain', 'red eye', 'blind', 'whites of my eyes'],
        relatedQuestions: [
          'Is the vision change in one or both eyes?',
          'Did this come on suddenly?',
          'Are you experiencing any pain or redness?',
          'Do you see any floaters or flashing lights?'
        ],
        possibleConditions: ['Conjunctivitis', 'Glaucoma', 'Retinal Detachment / Pathology', 'Eye Strain'],
        department: 'ophthalmology',
        urgency: 'semi-urgent'
      },
      'ent': {
        keywords: [
          'sore throat', 'trouble swallowing', 'earache', 'ear discharge', 'tinnitus', 'ringing ears',
          'hearing loss', 'nasal congestion', 'runny nose', 'sinus pressure', 'nosebleed', 'hoarseness',
          'lost voice', 'dizziness', 'swallowed object', 'choking sensation', 'swollen tonsils',
          'earwax impaction', 'sneezing', 'loss of smell', 'throat', 'swallow', 'saliva', 'ear', 'ear pain',
          'fluid leaking', 'nose', 'blocked nose', 'sinus', 'pressure behind eyes', 'fishbone', 'stuck in throat',
          'ringing', 'hoarse', 'deep inside my right ear', 'ringing sound in my left ear', 'ent',
          'otolaryngology', 'otolaryngologist', 'ear nose throat', 'ear nose and throat'
        ],
        relatedQuestions: [
          'Do you have a fever, difficulty swallowing, or trouble breathing?',
          'Is there any discharge, fluid, or blood leaking from your ears or nose?',
          'Do you feel like there is a foreign object stuck in your throat?',
          'How long have you been experiencing the ringing or pressure?'
        ],
        possibleConditions: ['Streptococcal Pharyngitis / Tonsillitis', 'Otitis Media', 'Sinusitis', 'Foreign Body in Throat', 'Tinnitus'],
        department: 'ent',
        urgency: 'semi-urgent'
      },
      'emergency': {
        keywords: [
          'severe bleeding', 'hemorrhage', 'unresponsive', 'unconscious', 'choking', 'anaphylaxis',
          'allergic reaction', 'breathing stopped', 'poisoning', 'overdose', 'severe burn', 'deep laceration',
          'head trauma', 'car crash', 'electrocution', 'drowning', 'gunshot wound', 'stab wound', 'venomous bite',
          'sudden collapse', 'bleach', 'poison', 'ingested', 'bleeding to stop', 'deep cut', 'knife slipped',
          'stung by a bee', 'bee sting', 'lips are swelling', 'throat feels really tight', 'collapsed',
          'not responding', 'not breathing', 'car accident', 'concussion', 'head pounding', 'blurry vision',
          'throwing up', 'passed out', 'not waking up', 'fainted', 'emergency', 'trauma', 'accident', 'er', 'ed'
        ],
        relatedQuestions: [
          'Is the person conscious and breathing?',
          'Are they experiencing severe bleeding that won\'t stop?',
          'Are there signs of a severe allergic reaction like lip swelling or difficulty breathing?',
          'Was there any loss of consciousness or head injury?'
        ],
        possibleConditions: ['Chemical Poisoning / Ingestion', 'Severe Uncontrolled Hemorrhage', 'Anaphylactic Shock', 'Cardiorespiratory Collapse', 'Traumatic Brain Injury / Concussion'],
        department: 'emergency',
        urgency: 'emergency'
      },
      'pediatrics': {
        keywords: [
          'son', 'daughter', 'child', 'baby', 'toddler', 'pediatric', 'years old', 'year old', 'infant', 'three-year-old'
        ],
        relatedQuestions: [
          'How old is your child?',
          'What is their current temperature?',
          'Are they able to keep fluids down and are they active?',
          'Is their breathing fast, labored, or noisy?'
        ],
        possibleConditions: ['Pediatric Infection', 'Pediatric Evaluation Required'],
        department: 'pediatrics',
        urgency: 'semi-urgent'
      },
      'general-medicine': {
        keywords: [
          'fever', 'chills', 'fatigue', 'weight loss', 'abdominal pain', 'stomach ache', 'nausea', 'vomiting',
          'diarrhea', 'constipation', 'heartburn', 'rash', 'itchy skin', 'jaundice', 'frequent urination',
          'extreme thirst', 'persistent cough', 'dehydration', 'body aches', 'swollen lymph nodes',
          'temperature', 'thirsty', 'pee', 'urinating', 'exhausted', 'tired', 'cough', 'dry cough',
          'stomach burning', 'throw up', 'acid reflux', 'yellow eyes', 'spreading redness', 'cut on my leg',
          'hot to the touch', 'cellulitis', 'infection', 'weeks', 'malaise', 'general medicine',
          'internal medicine', 'internist', 'gp', 'general practitioner'
        ],
        relatedQuestions: [
          'How long have you had these symptoms?',
          'Do you have a fever, chills, or any localized heat or swelling?',
          'Are you experiencing unexplained weight changes, excessive thirst, or changes in urination?',
          'Have you noticed any yellowing of your skin or eyes?'
        ],
        possibleConditions: ['Diabetes Mellitus', 'GERD / Gastric Dyspepsia', 'Chronic Cough / Bronchitis', 'Jaundice / Hepatitis', 'Skin Infection / Cellulitis'],
        department: 'general-medicine',
        urgency: 'semi-urgent'
      }
    };
  }

  analyze(text) {
    const lowerText = text.toLowerCase().trim();

    // 1. Direct matched phrases lookup
    for (const item of CLINICAL_PROMPTS_LOOKUP) {
      const allMatched = item.phrases.every(p => lowerText.includes(p));
      if (allMatched) {
        return {
          matched: true,
          categories: [item.department],
          relatedQuestions: item.relatedQuestions,
          possibleConditions: item.possibleConditions,
          department: item.department,
          urgency: item.urgency
        };
      }
    }

    // 2. Score-based fallback matching
    const scores = {};
    const matchedKeywords = {};
    
    // Define strong indicators to prevent misclassification
    const strongIndicators = {
      'cardiology': [
        'chest pain', 'tightness', 'squeezing', 'palpitations', 'racing heart', 'irregular heartbeat',
        'shortness of breath', 'radiating pain', 'arm numbness', 'sweating', 'dizziness', 'fainting',
        'high blood pressure', 'swollen ankles', 'fluttering', 'heart attack', 'angina', 'heavy chest',
        'jaw pain', 'fatigue', 'chest', 'chest pressure', 'heart pain', 'skipping beats', 'breathless',
        'crushing pressure', 'squeezing feeling', 'heart feels like', 'stabbing pain on the left side',
        'cardiology', 'cardiologist', 'heart', 'cardiac'
      ],
      'orthopedics': [
        'joint pain', 'swelling', 'fracture', 'broken bone', 'sprain', 'stiffness', 'limited mobility',
        'popping sound', 'locking joint', 'arthritis', 'inflammation', 'dislocation', 'lower back pain',
        'sciatica', 'muscle spasm', 'tingling', 'ligament tear', 'knee pain', 'shoulder injury', 'limping',
        'ankle', 'knee', 'shoulder', 'joint', 'bone', 'stiff', 'back ache', 'lower back', 'pop', 'twist',
        'broken', 'arm numb', 'shoulder pain', 'knee locked', 'joints', 'ache constantly', 'straighten my leg',
        'stiff and achy', 'back hurts', 'spine', 'backache', 'orthopedics', 'orthopedic', 'orthopedist',
        'bones and joints', 'leg pain'
      ],
      'neurology': [
        'headache', 'migraine', 'dizziness', 'vertigo', 'numbness', 'tingling', 'pins and needles',
        'muscle weakness', 'seizure', 'tremor', 'shaking', 'slurred speech', 'facial drooping', 'confusion',
        'memory loss', 'paralysis', 'loss of balance', 'fainting', 'blurred vision', 'brain fog',
        'head pain', 'head hurts', 'throbbing head', 'head pressure', 'balance', 'numb', 'speech', 'slurred',
        'dizzy', 'spinning', 'thunderclap', 'worst headache', 'face feels totally numb',
        'shaking uncontrollably', 'speech sounds slurred', 'spinning violently', 'neurology', 'neurologist',
        'brain', 'nerve', 'nerves', 'nervous system'
      ],
      'psychiatry': [
        'anxiety', 'depression', 'panic attack', 'dread', 'hallucinations', 'hearing voices', 'delusions',
        'insomnia', 'mania', 'racing thoughts', 'suicidal thoughts', 'mood swings', 'agitation', 'withdrawal',
        'hopelessness', 'crying spells', 'paranoia', 'self-harm', 'selfharm', 'self harm', 'trauma', 'apathy',
        'depressed', 'anxious', 'panic', 'suicidal', 'hopeless', 'sadness', 'cant sleep',
        'voices', 'racing mind', 'overwhelmed', 'point in keeping going', 'take on the world',
        'scaring my family', 'psychiatry', 'psychiatrist', 'mental health', 'mental'
      ],
      'obstetrics': [
        'pelvic pain', 'severe cramps', 'irregular periods', 'heavy bleeding', 'spotting', 'vaginal discharge',
        'itching', 'burning', 'hot flashes', 'night sweats', 'breast lump', 'pregnancy', 'miscarriage',
        'contractions', 'water broke', 'painful sex', 'menopause', 'missed period', 'foul odor', 'morning sickness',
        'pregnant', 'labor', 'period', 'periods', 'menstruation', 'cramps', 'lump in breast',
        'burning and itching down there', 'discharge', 'foul-smelling', 'gynecology', 'obstetrics',
        'gynecologist', 'obstetrician', 'womens health'
      ],
      'ent': [
        'sore throat', 'trouble swallowing', 'earache', 'ear discharge', 'tinnitus', 'ringing ears',
        'hearing loss', 'nasal congestion', 'runny nose', 'sinus pressure', 'nosebleed', 'hoarseness',
        'lost voice', 'dizziness', 'swallowed object', 'choking sensation', 'swollen tonsils',
        'earwax impaction', 'sneezing', 'loss of smell', 'throat', 'swallow', 'saliva', 'ear', 'ear pain',
        'fluid leaking', 'nose', 'blocked nose', 'sinus', 'pressure behind eyes', 'fishbone', 'stuck in throat',
        'ringing', 'hoarse', 'deep inside my right ear', 'ringing sound in my left ear', 'ent',
        'otolaryngology', 'otolaryngologist', 'ear nose throat', 'ear nose and throat'
      ],
      'general-medicine': [
        'fever', 'chills', 'fatigue', 'weight loss', 'abdominal pain', 'stomach ache', 'nausea', 'vomiting',
        'diarrhea', 'constipation', 'heartburn', 'rash', 'itchy skin', 'jaundice', 'frequent urination',
        'extreme thirst', 'persistent cough', 'dehydration', 'body aches', 'swollen lymph nodes',
        'temperature', 'thirsty', 'pee', 'urinating', 'exhausted', 'tired', 'cough', 'dry cough',
        'stomach burning', 'throw up', 'acid reflux', 'yellow eyes', 'spreading redness', 'cut on my leg',
        'hot to the touch', 'cellulitis', 'infection', 'weeks', 'malaise', 'general medicine',
        'internal medicine', 'internist', 'gp', 'general practitioner'
      ],
      'emergency': [
        'severe bleeding', 'hemorrhage', 'unresponsive', 'unconscious', 'choking', 'anaphylaxis',
        'allergic reaction', 'breathing stopped', 'poisoning', 'overdose', 'severe burn', 'deep laceration',
        'head trauma', 'car crash', 'electrocution', 'drowning', 'gunshot wound', 'stab wound', 'venomous bite',
        'sudden collapse', 'bleach', 'poison', 'ingested', 'bleeding to stop', 'deep cut', 'knife slipped',
        'stung by a bee', 'bee sting', 'lips are swelling', 'throat feels really tight', 'collapsed',
        'not responding', 'not breathing', 'car accident', 'concussion', 'head pounding', 'blurry vision',
        'throwing up', 'passed out', 'not waking up', 'fainted', 'emergency', 'trauma', 'accident', 'er', 'ed'
      ]
    };

    for (const [category, pattern] of Object.entries(this.symptomPatterns)) {
      scores[category] = 0;
      matchedKeywords[category] = [];
      
      // Standard keywords check (weight = 1)
      for (const keyword of pattern.keywords) {
        if (matchesKeyword(lowerText, keyword)) {
          scores[category] += 1;
          matchedKeywords[category].push(keyword);
        }
      }
      
      // Strong keywords check (weight = 10)
      const categoryStrong = strongIndicators[category] || [];
      for (const strongKw of categoryStrong) {
        if (matchesKeyword(lowerText, strongKw)) {
          scores[category] += 10;
          matchedKeywords[category].push(strongKw);
        }
      }
    }
    
    // Filter categories with positive score
    const matchedCategories = Object.keys(scores)
      .filter(cat => scores[cat] > 0)
      .sort((a, b) => scores[b] - scores[a]);

    if (matchedCategories.length === 0) {
      return {
        matched: false,
        relatedQuestions: [
          'Can you describe your main symptom in more detail?',
          'When did you first notice this issue?',
          'On a scale of 1-10, how would you rate your discomfort?',
          'Is there anything that makes it better or worse?'
        ],
        possibleConditions: [],
        department: 'general-medicine',
        urgency: 'non-urgent'
      };
    }

    const primary = matchedCategories[0];
    const pattern = this.symptomPatterns[primary];
    
    // Get all matched categories for compiling questions and conditions
    const allQuestions = [];
    const allConditions = [];
    for (const cat of matchedCategories) {
      allQuestions.push(...this.symptomPatterns[cat].relatedQuestions);
      allConditions.push(...this.symptomPatterns[cat].possibleConditions);
    }

    return {
      matched: true,
      categories: matchedCategories,
      relatedQuestions: [...new Set(allQuestions)].slice(0, 4),
      possibleConditions: [...new Set(allConditions)],
      department: primary,
      urgency: pattern.urgency
    };
  }

  getClarifyingQuestions(symptoms, existingResponses = {}) {
    const analysis = this.analyze(symptoms);
    const answeredTopics = Object.keys(existingResponses);
    return analysis.relatedQuestions.filter(q =>
      !answeredTopics.some(topic => q.toLowerCase().includes(topic.toLowerCase()))
    );
  }
}

module.exports = new SymptomAnalyzer();
