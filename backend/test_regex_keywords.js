function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Support optional standard English suffixes (s, es, ed, ing) for single words
  const pattern = keyword.includes(' ') 
    ? '\\b' + escaped + '\\b' 
    : '\\b' + escaped + '(s|es|ed|ing)?\\b';
  const regex = new RegExp(pattern, 'i');
  return regex.test(text);
}

const testCases = [
  { text: 'I have many years of experience', keyword: 'ear', expected: false },
  { text: 'Write a python function to clear the screen', keyword: 'ear', expected: false },
  { text: 'I want to learn programming', keyword: 'ear', expected: false },
  { text: 'My right ear is hurting', keyword: 'ear', expected: true },
  { text: 'Both ears are ringing', keyword: 'ear', expected: true },
  
  { text: 'A completely non-medical prompt like write a python function to add two numbers', keyword: 'numb', expected: false },
  { text: 'My left arm feels completely numb', keyword: 'numb', expected: true },
  { text: 'My fingers are numbed from the cold', keyword: 'numb', expected: true },

  { text: 'The population of France is 67 million', keyword: 'pop', expected: false },
  { text: 'I heard a loud pop in my ankle', keyword: 'pop', expected: true },

  { text: 'I like painting landscapes', keyword: 'pain', expected: false },
  { text: 'I have chest pain', keyword: 'chest pain', expected: true }
];

console.log("=== REGEX KEYWORD MATCHING TEST ===");
let passed = 0;
for (const tc of testCases) {
  const result = matchesKeyword(tc.text, tc.keyword);
  const ok = result === tc.expected;
  if (ok) passed++;
  console.log(`Text: "${tc.text}"`);
  console.log(`  Keyword: "${tc.keyword}" | Expected: ${tc.expected} | Got: ${result} [${ok ? 'PASS' : 'FAIL'}]`);
}
console.log(`\nPassed: ${passed}/${testCases.length}`);
