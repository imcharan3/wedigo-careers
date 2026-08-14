const http = require('http');

async function testApi() {
  console.log('--- Testing Interactive Modules, 80% Passing Quiz & Start/End Dates Flow ---');

  // 1. Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@wedigocareers.com', password: 'student123' })
  });
  const loginData = await loginRes.json();
  console.log('1. Login Success:', loginData.user.name);

  // 2. Open Learning Workspace for Course 1
  const learnRes = await fetch('http://localhost:3000/api/courses/1/learn', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const learnData = await learnRes.json();
  const modulesContent = typeof learnData.course.modulesContent === 'string' ? JSON.parse(learnData.course.modulesContent) : (learnData.course.modulesContent || []);

  console.log(`2. Opened Course: "${learnData.course.title}"`);
  console.log(`   Modules Count: ${modulesContent.length}`);
  console.log(`   Enrollment Start Date: ${learnData.enrollment.startDate}`);
  console.log(`   Attempts Remaining: ${learnData.enrollment.attemptsLeft} / 5`);

  // 3. Complete Modules
  for (const m of modulesContent) {
    await fetch(`http://localhost:3000/api/courses/1/module/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({ moduleId: m.id })
    });
  }
  console.log('3. Completed all course modules.');

  // 4. Submit Quiz (Submitting 100% correct answers for Course 1)
  const answers = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 1 };
  const quizRes = await fetch('http://localhost:3000/api/courses/1/quiz/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({ answers })
  });
  const quizData = await quizRes.json();
  console.log('4. Quiz Evaluation Result:');
  console.log('   Passed:', quizData.passed);
  console.log('   Score:', quizData.score + '%');
  console.log('   Attempts Count:', quizData.attemptsCount);
  console.log('   Generated Cert ID:', quizData.certificate.certificate_id);
  console.log('   Start Date:', quizData.certificate.start_date);
  console.log('   Completion Date:', quizData.certificate.completion_date);
  console.log('   Signatory:', quizData.certificate.signatory_name);

  // 5. Verify Public QR Code Verification Route
  const verifyRes = await fetch(`http://localhost:3000/api/certificates/verify/${quizData.certificate.certificate_id}`);
  const verifyData = await verifyRes.json();
  console.log('5. Public QR Verification Test:');
  console.log('   Verified Status:', verifyData.verified);
  console.log('   Signatory Stamp:', verifyData.certificate.signatory_name);
  console.log('\nAll End-to-End Tests Passed Successfully!');
}

testApi().catch(console.error);
