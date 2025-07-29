const bcrypt = require('bcrypt');

// Andre's hashed password from the database
const andrePasswordHash = '$2a$12$I4YDb2eZTC1XUn5mqJR.3Ox6wkmXKChE6z0nFiRKNckgczwGUWLKy';

// Common passwords to test
const testPasswords = [
  'password123',
  'Demo123!',
  'Password123!',
  'andre123',
  'Andre123!',
  'mymoolah123',
  'MyMoolah123!',
  '0825571055',
  '27825571055'
];

console.log('Testing passwords for Andre Botes...\n');

testPasswords.forEach(password => {
  const isMatch = bcrypt.compareSync(password, andrePasswordHash);
  console.log(`Password: "${password}" - ${isMatch ? '✅ MATCH!' : '❌ No match'}`);
});

console.log('\nIf none match, Andre might have registered with a different password.'); 