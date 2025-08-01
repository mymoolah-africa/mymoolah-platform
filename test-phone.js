function normalizeSAMobileNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with 2727, fix it to just 27
  if (cleaned.startsWith('2727')) {
    cleaned = '27' + cleaned.substring(4);
  }
  
  // If it starts with 27 but not 2727, it's already in the right format
  if (cleaned.startsWith('27') && cleaned.length === 11) {
    cleaned = '+27' + cleaned.substring(2);
  }
  
  // If it starts with 0, replace with +27
  if (cleaned.startsWith('0')) {
    cleaned = '+27' + cleaned.substring(1);
  }
  
  // If it doesn't start with +, add +27
  if (!cleaned.startsWith('+')) {
    cleaned = '+27' + cleaned;
  }
  
  return cleaned;
}

console.log('Original:', '27825571055');
console.log('Normalized:', normalizeSAMobileNumber('27825571055'));
console.log('Original:', '+27825571055');
console.log('Normalized:', normalizeSAMobileNumber('+27825571055'));
console.log('Original:', '0825571055');
console.log('Normalized:', normalizeSAMobileNumber('0825571055'));
console.log('Original:', '+2727825571055');
console.log('Normalized:', normalizeSAMobileNumber('+2727825571055')); 