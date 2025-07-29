const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'data', 'mymoolah.db');
const db = new sqlite3.Database(dbPath);

// Update Andre's password
const updateAndrePassword = () => {
  const newPassword = 'Andre123!';
  const saltRounds = 12;
  const hashedPassword = bcrypt.hashSync(newPassword, saltRounds);

  const query = `
    UPDATE users 
    SET password_hash = ? 
    WHERE phoneNumber = '27825571055'
  `;

  db.run(query, [hashedPassword], function(err) {
    if (err) {
      console.error('❌ Error updating Andre password:', err.message);
    } else {
      console.log('✅ Successfully updated Andre password!');
      console.log('New password:', newPassword);
      console.log('Phone number: 27825571055');
      console.log('You can now login with these credentials.');
    }
    db.close();
  });
};

// Run the script
updateAndrePassword(); 