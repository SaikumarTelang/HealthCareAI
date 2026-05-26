require('dotenv').config();
const aiService = require('./services/aiService');
const fs = require('fs');
const path = require('path');

const testCases = [
  {
    case_id: "T1",
    input: "mild cough, no fever, normal breathing",
    expected: "Low"
  },
  {
    case_id: "T2",
    input: "fever and breathlessness",
    expected: "High"
  },
  {
    case_id: "T3",
    input: "chest pain, sweating, dizziness",
    expected: "Critical"
  },
  {
    case_id: "T4",
    input: "I have had chest pressure for 3 hours. I feel sweaty and lightheaded.",
    expected: "Critical"
  }
];

const promptVersions = ["v1", "v2"];

async function runEvaluation() {
  console.log("=== STARTING ADVANCED PROMPT EVALUATION ===");
  const allResults = [];
  const reportsDir = path.join(__dirname, 'reports');
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }

  for (const version of promptVersions) {
    console.log(`\n--- Evaluating Prompt Version: ${version} ---`);
    let passedCount = 0;

    for (const testCase of testCases) {
      console.log(`Evaluating Case ${testCase.case_id}: "${testCase.input.substring(0, 40)}..."`);
      try {
        const analysis = await aiService.analyzeSymptoms(testCase.input, '', version);
        const predicted = analysis.severity;
        const passed = predicted === testCase.expected;
        
        if (passed) passedCount++;

        allResults.push({
          version,
          case_id: testCase.case_id,
          input: testCase.input,
          expected: testCase.expected,
          predicted: predicted,
          pass: passed,
          reasoning: analysis.reasoning || analysis.reason
        });

        console.log(`  - Expected: ${testCase.expected}, Predicted: ${predicted} [${passed ? 'PASS' : 'FAIL'}]`);
      } catch (error) {
        console.error(`  - Error evaluating case ${testCase.case_id}:`, error.message);
      }
    }

    const accuracy = (passedCount / testCases.length) * 100;
    console.log(`Version ${version} Accuracy: ${accuracy.toFixed(2)}%`);
  }

  // Save JSON report
  const jsonPath = path.join(reportsDir, `evaluation_report_${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));

  // Save CSV report (simple version)
  const csvPath = path.join(reportsDir, `evaluation_report_${Date.now()}.csv`);
  const csvHeaders = "version,case_id,expected,predicted,pass\n";
  const csvRows = allResults.map(r => `${r.version},${r.case_id},${r.expected},${r.predicted},${r.pass}`).join('\n');
  fs.writeFileSync(csvPath, csvHeaders + csvRows);

  console.log(`\n=== EVALUATION COMPLETE ===`);
  console.log(`JSON Report: ${jsonPath}`);
  console.log(`CSV Report: ${csvPath}`);
}

if (require.main === module) {
  runEvaluation();
}

module.exports = runEvaluation;
