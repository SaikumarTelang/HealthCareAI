const aiService = require('./services/aiService');
const symptomAnalyzer = require('./services/symptomAnalyzer');

const inputs = [
  '1. Cardiology (Chest Pain & Heart Issues)\n"Doctor, I\'ve had this crushing pressure in the center of my chest for the last 20 minutes, and the pain is starting to spread down my left arm."',
  '1. Cardiology (Chest Pain & Heart Issues)',
  'Doctor, I\'ve had this crushing pressure in the center of my chest for the last 20 minutes, and the pain is starting to spread down my left arm.',
  'Whenever I climb the stairs, I get a tight, squeezing feeling in my chest, but it usually goes away after I sit down for a few minutes.',
  '2. Orthopedics (Leg Pain, Bones & Joints)\n"I twisted my ankle playing basketball, and heard a loud pop. Now it\'s swollen like a balloon and I can\'t put any weight on it at all."',
  'Some unrelated normal prompt that is medical like I feel sick and have a fever',
  'A completely non-medical prompt like write a python function to add two numbers'
];

async function run() {
  for (const text of inputs) {
    const isMed = await aiService.isMedicalQuery(text);
    const local = symptomAnalyzer.analyze(text);
    console.log(`Input: ${text.substring(0, 80).replace(/\n/g, '\\n')}...`);
    console.log(`  - isMedicalQuery: ${isMed}`);
    console.log(`  - symptomAnalyzer matched: ${local.matched} (Dept: ${local.department})\n`);
  }
}

run().catch(console.error);
