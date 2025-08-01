const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./data/mymoolah.db');

const userId = 6;
const newPassword = 'Andre123!';
const newPhoneNumber = '+27825571055'; // Correct format

const saltRounds = 12;
const passwordHash = bcrypt.hashSync(newPassword, saltRounds);

console.log('Password hash:', passwordHash);

db.run(`UPDATE users SET password_hash = ?, phoneNumber = ? WHERE id = ?`, [passwordHash, newPhoneNumber, userId], function(err) {
    if (err) {
        console.error('Error updating password:', err.message);
    } else {
        console.log(`Password and phone number updated successfully for user ID ${userId}`);
    }
    db.close();
}); 