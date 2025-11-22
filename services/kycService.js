const OpenAI = require('openai');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

function normalizeName(name) {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function splitFullName(fullName) {
  const parts = normalizeName(fullName).split(' ').filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(' ');
  return { first, last };
}

// Lightweight Jaro-Winkler similarity
function jaroWinkler(s1, s2) {
  const m = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  let matches = 0;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - m);
    const end = Math.min(i + m + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / s1.length + matches / s2.length + (matches - t) / matches) / 3;
  // Winkler boost for common prefix up to 4
  let l = 0;
  while (l < 4 && l < s1.length && l < s2.length && s1[l] === s2[l]) l++;
  const p = 0.1;
  return jaro + l * p * (1 - jaro);
}

function tolerantFirstNameMatch(docFirst, userFirst) {
  const a = normalizeName(docFirst);
  const b = normalizeName(userFirst);
  if (!a || !b) return false;
  if (a === b) return true;
  // Prefix acceptance (length >= 4)
  if ((a.startsWith(b) || b.startsWith(a)) && Math.min(a.length, b.length) >= 4) return true;
  // Similarity threshold
  return jaroWinkler(a, b) >= 0.88;
}

function lightFirstNameMatch(docFirst, userFirst) {
  // FIRST NAMES ARE COMPLETELY IGNORED - Always return match
  // Users may enter different first names than on official documents
  // (e.g., initials like "HD" for "Hennie Daniël", "JP" for "Johan Petrus",
  // nicknames, abbreviations, etc.) - all are acceptable
  return { matches: true, similarity: 1.0, reason: 'First names ignored - always accepted' };
}

function isValidSouthAfricanId(idNumber) {
  const digits = (idNumber || '').replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  // Luhn checksum
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Normalize commonly misread OCR characters to digits for SA IDs
function normalizeIdDigits(raw) {
  const s = (raw || '').toString().toUpperCase().replace(/\s|[^0-9A-Z]/g, '');
  return s
    .replace(/O/g, '0')
    .replace(/[I|l]/g, '1')
    .replace(/B/g, '8')
    .replace(/S/g, '5')
    .replace(/Z/g, '2')
    .replace(/G/g, '6')
    .replace(/Q/g, '0')
    .replace(/D/g, '0')
    .replace(/[^0-9]/g, '');
}

// Normalize surname text from OCR for robust matching
function normalizeSurnameOCR(raw) {
  const s = (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Join stray internal spaces like "BH OES" => "BHOES"
  const compact = s.replace(/\b([A-Z])\s+([A-Z]{2,})\b/g, '$1$2').replace(/\s+/g, '');

  // Map common OCR digit/letter confusions back to letters
  return compact
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/2/g, 'Z')
    .replace(/8/g, 'B')
    .replace(/6/g, 'G')
    .replace(/4/g, 'A');
}

// Normalize name for comparison (removes diacritics, converts to uppercase)
function normalizeName(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

// Helper to split full name into first and last
function splitFullName(fullName) {
  if (!fullName) return { first: '', last: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

// Jaro-Winkler distance for fuzzy string matching
function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  
  const jaro = jaroDistance(s1, s2);
  const prefixLength = commonPrefixLength(s1, s2, 4);
  return jaro + (0.1 * prefixLength * (1 - jaro));
}

function jaroDistance(s1, s2) {
  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3.0;
}

function commonPrefixLength(s1, s2, maxLen) {
  let len = 0;
  for (let i = 0; i < Math.min(maxLen, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) len++;
    else break;
  }
  return len;
}

// First names are completely ignored - no nickname mappings needed

function isValidSouthAfricanId(idNumber) {
  const digits = (idNumber || '').replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  // Luhn checksum
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// Normalize commonly misread OCR characters to digits for SA IDs
function normalizeIdDigits(raw) {
  const s = (raw || '').toString().toUpperCase().replace(/\s|[^0-9A-Z]/g, '');
  return s
    .replace(/O/g, '0')
    .replace(/[I|l]/g, '1')
    .replace(/B/g, '8')
    .replace(/S/g, '5')
    .replace(/Z/g, '2')
    .replace(/G/g, '6')
    .replace(/Q/g, '0')
    .replace(/D/g, '0')
    .replace(/[^0-9]/g, '');
}

// Normalize surname text from OCR for robust matching
function normalizeSurnameOCR(raw) {
  const s = (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Join stray internal spaces like "BH OES" => "BHOES"
  const compact = s.replace(/\b([A-Z])\s+([A-Z]{2,})\b/g, '$1$2').replace(/\s+/g, '');

  // Map common OCR digit/letter confusions back to letters
  return compact
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    .replace(/2/g, 'Z')
    .replace(/8/g, 'B')
    .replace(/6/g, 'G')
    .replace(/4/g, 'A');
}

function isValidSouthAfricanDrivingLicense(licenseNumber) {
  const clean = (licenseNumber || '').replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{6}[A-Z]{2}$/.test(clean);
}

function isDrivingLicenseValid(expiryDate, validFromDate = null) {
  if (!expiryDate) return false;
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    // Check if expired
    if (expiry <= today) {
      return false;
    }
    
    // If valid from date is provided, check that current date is after valid from
    if (validFromDate) {
      const validFrom = new Date(validFromDate);
      validFrom.setHours(0, 0, 0, 0);
      
      if (today < validFrom) {
        return false; // License not yet valid
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

function isValidTemporaryID(idNumber) {
  const digits = (idNumber || '').replace(/\D/g, '');
  if (!/^\d{13}$/.test(digits)) return false;
  // Temporary IDs use the same format as regular SA IDs
  return isValidSouthAfricanId(idNumber);
}

function isTemporaryIDValid(expiryDate) {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry > today;
  } catch (error) {
    return false;
  }
}

function isPassportValid(expiryDate) {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry > today;
  } catch (error) {
    return false;
  }
}

class KYCService {
  constructor() {
    // Don't initialize OpenAI here - do it lazily when needed
    this.openai = null;
    this.openaiInitialized = false;
  }

  // Lazy initialization of OpenAI
  async initializeOpenAI() {
    if (this.openaiInitialized) {
      return this.openai;
    }

    try {
      if (process.env.OPENAI_API_KEY) {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });

        this.openaiInitialized = true;
      } else {

        this.openai = null;
        this.openaiInitialized = true;
      }
    } catch (error) {
      
      this.openai = null;
      this.openaiInitialized = true;
    }

    return this.openai;
  }

  // Simplified, fast image preprocessing for OCR
  async preprocessImageForOCR(localFilePath) {
    try {
      console.log('🔄 Preprocessing image for OCR...');
      
      const enhancedBuffer = await sharp(localFilePath)
        .rotate()                    // Auto-rotate
        .resize({ width: 2000, withoutEnlargement: true })  // Optimal size for OCR
        .greyscale()                 // Reduce color noise
        .normalise()                 // Enhance contrast
        .sharpen()                   // Simple sharpening
        .toBuffer();
      
      console.log('✅ Image preprocessing successful');
      return enhancedBuffer.toString('base64');
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error.message);
      // Fallback: read original file
      const fileBuffer = await fs.readFile(localFilePath);
      console.log('⚠️  Using original image (preprocessing failed)');
      return fileBuffer.toString('base64');
    }
  }

  // Tesseract OCR fallback method
  async runTesseractOCR(localFilePath) {
    try {
      console.log('🔄 Running Tesseract OCR fallback...');
      
      const { data: { text } } = await Tesseract.recognize(localFilePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            // Suppress verbose logging
          }
        }
      });
      
      console.log('✅ Tesseract OCR completed');
      return text;
    } catch (error) {
      console.error('❌ Tesseract OCR error:', error.message);
      throw new Error(`Tesseract OCR failed: ${error.message}`);
    }
  }

  // Legacy Tesseract method removed - using simplified OpenAI approach

  parseSouthAfricanIdText(plainText) {
    const text = (plainText || '').replace(/\r/g, '').trim();
    const results = {};

    // Normalized helpers
    const oneLine = text.replace(/\s+/g, ' ');
    const upper = text.toUpperCase();

    // 1) Try labelled fields (English & common Afrikaans variants) - Enhanced patterns
    const surnameMatch = upper.match(/\b(?:VAN\s*\/\s*)?SURNAME\b[:\s]*([A-Z' -]{2,})/i) || 
                        upper.match(/\bVAN\b[:\s]*([A-Z' -]{2,})/i) ||
                        upper.match(/SURNAME\s*([A-Z' -]{2,})/i);
    const namesMatch = upper.match(/\b(?:VOORNAME\s*\/\s*)?FORENAMES?\b[:\s]*([A-Z' -]{2,})/i) ||
                      upper.match(/\bVOORNAME\b[:\s]*([A-Z' -]{2,})/i) ||
                      upper.match(/FORENAMES?\s*([A-Z' -]{2,})/i);
    const idMatch = oneLine.match(/(?:Identity|Identiteit|ID|ID\.?|ID\s*No\.?|ID\s*Nr\.?|ID\s*Number|Identity\s*No\.?|I\.D\.No\.?)[:\s]*([0-9\s]{10,})/i) ||
                   oneLine.match(/\b(\d{2}\s*\d{2}\s*\d{2}\s*\d{4}\s*\d{2}\s*\d{1})\b/); // SA ID format with spaces
    const dobMatch = oneLine.match(/(?:Date\s*of\s*Birth|GEBOORTEDATUM|Geboortedatum|DATE\s*OF\s*BIRTH)[:\s\/]*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s*[A-Z]{3}\s*[0-9]{4})/i);

    if (surnameMatch) {
      const s = surnameMatch[1].trim().replace(/\s+/g, ' ');
      // Clean up common OCR errors
      const cleaned = s.replace(/[^A-Z' -]/g, '').trim();
      if (cleaned.length >= 2) {
        results.surname = cleaned;
        results.fullName = results.fullName ? `${results.fullName} ${cleaned}` : cleaned;
      }
    }
    if (namesMatch) {
      const names = namesMatch[1].trim().replace(/\s+/g, ' ');
      // Clean up common OCR errors
      const cleaned = names.replace(/[^A-Z' -]/g, '').trim();
      if (cleaned.length >= 2) {
        results.firstNames = cleaned;
        results.fullName = results.fullName ? `${cleaned} ${results.fullName}` : cleaned;
      }
    }
    if (idMatch) {
      // Extract and clean ID number
      const rawId = idMatch[1].replace(/\s+/g, '').replace(/\D/g, '');
      if (rawId.length === 13) {
        results.idNumber = rawId;
      } else if (rawId.length > 13) {
        results.idNumber = rawId.slice(0, 13);
      } else if (rawId.length >= 10) {
        // Try to pad or fix partial IDs
        results.idNumber = rawId.padEnd(13, '0').slice(0, 13);
      }
    }
    if (dobMatch) {
      const dob = dobMatch[1].trim();
      // Normalize date format to YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        results.dateOfBirth = dob;
      } else if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/i.test(dob)) {
        // Convert "16 JAN 1992" to "1992-01-16"
        const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
                        JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
        const parts = dob.toUpperCase().split(/\s+/);
        if (parts.length === 3 && months[parts[1]]) {
          const day = parts[0].padStart(2, '0');
          results.dateOfBirth = `${parts[2]}-${months[parts[1]]}-${day}`;
        }
      }
    }

    // 2) Fallbacks
    // ID number: any 13 consecutive digits
    if (!results.idNumber) {
      const any13 = oneLine.match(/\b(\d{13})\b/);
      if (any13) results.idNumber = any13[1];
    }
    // ID number: if still missing, collapse all non-digits and find valid 13-digit ID
    if (!results.idNumber) {
      const digitsOnly = text.replace(/\D/g, '');
      if (digitsOnly.length >= 13) {
        // Try to find a valid 13-digit SA ID number
        // SA ID format: YYMMDDGSSSCAZ (13 digits)
        // Try multiple positions to find the correct ID
        let foundId = null;
        
        // First, try to find a 13-digit number that passes Luhn checksum (SA ID validation)
        for (let i = 0; i <= digitsOnly.length - 13; i++) {
          const candidate = digitsOnly.slice(i, i + 13);
          if (isValidSouthAfricanId(candidate)) {
            foundId = candidate;
            break;
          }
        }
        
        // If no valid ID found by checksum, try to find one that starts with valid date digits
        // SA ID first 6 digits are date: YYMMDD (year 00-99, month 01-12, day 01-31)
        if (!foundId) {
          for (let i = 0; i <= digitsOnly.length - 13; i++) {
            const candidate = digitsOnly.slice(i, i + 13);
            const yy = parseInt(candidate.slice(0, 2), 10);
            const mm = parseInt(candidate.slice(2, 4), 10);
            const dd = parseInt(candidate.slice(4, 6), 10);
            
            // Check if it looks like a valid date (reasonable year, valid month, valid day)
            if (yy >= 0 && yy <= 99 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
              foundId = candidate;
              break;
            }
          }
        }
        
        // Last resort: use the LAST 13 digits (most likely to be the ID if there are extra digits)
        if (!foundId && digitsOnly.length > 13) {
          foundId = digitsOnly.slice(-13);
        } else if (!foundId) {
          foundId = digitsOnly.slice(0, 13);
        }
        
        results.idNumber = foundId;
      }
    }

    // Full name extraction improvements for SA ID book layout
    const lines = upper.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const onlyLetters = (txt) => txt.replace(/[^A-Z'\-\s]/g, '').trim();

    if (!results.fullName) {
      // Enhanced pattern matching for SA ID book layout
      let surIdx = lines.findIndex(l => /(\bVAN\s*\/\s*SURNAME|VAN\s+SURNAME|\bSURNAME\b)/i.test(l));
      let namesIdx = lines.findIndex(l => /(VOORNAME\s*\/\s*FORENAMES|VOORNAME|FORENAMES)/i.test(l));
      let surnameVal = null;
      let namesVal = null;
      
      if (surIdx >= 0) {
        // Scan up to 5 lines below to find surname (more tolerant)
        for (let k = 1; k <= 5 && surIdx + k < lines.length; k++) {
          const raw = lines[surIdx + k];
          // Ignore common noise lines
          if (/S\.?A\.?\s*\.?BURGER|CITIZEN|SOUTH\s*AFRICA|SUID-AFRIKA|I\.?D\.?No/i.test(raw)) continue;
          const cand = onlyLetters(raw).replace(/\s+/g, ' ').trim();
          // More lenient: allow 2+ characters, allow hyphens and apostrophes
          if (cand && /^[A-Z'\-]{2,}$/.test(cand) && cand.length <= 30) { 
            surnameVal = cand; 
            break; 
          }
        }
      }
      
      if (namesIdx >= 0) {
        // Scan up to 3 lines below FORENAMES label
        for (let k = 1; k <= 3 && namesIdx + k < lines.length; k++) {
          const raw = lines[namesIdx + k];
          // Ignore noise
          if (/S\.?A\.?\s*\.?BURGER|CITIZEN|I\.?D\.?No/i.test(raw)) continue;
          const cand = onlyLetters(raw).replace(/\s+/g, ' ').trim();
          if (cand && /[A-Z]/.test(cand) && cand.length <= 50) {
            namesVal = cand;
            break;
          }
        }
      }
      
      if (surnameVal || namesVal) {
        // Handle multiple forenames properly
        const forenames = namesVal ? namesVal.split(/\s+/).filter(w => w.length > 0).join(' ') : '';
        const surname = surnameVal || '';
        const full = `${forenames} ${surname}`.trim();
        
        if (surname.length > 0) results.surname = surname;
        if (forenames.length > 0) results.firstNames = forenames;
        if (full.length > 0) results.fullName = full;
      }
    }

    // As a fallback, choose the most probable uppercase line with 2-4 words
    if (!results.fullName) {
      let best = '';
      for (const l of lines) {
        if (/(SURNAME|NAMES?|FORENAMES|VOORNAME|IDENTITY|I\.?D\.?|DATE|BIRTH|COUNTRY|NATIONALITY|NUMBER|NO\.?|NR\.?|CITIZEN)/.test(l)) continue;
        const words = l.split(/\s+/).filter(w => /^[A-Z'\-]{2,}$/.test(w));
        if (words.length >= 2 && words.length <= 4) {
          best = words.join(' ');
          break;
        }
      }
      if (best) results.fullName = best;
    }

    // Date of birth: derive from SA ID if present and DOB missing (YYMMDDxxxxxC)
    if (!results.dateOfBirth && results.idNumber && /^\d{13}$/.test(results.idNumber)) {
      const yy = parseInt(results.idNumber.slice(0, 2), 10);
      const mm = results.idNumber.slice(2, 4);
      const dd = results.idNumber.slice(4, 6);
      const nowYY = new Date().getFullYear() % 100;
      const century = yy <= nowYY ? 2000 : 1900;
      const yyyy = century + yy;
      results.dateOfBirth = `${yyyy}-${mm}-${dd}`;
    }

    return results;
  }

  // Process document OCR using OpenAI with retry logic and manual review fallback
  async processDocumentOCR(documentUrl, documentType) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    // Validate file path
    if (!documentUrl || !documentUrl.startsWith('/uploads/')) {
      throw new Error('Invalid document URL. Only local file processing is supported.');
    }
    
    const localFilePath = require('path').join(__dirname, '..', documentUrl);
    
    // Check if file exists
    try {
      await fs.access(localFilePath);
    } catch (error) {
      throw new Error(`Document file not found: ${documentUrl}`);
    }
    
    // Initialize OpenAI
    await this.initializeOpenAI();
    
    if (!this.openai) {
      console.error('❌ OpenAI API not available');
      throw new Error('OCR service unavailable. Please contact support.');
    }
    
    // Determine MIME type
    const ext = path.extname(localFilePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') {
      mimeType = 'image/png';
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      mimeType = 'image/jpeg';
    } else if (ext === '.pdf') {
      throw new Error('PDF files are not supported. Please upload an image file (JPEG or PNG).');
    } else {
      throw new Error('Unsupported file type. Please upload an image file (JPEG or PNG).');
    }
    
    // Preprocess image
    const preprocessStartTime = Date.now();
    let imageData;
    try {
      imageData = await this.preprocessImageForOCR(localFilePath);
      const preprocessDuration = Date.now() - preprocessStartTime;
      console.log(`⏱️  Image preprocessing took ${preprocessDuration}ms`);
    } catch (preprocessError) {
      const preprocessDuration = Date.now() - preprocessStartTime;
      console.error(`❌ Image preprocessing error (${preprocessDuration}ms):`, preprocessError.message);
      // Fallback to original image
      const fallbackStartTime = Date.now();
      const fileBuffer = await fs.readFile(localFilePath);
      imageData = fileBuffer.toString('base64');
      console.log(`⏱️  Fallback image read took ${Date.now() - fallbackStartTime}ms`);
    }
    
    // Enhanced OpenAI prompt for identity documents (ID cards, ID books, and passports)
    // Note: Framed as document data extraction for verification purposes, not personal identification
    const prompt = documentType === 'id_document' 
      ? `Extract structured data from identity document. Return ONLY valid JSON, no explanation.

Fields to extract:
1. idNumber: 13 digits for SA ID/Driver's License (last 13 digits for license), 6-9 alphanumeric for passport
2. surname: Last name
3. forenames: First names (initials OK for driver's license)
4. fullName: Complete name
5. dateOfBirth: YYYY-MM-DD
6. dateIssued: YYYY-MM-DD (if visible)
7. expiryDate: YYYY-MM-DD (for driver's license: second date from "dd/mm/yyyy - dd/mm/yyyy")
8. countryOfBirth: Country name

CRITICAL: Verify ID digits carefully (6↔5, 0↔O, 1↔I, 8↔B).

Return JSON only:
{
  "idNumber": "9201165204087",
  "surname": "BOTES",
  "forenames": "HENDRIK DANIEL",
  "fullName": "HENDRIK DANIEL BOTES",
  "dateOfBirth": "1992-01-16",
  "dateIssued": "2008-04-03",
  "validFrom": "2020-01-15",
  "expiryDate": "2030-01-15",
  "countryOfBirth": "SOUTH AFRICA"
}`
      : "Extract the following information from this South African proof of address document: Street address, City, Postal code, Province. Return as JSON format.";
    
    // Retry logic for OpenAI API calls
    let lastError;
    const ocrStartTime = Date.now();
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const attemptStartTime = Date.now();
        console.log(`🔄 OpenAI OCR attempt ${attempt}/${MAX_RETRIES}...`);
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a fast, efficient OCR system. Extract data directly from the document image. Be concise - minimal reasoning, maximum accuracy. Return JSON only."
            },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { 
                  type: "image_url", 
                  image_url: {
                    url: `data:${mimeType};base64,${imageData}`,
                    detail: "low" // Low detail for fast processing - preprocessing enhances image quality for accuracy
                  }
                }
              ]
            }
          ],
          max_completion_tokens: 5000 // Restored to 5000 - system message instructs GPT-5 to be efficient with reasoning tokens
        });
        
        const attemptDuration = Date.now() - attemptStartTime;
        console.log(`⏱️  GPT-5 OCR attempt ${attempt} took ${attemptDuration}ms`);
        
        // Log full response structure for debugging (GPT-5 might have different format)
        console.log('📋 OpenAI API Response Structure:', {
          hasResponse: !!response,
          hasChoices: !!(response?.choices),
          choicesLength: response?.choices?.length || 0,
          model: response?.model,
          usage: response?.usage,
          firstChoice: response?.choices?.[0] ? {
            hasMessage: !!response.choices[0].message,
            hasContent: !!response.choices[0].message?.content,
            contentLength: response.choices[0].message?.content?.length || 0,
            finishReason: response.choices[0].finish_reason
          } : null
        });
        
        // Validate response structure
        if (!response || !response.choices || response.choices.length === 0) {
          console.error('❌ OpenAI returned invalid response structure:', JSON.stringify(response, null, 2));
          throw new Error('OpenAI returned invalid response structure');
        }
        
        const content = response.choices[0]?.message?.content || '';
        const finishReason = response.choices[0]?.finish_reason;
        
        // Log finish reason - GPT-5 might stop for different reasons
        if (finishReason) {
          console.log('📋 OpenAI Finish Reason:', finishReason);
        }
        
        // Log raw OpenAI response for debugging
        console.log('📄 Raw OpenAI OCR Response:', content ? content.substring(0, 500) : '(empty)'); // First 500 chars
        
        // Log response metadata for debugging
        if (response.model) {
          console.log('📋 OpenAI Model Used:', response.model);
        }
        if (response.usage) {
          console.log('📊 OpenAI Token Usage:', response.usage);
        }
        
        // Check if OpenAI refused due to content policy - CHECK FIRST before parsing
        // Detect various refusal patterns from OpenAI
        const isRefusal = /i'?m\s*sorry/i.test(content) ||
            /i'?m\s*unable/i.test(content) || 
            /can'?t\s*help/i.test(content) || 
            /can'?t\s*extract/i.test(content) ||
            /can'?t\s*assist/i.test(content) ||
            /unable to assist/i.test(content) ||
            /unable to provide/i.test(content) ||
            /unable to extract/i.test(content) ||
            /identifying.*individuals/i.test(content) ||
            /personal.*documents/i.test(content) ||
            /i\s*can'?t/i.test(content);
        
        // Also check if response is not JSON and contains refusal language
        const hasJson = /\{[\s\S]*\}/.test(content);
        if (isRefusal || (!hasJson && /sorry|can'?t|unable/i.test(content))) {
          console.warn('⚠️  OpenAI refused due to content policy - will use Tesseract fallback');
          console.warn('📄 OpenAI response:', content.substring(0, 200));
          const refusalError = new Error('OpenAI content policy refusal - using Tesseract fallback');
          refusalError.isContentPolicyRefusal = true;
          refusalError.openaiResponse = content; // Store response for later check
          throw refusalError;
        }
        
        // Check if content is empty
        if (!content || content.trim().length === 0) {
          console.error('❌ OpenAI returned empty content');
          const emptyError = new Error('OpenAI returned empty response');
          emptyError.isEmptyResponse = true;
          throw emptyError;
        }
        
        // Parse results
        const parsedResults = this.parseOCRResults(content, documentType);
        
        // Log parsed results for debugging
        console.log('🔍 Parsed OCR Results:', JSON.stringify(parsedResults, null, 2));
        
        // Validate critical fields
        if (documentType === 'id_document') {
          // Clean ID/passport number (remove spaces, keep alphanumeric for passports)
          const rawIdNumber = parsedResults.idNumber ? String(parsedResults.idNumber).trim().replace(/\s+/g, '') : '';
          
          // Check if it's a 13-digit SA ID or a 6-9 character passport number
          const isSAId = /^\d{13}$/.test(rawIdNumber);
          const isPassport = /^[A-Z0-9]{6,9}$/i.test(rawIdNumber);
          const hasIdNumber = isSAId || isPassport;
          
          // Check for name (surname, forenames, or fullName)
          const hasName = (parsedResults.surname?.trim().length >= 2) || 
                         (parsedResults.forenames?.trim().length >= 2) ||
                         (parsedResults.fullName?.trim().length >= 2);
          
          // Log what was extracted for debugging
          console.log('📋 OCR Extraction Results:', {
            idNumber: parsedResults.idNumber,
            rawIdNumber: rawIdNumber,
            isSAId: isSAId,
            isPassport: isPassport,
            hasIdNumber: hasIdNumber,
            surname: parsedResults.surname,
            forenames: parsedResults.forenames,
            fullName: parsedResults.fullName,
            hasName: hasName
          });
          
          if (!hasIdNumber || !hasName) {
            console.warn('⚠️  OpenAI OCR missing critical fields', {
              idNumberPresent: !!parsedResults.idNumber,
              idNumberValid: hasIdNumber,
              namePresent: hasName,
              extractedData: parsedResults
            });
            throw new Error(`Critical fields missing from OCR extraction. ID Number: ${hasIdNumber ? 'OK' : 'MISSING/INVALID'}, Name: ${hasName ? 'OK' : 'MISSING'}`);
          }
        }
        
        const ocrTotalDuration = Date.now() - ocrStartTime;
        console.log(`✅ OpenAI OCR successful - Total OCR time: ${ocrTotalDuration}ms`);
        return parsedResults;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ OpenAI OCR attempt ${attempt} failed:`, error.message);
        
        // Log full error details for debugging (especially for model errors)
        if (error.status || error.code || error.response) {
          console.error('📋 OpenAI API Error Details:', {
            status: error.status,
            code: error.code,
            message: error.message,
            response: error.response?.data || error.response?.statusText
          });
        }
        
        // Check if it's a content policy refusal (from our detection above)
        if (error.isContentPolicyRefusal || error.message.includes('content policy refusal')) {
          // Don't retry - go straight to Tesseract fallback
          console.log('🔄 Content policy refusal detected - will use Tesseract fallback after all attempts');
          // Preserve the refusal flag and response for later check
          if (error.openaiResponse) {
            lastError.openaiResponse = error.openaiResponse;
          }
          lastError.isContentPolicyRefusal = true;
          break;
        }
        
        // Check if it's an empty response or invalid model error - should trigger fallback
        if (error.isEmptyResponse || 
            error.message.includes('empty response') ||
            error.message.includes('invalid model') ||
            error.code === 'invalid_model' ||
            error.status === 404) {
          console.log('🔄 Empty response or invalid model detected - will use Tesseract fallback after all attempts');
          lastError.isEmptyResponse = true;
          break;
        }
        
        // If it's a rate limit or temporary error, retry
        if (attempt < MAX_RETRIES && (
          error.message.includes('rate limit') || 
          error.message.includes('timeout') ||
          error.status === 429 ||
          error.status === 503
        )) {
          const delay = RETRY_DELAY * attempt; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's a permanent error or last attempt, break
        if (attempt === MAX_RETRIES || error.status === 401 || error.status === 400) {
          break;
        }
      }
    }
    
    // All retries failed - try Tesseract fallback if OpenAI refused or returned empty
    // Check if it was a content policy refusal or empty response
    const wasContentPolicyRefusal = lastError?.isContentPolicyRefusal ||
      (lastError?.message && lastError.message.includes('content policy refusal')) ||
      // Also check the OpenAI response content if we have it
      (lastError?.openaiResponse && (
        /i'?m\s*sorry/i.test(lastError.openaiResponse) || 
        /can'?t\s*extract|can'?t\s*assist|can'?t\s*help|unable/i.test(lastError.openaiResponse)
      ));
    
    const wasEmptyResponse = lastError?.isEmptyResponse ||
      (lastError?.message && lastError.message.includes('empty response')) ||
      (lastError?.message && lastError.message.includes('invalid model')) ||
      lastError?.code === 'invalid_model' ||
      lastError?.status === 404;
    
    if (wasContentPolicyRefusal || wasEmptyResponse) {
      const reason = wasContentPolicyRefusal ? 'content policy refusal' : 'empty response or invalid model';
      console.log(`🔄 OpenAI ${reason} confirmed - falling back to Tesseract OCR...`);
      try {
        const tesseractText = await this.runTesseractOCR(localFilePath);
        const parsedResults = this.parseSouthAfricanIdText(tesseractText);
        
        // Validate we got something useful
        if (parsedResults.idNumber || parsedResults.surname || parsedResults.fullName) {
          console.log('✅ Tesseract OCR successful');
          return parsedResults;
        } else {
          console.warn('⚠️  Tesseract OCR did not extract sufficient data');
          throw new Error('Tesseract OCR did not extract sufficient data');
        }
      } catch (tesseractError) {
        console.error('❌ Tesseract OCR fallback failed:', tesseractError.message);
        throw new Error(`OCR processing failed: OpenAI ${reason} and Tesseract failed - ${tesseractError.message}`);
      }
    }
    
    // All retries failed and no fallback available - throw error (will be caught and queued for manual review)
    console.error('❌ All OCR attempts failed. Queueing for manual review.');
    throw new Error(`OCR processing failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  // Queue document for manual review
  async queueForManualReview(userId, documentType, documentUrl, error, ocrResults = null) {
    try {
      const { sequelize } = require('../models');
      
      // Convert frontend documentType to database enum value
      const dbDocumentType = documentType === 'id_document' ? 'id_card' : 
                            documentType === 'proof_of_address' ? 'utility_bill' : 
                            documentType;
      
      // Prepare reviewer notes with error details
      const reviewerNotes = `OCR Processing Failed: ${error?.message || 'Unknown error'}\n` +
                           `Review Reason: OCR_FAILED\n` +
                           `OCR Results: ${ocrResults ? JSON.stringify(ocrResults, null, 2) : 'None'}`;
      
      // Check which columns exist in the kyc table
      let hasDocumentImageUrlColumn = false;
      let hasOcrDataColumn = false;
      try {
        const [results] = await sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'kyc' 
            AND column_name IN ('documentImageUrl', 'ocrData')
        `);
        hasDocumentImageUrlColumn = results.some(r => r.column_name === 'documentImageUrl');
        hasOcrDataColumn = results.some(r => r.column_name === 'ocrData');
      } catch (checkError) {
        console.warn('⚠️  Could not check for kyc table columns:', checkError.message);
      }
      
      // Try to add column if it doesn't exist (may fail due to permissions)
      if (!hasDocumentImageUrlColumn) {
        try {
          await sequelize.query(`
            ALTER TABLE "kyc" ADD COLUMN IF NOT EXISTS "documentImageUrl" VARCHAR(255);
          `);
          hasDocumentImageUrlColumn = true;
          console.log('✅ Added documentImageUrl column');
        } catch (colError) {
          // Permission denied or other error - use raw SQL without the column
          if (colError.message.includes('permission denied') || colError.message.includes('must be owner')) {
            console.warn('⚠️  Cannot add documentImageUrl column (permissions) - using workaround');
          } else if (!colError.message.includes('already exists')) {
            console.warn('⚠️  Could not add documentImageUrl column:', colError.message);
          }
        }
      }
      
      // Use raw SQL if column doesn't exist (to avoid Sequelize trying to SELECT it)
      if (!hasDocumentImageUrlColumn) {
        // Check if record exists
        const [existing] = await sequelize.query(`
          SELECT id FROM "kyc" 
          WHERE "userId" = :userId AND "documentType" = :documentType 
          LIMIT 1
        `, {
          replacements: { userId, documentType: dbDocumentType },
          type: sequelize.QueryTypes.SELECT
        });
        
        if (existing) {
          // Update existing record (only include columns that exist)
          const updateFields = ['"status" = \'under_review\'', '"reviewerNotes" = :reviewerNotes', '"updatedAt" = NOW()'];
          if (hasOcrDataColumn) {
            updateFields.push('"ocrData" = :ocrData::jsonb');
          }
          
          await sequelize.query(`
            UPDATE "kyc" 
            SET ${updateFields.join(', ')}
            WHERE "id" = :id
          `, {
            replacements: {
              id: existing.id,
              ...(hasOcrDataColumn ? { ocrData: JSON.stringify(ocrResults || {}) } : {}),
              reviewerNotes: reviewerNotes
            }
          });
        } else {
          // Insert new record (only include columns that exist)
          const insertColumns = ['"userId"', '"documentType"', '"documentNumber"', '"status"', '"reviewerNotes"', '"submittedAt"', '"createdAt"', '"updatedAt"'];
          const insertValues = [':userId', ':documentType', ':documentNumber', '\'under_review\'', ':reviewerNotes', 'NOW()', 'NOW()', 'NOW()'];
          
          if (hasOcrDataColumn) {
            insertColumns.splice(3, 0, '"ocrData"');
            insertValues.splice(3, 0, ':ocrData::jsonb');
          }
          
          await sequelize.query(`
            INSERT INTO "kyc" 
            (${insertColumns.join(', ')})
            VALUES 
            (${insertValues.join(', ')})
          `, {
            replacements: {
              userId,
              documentType: dbDocumentType,
              documentNumber: ocrResults?.idNumber || 'PENDING',
              ...(hasOcrDataColumn ? { ocrData: JSON.stringify(ocrResults || {}) } : {}),
              reviewerNotes: reviewerNotes
            }
          });
        }
      } else {
        // Column exists - use Sequelize normally
        const Kyc = require('../models/Kyc')(sequelize, require('sequelize').DataTypes);
        
        const recordData = {
          userId,
          documentType: dbDocumentType,
          documentNumber: ocrResults?.idNumber || 'PENDING',
          documentImageUrl: documentUrl,
          ocrData: ocrResults || {},
          status: 'under_review',
          reviewerNotes: reviewerNotes,
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const [kycRecord, created] = await Kyc.findOrCreate({
          where: { 
            userId, 
            documentType: dbDocumentType 
          },
          defaults: recordData
        });
        
        if (!created) {
          await kycRecord.update({
            documentImageUrl: documentUrl,
            ocrData: ocrResults || {},
            status: 'under_review',
            reviewerNotes: reviewerNotes,
            updatedAt: new Date()
          });
        }
      }
      
      console.log(`📋 Document queued for manual review: User ${userId}, Type: ${dbDocumentType}`);
      
      // TODO: Send notification to admin/support team
      // await this.notifySupportTeam(userId, documentType, error);
      
      return {
        success: false,
        status: 'under_review',
        message: 'Your document has been submitted for manual review. We will notify you once verification is complete.',
        requiresManualReview: true
      };
    } catch (dbError) {
      console.error('❌ Error queueing for manual review:', dbError);
      
      // Return error response instead of throwing (so user gets feedback)
      return {
        success: false,
        status: 'error',
        message: 'Error processing document. Please try again or contact support.',
        error: dbError.message,
        requiresManualReview: true
      };
    }
  }

  // Parse OCR results
  parseOCRResults(ocrText, documentType) {
    try {
      if (!ocrText || typeof ocrText !== 'string') {
        console.warn('⚠️  parseOCRResults: Invalid input', typeof ocrText);
        return {};
      }
      
      // Try to parse as JSON first
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const raw = JSON.parse(jsonMatch[0]);
          // Normalize common key variants to canonical fields
          const lower = Object.fromEntries(
            Object.entries(raw).map(([k, v]) => [String(k).toLowerCase().trim(), v])
          );
          // Enhanced parsing for South African ID format
          const surname = lower['surname'] || lower['last name'] || lower['lastname'] || null;
          const forenames = lower['forenames'] || lower['forename'] || lower['first names'] || lower['firstnames'] || lower['first name'] || lower['firstname'] || null;
          const fullName = lower['full name'] || lower['name'] || lower['names'] || lower['fullname'] || null;
          
          // Build full name from components if not provided
          let finalFullName = fullName;
          if (!finalFullName && (surname || forenames)) {
            const parts = [];
            if (forenames) parts.push(forenames);
            if (surname) parts.push(surname);
            finalFullName = parts.join(' ').trim();
          }
          
          const canonical = {
            surname: surname ? String(surname).trim() : null,
            forenames: forenames ? String(forenames).trim() : null,
            firstNames: forenames ? String(forenames).trim() : null, // Alias for compatibility
            fullName: finalFullName ? String(finalFullName).trim() : null,
            idNumber: (lower['idnumber'] || lower['id/passport number'] || lower['identity number'] || lower['id number'] || lower['passport number'] || lower['id'] || null),
            licenseNumber: (lower['license number'] || lower['driving license number'] || lower['license'] || null),
            dateOfBirth: (lower['dateofbirth'] || lower['date of birth'] || lower['dob'] || null),
            dateIssued: (lower['dateissued'] || lower['date issued'] || null),
            validFrom: (lower['validfrom'] || lower['valid from'] || lower['validfromdate'] || lower['valid from date'] || null),
            validTo: (lower['validto'] || lower['valid to'] || lower['validtodate'] || lower['valid to date'] || null),
            expiryDate: (lower['expirydate'] || lower['expiry date'] || lower['expirationdate'] || lower['expiration date'] || lower['dateofexpiry'] || lower['date of expiry'] || lower['passportexpirydate'] || lower['passport expiry date'] || lower['licenseexpirydate'] || lower['license expiry date'] || null),
            nationality: lower['nationality'] || null,
            documentType: lower['document type'] || lower['doctype'] || null,
            countryOfIssue: (lower['countryofbirth'] || lower['country of birth'] || lower['country of issue'] || lower['country'] || null)
          };
          
          // Clean and normalize ID/passport number
          if (canonical.idNumber) {
            let cleaned = String(canonical.idNumber).trim().replace(/\s+/g, '');
            
            // Handle SA driver's license ID format: Extract LAST 13 digits (ignore any prefix)
            // Examples: "02/6411055084084" -> "6411055084084", "ABC1234567890123456" -> "1234567890123456"
            // Extract all digits and take the last 13
            const allDigits = cleaned.replace(/\D/g, '');
            if (allDigits.length >= 13) {
              // Extract last 13 digits (driver's license has prefix chars that need to be ignored)
              cleaned = allDigits.slice(-13);
            } else {
              // Try specific pattern match for "02/6411055084084" format (backward compatibility)
              const driverLicenseIdMatch = cleaned.match(/^\d{2}\/(\d{13})$/);
              if (driverLicenseIdMatch) {
                cleaned = driverLicenseIdMatch[1]; // Extract just the 13-digit ID
              }
            }
            
            // Check if it's a 13-digit SA ID or a 6-9 character passport number
            const isSAId = /^\d{13}$/.test(cleaned);
            const isPassport = /^[A-Z0-9]{6,9}$/i.test(cleaned);
            
            if (isSAId) {
              // SA ID: keep only digits, ensure 13 digits
              canonical.idNumber = cleaned.replace(/\D/g, '').slice(0, 13);
            } else if (isPassport) {
              // Passport: keep alphanumeric, uppercase
              canonical.idNumber = cleaned.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
            } else {
              // Invalid format - try to preserve if it looks reasonable
              const alphanumeric = cleaned.replace(/[^A-Z0-9]/gi, '');
              if (alphanumeric.length >= 6 && alphanumeric.length <= 13) {
                canonical.idNumber = alphanumeric.toUpperCase();
              } else {
                canonical.idNumber = null; // Invalid format
              }
            }
          }
          
          // Handle driver's license number format: Extract LAST 13 digits (ignore any prefix)
          // Examples: "02/6411055084084" -> "6411055084084", "ABC1234567890123456" -> "1234567890123456"
          if (canonical.licenseNumber) {
            let cleaned = String(canonical.licenseNumber).trim().replace(/\s+/g, '');
            // Extract all digits and take the last 13 (driver's license has prefix chars that need to be ignored)
            const allDigits = cleaned.replace(/\D/g, '');
            if (allDigits.length >= 13) {
              // Extract last 13 digits
              cleaned = allDigits.slice(-13);
            } else {
              // Try specific pattern match for "02/6411055084084" format (backward compatibility)
              const driverLicenseIdMatch = cleaned.match(/^\d{2}\/(\d{13})$/);
              if (driverLicenseIdMatch) {
                cleaned = driverLicenseIdMatch[1]; // Extract just the 13-digit ID
              }
            }
            canonical.licenseNumber = cleaned;
          }
          
          // Normalize date format (for all date fields)
          const normalizeDate = (dateStr) => {
            if (!dateStr) return null;
            const date = String(dateStr).trim();
            // Convert various formats to YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              return date;
            } else if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/i.test(date)) {
              const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
                              JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
              const parts = date.toUpperCase().split(/\s+/);
              if (parts.length === 3 && months[parts[1]]) {
                const day = parts[0].padStart(2, '0');
                return `${parts[2]}-${months[parts[1]]}-${day}`;
              }
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
              // Handle dd/mm/yyyy format (common in SA driver's licenses)
              const parts = date.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
              }
            } else if (/^\d{1,2}\/\d{1,2}\/\d{4}\s*-\s*\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
              // Handle date range format: "dd/mm/yyyy - dd/mm/yyyy" (SA driver's license)
              // Extract the second date (expiry date)
              const parts = date.split(/\s*-\s*/);
              if (parts.length === 2) {
                const expiryPart = parts[1].trim();
                const expiryParts = expiryPart.split('/');
                if (expiryParts.length === 3) {
                  const day = expiryParts[0].padStart(2, '0');
                  const month = expiryParts[1].padStart(2, '0');
                  const year = expiryParts[2];
                  return `${year}-${month}-${day}`;
                }
              }
            }
            return date; // Return as-is if format not recognized
          };
          
          if (canonical.dateOfBirth) {
            canonical.dateOfBirth = normalizeDate(canonical.dateOfBirth);
          }
          if (canonical.dateIssued) {
            canonical.dateIssued = normalizeDate(canonical.dateIssued);
          }
          if (canonical.validFrom) {
            canonical.validFrom = normalizeDate(canonical.validFrom);
          }
          if (canonical.validTo) {
            canonical.validTo = normalizeDate(canonical.validTo);
          }
          if (canonical.expiryDate) {
            canonical.expiryDate = normalizeDate(canonical.expiryDate);
          }
          
          // Ensure all string fields are trimmed
          Object.keys(canonical).forEach(key => {
            if (canonical[key] != null && typeof canonical[key] === 'string') {
              canonical[key] = canonical[key].trim();
            }
          });
          
          return canonical;
        } catch (jsonError) {
          console.error('❌ Error parsing JSON from OCR:', jsonError.message);
          console.error('📄 JSON text that failed:', jsonMatch[0].substring(0, 200));
          // Continue to fallback text parsing
        }
      }

      // Fallback to text parsing
      const results = {};
      
      if (documentType === 'id_document') {
        // Extract ID document fields
        const nameMatch = ocrText.match(/name[:\s]+([^\n,]+)/i);
        const idMatch = ocrText.match(/(?:id|passport)[:\s]+([^\n,]+)/i);
        const licenseMatch = ocrText.match(/(?:license|driving)[:\s]+([^\n,]+)/i);
        const dobMatch = ocrText.match(/birth[:\s]+([^\n,]+)/i);
        const nationalityMatch = ocrText.match(/nationality[:\s]+([^\n,]+)/i);
        const docTypeMatch = ocrText.match(/document[:\s]+([^\n,]+)/i);
        const countryMatch = ocrText.match(/country[:\s]+([^\n,]+)/i);
        
        const clean = v => (v || '').trim().replace(/[\s,;]+$/, '');
        if (nameMatch) results.fullName = clean(nameMatch[1]);
        if (idMatch) results.idNumber = clean(idMatch[1]);
        if (licenseMatch) results.licenseNumber = clean(licenseMatch[1]);
        if (dobMatch) results.dateOfBirth = clean(dobMatch[1]);
        if (nationalityMatch) results.nationality = clean(nationalityMatch[1]);
        if (docTypeMatch) results.documentType = clean(docTypeMatch[1]);
        if (countryMatch) results.countryOfIssue = clean(countryMatch[1]);
      } else {
        // Extract address fields
        const clean = v => (v || '').trim().replace(/[\s,;]+$/, '');
        const addressMatch = ocrText.match(/address[:\s]+([^\n,]+)/i);
        const cityMatch = ocrText.match(/city[:\s]+([^\n,]+)/i);
        const postalMatch = ocrText.match(/postal[:\s]+([^\n,]+)/i);
        const provinceMatch = ocrText.match(/province[:\s]+([^\n,]+)/i);
        
        if (addressMatch) results.streetAddress = clean(addressMatch[1]);
        if (cityMatch) results.city = clean(cityMatch[1]);
        if (postalMatch) results.postalCode = clean(postalMatch[1]);
        if (provinceMatch) results.province = clean(provinceMatch[1]);
      }

      return results;
    } catch (error) {
      console.error('❌ Error parsing OCR results:', error);
      return {};
    }
  }

  // Validate that uploaded document matches the user
  async validateDocumentAgainstUser(ocrResults, userId) {
    const validation = {
      isValid: false,
      confidence: 0,
      issues: [],
      tolerantNameMatch: false
    };

    try {
      
      
      // Get user information from database
      const { sequelize } = require('../models');
      const User = require('../models/User')(sequelize, require('sequelize').DataTypes);
      
      
      const user = await User.findOne({ where: { id: userId } });
      
      if (!user) {

        validation.issues.push('User not found');
        return validation;
      }

      // Required fields for validation
      // Note: Full name is not strictly required - we only need surname
      const fullName = (ocrResults && ocrResults.fullName) || '';
      const surname = (ocrResults && ocrResults.surname) || '';
      const idNumber = (ocrResults && ocrResults.idNumber) || '';
      const licenseNumber = (ocrResults && ocrResults.licenseNumber) || '';
      
      // CRITICAL: ID/Passport/License number is required
      if (!idNumber && !licenseNumber) {
        validation.issues.push('ID/Passport/License number not found on document');
        return validation;
      }
      
      // CRITICAL: Surname is required (can be extracted from fullName if surname field missing)
      if (!surname && !fullName) {
        validation.issues.push('Surname not found on document (required for validation)');
        return validation;
      }
      
      // Note: First names and date of birth are NOT required for validation
      // We only validate ID Number and Surname against user registration

      // CRITICAL VALIDATION RULES:
      // 1. ID Number MUST match exactly (for SA ID, Passport, Driver's License, Temporary ID)
      // 2. Surname MUST match exactly
      // 3. First names are IGNORED - differences are acceptable and do not cause failure
      // 4. Passports MUST be valid (not expired) - expiry date is MANDATORY
      // 5. Driver's Licenses MUST be valid (not expired) - expiry date is MANDATORY
      
      const documentType = this.determineDocumentType(ocrResults);
      const registeredId = normalizeIdDigits(user.idNumber || '');
      const docIdForMatch = normalizeIdDigits(ocrResults.idNumber || ocrResults.licenseNumber || '');
      
      console.log('🔍 ID/Passport number comparison:', {
        registeredId: registeredId,
        docIdForMatch: docIdForMatch,
        documentType: documentType,
        registeredIdRaw: user.idNumber,
        docIdRaw: ocrResults.idNumber || ocrResults.licenseNumber
      });
      
      // OCR ACCURACY VALIDATION: Verify ID number matches date of birth (for SA IDs and driver's licenses)
      // SA ID format: YYMMDDGSSSCAZ where YYMMDD is date of birth
      if (docIdForMatch && docIdForMatch.length === 13 && ocrResults.dateOfBirth) {
        const idYY = docIdForMatch.slice(0, 2);
        const idMM = docIdForMatch.slice(2, 4);
        const idDD = docIdForMatch.slice(4, 6);
        const dobParts = ocrResults.dateOfBirth.split('-'); // Format: YYYY-MM-DD
        if (dobParts.length === 3) {
          const dobYY = dobParts[0].slice(-2); // Last 2 digits of year
          const dobMM = dobParts[1];
          const dobDD = dobParts[2];
          
          if (idYY !== dobYY || idMM !== dobMM || idDD !== dobDD) {
            console.warn('⚠️  OCR ACCURACY WARNING: ID number date portion does not match extracted date of birth:', {
              idNumberDate: `${idYY}-${idMM}-${idDD}`,
              extractedDOB: `${dobYY}-${dobMM}-${dobDD}`,
              fullDOB: ocrResults.dateOfBirth,
              idNumber: docIdForMatch
            });
            // This suggests an OCR error - log warning but continue validation
            // The ID mismatch check below will catch it if it doesn't match registration
          } else {
            console.log('✅ ID number date portion matches extracted date of birth');
          }
        }
      }
      
      // TEMPORARY TESTING EXCEPTION: User ID 1 can test passports without ID matching
      // ID validation is ACTIVE for: SA ID cards, old ID books, SA driver's licenses
      // ID validation is SKIPPED for: Passports only
      const isTestingUser = userId === 1;
      const isPassport = documentType === 'passport';
      const skipIdMatching = isTestingUser && isPassport;
      
      // CRITICAL CHECK 1: ID Number must match exactly
      // Applies to: SA ID, Passport, Driver's License, Temporary ID Certificate
      // EXCEPTION: User ID 1 (testing) - skip ID number matching ONLY for passports
      // For SA ID cards, old ID books, and SA driver's licenses, ID validation is ACTIVE for user ID 1
      if (skipIdMatching) {
        console.log('🧪 TESTING MODE: User ID 1 - skipping ID number matching validation for passport');
        // For testing user with passport, only check that document has a passport number (format validation happens later)
        if (!docIdForMatch) {
          validation.issues.push('ID/Passport/License number not found on document');
          return validation;
        } else {
          console.log('✅ Testing mode: Document has Passport number (format will be validated)');
        }
      } else {
        // Normal validation: ID number must match exactly
        // This applies to: SA ID, Driver's License, Temporary ID, and Passports (for non-testing users)
        if (registeredId && docIdForMatch) {
          if (registeredId !== docIdForMatch) {
            console.warn('⚠️  ID/Passport number mismatch:', {
              registered: registeredId,
              document: docIdForMatch
            });
            validation.issues.push(`ID/Passport/License number mismatch: Document shows "${ocrResults.idNumber || ocrResults.licenseNumber}" but registration shows "${user.idNumber}"`);
            // ID mismatch is critical - fail immediately
            return validation;
          } else {
            console.log('✅ ID/Passport number matches');
          }
        } else if (!docIdForMatch) {
          validation.issues.push('ID/Passport/License number not found on document');
          return validation;
        }
      }

      // CRITICAL CHECK 2: Surname must match exactly
      // For driver's license: name is in CAPS format "INITIALS SURNAME" (e.g., "A BOTES")
      // Extract surname from full name if it's in driver's license format
      let docSurname = ocrResults.surname || '';
      let { first: docFirst, last: docLast } = splitFullName(fullName);
      
      // Handle driver's license name format: "INITIALS SURNAME" (e.g., "RZ BOTES" where "RZ" are initials, "BOTES" is surname)
      // ALWAYS extract last word from fullName for driver's licenses (Tesseract may extract initials as surname)
      if (documentType === 'sa_driving_license' && fullName) {
        // Full name is usually "INITIALS SURNAME" in CAPS
        const nameParts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
        if (nameParts.length >= 2) {
          // Last part is ALWAYS surname for driver's licenses, everything before is initials
          // Override any Tesseract-extracted surname with the last word from fullName
          docSurname = nameParts[nameParts.length - 1];
          docFirst = nameParts.slice(0, -1).join(' '); // All parts except last are initials
          docLast = docSurname;
          console.log(`ℹ️  Driver's license name format: Extracted surname "${docSurname}" from fullName "${fullName}" (last word)`);
        } else if (nameParts.length === 1 && !docSurname) {
          // Single word - use as surname
          docSurname = nameParts[0];
          docLast = docSurname;
        }
      }
      
      const surnameForCompare = docSurname || docLast;
      const userLast = normalizeName(user.lastName || '');

      if (surnameForCompare && userLast) {
        const docLastNorm = normalizeSurnameOCR(surnameForCompare);
        const userLastNorm = normalizeSurnameOCR(userLast);
        if (docLastNorm !== userLastNorm) {
          const similarity = jaroWinkler(docLastNorm, userLastNorm);
          const threshold = 0.999; // Very strict for surname
          if (similarity < threshold) {
            validation.issues.push(`Surname mismatch: Document shows "${surnameForCompare}" but registration shows "${user.lastName}"`);
            // Surname mismatch is critical - fail immediately
            return validation;
          }
        }
      } else if (!surnameForCompare) {
        validation.issues.push('Surname not found on document');
        return validation;
      }

      // FIRST NAMES: COMPLETELY IGNORED - No validation performed
      // Users may enter different first names than on official documents
      // (e.g., initials like "HD" for "Hennie Daniël", "JP" for "Johan Petrus",
      // nicknames, abbreviations, etc.) - all are acceptable and never cause failure
      const userFirst = normalizeName(user.firstName || '');
      if (docFirst && userFirst) {
        // Log for reference only - never fails validation
        console.log(`ℹ️  First names ignored in validation: Document="${docFirst}" vs Registration="${userFirst}"`);
        validation.tolerantNameMatch = true; // Flag for logging/reporting only
      }

      // Check document format based on type
      // Use raw values for format validation (don't normalize passport numbers)
      const rawIdForFormat = idNumber ? String(idNumber).trim().replace(/\s+/g, '') : '';
      const rawLicenseForFormat = licenseNumber ? String(licenseNumber).trim().replace(/\s+/g, '') : '';
      const rawId = normalizeIdDigits(idNumber);
      const rawLicense = normalizeIdDigits(licenseNumber);
      
      console.log('🔍 Document format validation:', {
        documentType: documentType,
        rawIdForFormat: rawIdForFormat,
        rawId: rawId,
        rawLicenseForFormat: rawLicenseForFormat
      });
      
      if (documentType === 'sa_id') {
        if (!/^\d{13}$/.test(rawIdForFormat) || !isValidSouthAfricanId(rawId)) {
          validation.issues.push('Invalid South African ID number (format/checksum)');
        }
      } else if (documentType === 'sa_temporary_id') {
        if (!isValidTemporaryID(rawId)) {
          validation.issues.push('Invalid South African temporary ID number (format/checksum)');
        }
        
        // Check if temporary ID is still valid (not expired)
        const expiryDate = ocrResults.expiryDate || ocrResults.temporaryIdExpiryDate;
        if (expiryDate && !isTemporaryIDValid(expiryDate)) {
          validation.issues.push('Temporary ID certificate has expired. Please use a valid, unexpired temporary ID.');
        }
      } else if (documentType === 'sa_driving_license') {
        // SA Driver's License: Only validate the ID number (13 digits), NOT the license number format
        // The ID number is the last 13 digits (prefix characters are ignored)
        // License number format (AB123456CD) is NOT used for KYC validation
        const isIdNumberFormat = /^\d{13}$/.test(rawIdForFormat);
        
        if (!isIdNumberFormat) {
          validation.issues.push('Invalid South African ID number on driving license. Expected 13-digit ID number (prefix characters are ignored).');
        } else if (!isValidSouthAfricanId(rawId)) {
          validation.issues.push('Invalid South African ID number (checksum validation failed).');
        }
        
        // Check if driving license is still valid (not expired)
        // SA Driver's License shows dates as "dd/mm/yyyy - dd/mm/yyyy" - we only check the second date (expiry)
        const expiryDate = ocrResults.expiryDate || ocrResults.licenseExpiryDate || ocrResults.validTo || ocrResults.validToDate;
        
        if (expiryDate) {
          // Only check expiry - not valid from (SA driver's license validation)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiry = new Date(expiryDate);
          expiry.setHours(0, 0, 0, 0);
          
          if (expiry <= today) {
            validation.issues.push('Driving license has expired. Please use a valid, unexpired license.');
          } else {
            console.log('✅ Driving license expiration date is valid');
          }
        } else {
          validation.issues.push('Driving license expiration date not found. Please ensure the license shows valid dates.');
        }
      } else if (documentType === 'passport') {
        // Use raw value for passport validation (preserve alphanumeric)
        if (!/^[A-Z0-9]{6,9}$/i.test(rawIdForFormat)) {
          validation.issues.push('Invalid passport number format (must be 6-9 alphanumeric characters)');
        } else {
          console.log('✅ Passport number format is valid');
        }
        
        // Check if passport is still valid (not expired) - MANDATORY
        const expiryDate = ocrResults.expiryDate || ocrResults.passportExpiryDate || ocrResults.dateOfExpiry || ocrResults.validTo || ocrResults.validToDate;
        if (expiryDate) {
          if (!isPassportValid(expiryDate)) {
            validation.issues.push('Passport has expired. Please use a valid, unexpired passport.');
          } else {
            console.log('✅ Passport expiration date is valid');
          }
        } else {
          // Expiration date is MANDATORY for passport validation
          validation.issues.push('Passport expiration date not found. Please ensure the passport shows expiry date.');
        }
      } else {
        validation.issues.push('Unable to determine document type (ID, Temporary ID, Passport, or Driving License)');
      }

      // Enhanced confidence calculation - only ID Number and Surname are critical
      // First names are NOT included in validation checks
      const criticalChecks = [
        // ID/Passport/License number match (CRITICAL - must pass)
        validation.issues.findIndex(i => 
          i.toLowerCase().includes('id') || 
          i.toLowerCase().includes('passport') || 
          i.toLowerCase().includes('license') ||
          i.toLowerCase().includes('number')
        ) === -1,
        // Surname match (CRITICAL - must pass)
        validation.issues.findIndex(i => i.toLowerCase().includes('surname')) === -1
      ];
      
      const passedCriticalChecks = criticalChecks.filter(Boolean).length;
      const criticalConfidence = (passedCriticalChecks / criticalChecks.length) * 100;
      
      // Confidence based on ID + Surname only (first names excluded)
      validation.confidence = Math.min(100, criticalConfidence);
      
      // Validation passes if no critical issues (ID and Surname match)
      // First name differences do NOT cause validation failure
      validation.isValid = validation.issues.length === 0;

      
      return validation;
    } catch (error) {
      console.error('❌ Error validating document against user:', error);
      validation.issues.push('Error validating document against user information');
      return validation;
    }
  }

  // Determine document type based on OCR results
  determineDocumentType(ocrResults) {
    // Check if it's explicitly marked as temporary ID
    if (ocrResults.documentType && 
        ocrResults.documentType.toLowerCase().includes('temporary id')) {
      return 'sa_temporary_id';
    }
    
    // Check if it's explicitly marked as driving license
    if (ocrResults.documentType && 
        ocrResults.documentType.toLowerCase().includes('driving license')) {
      return 'sa_driving_license';
    }
    
    // Check if it's explicitly marked as passport
    if (ocrResults.documentType && ocrResults.documentType.toLowerCase().includes('passport')) {
      return 'passport';
    }
    
    // Check if it's explicitly marked as ID
    if (ocrResults.documentType && ocrResults.documentType.toLowerCase().includes('id')) {
      return 'sa_id';
    }
    
    // Check country of issue
    if (ocrResults.countryOfIssue && ocrResults.countryOfIssue.toLowerCase().includes('south africa')) {
      // Don't assume SA ID - could be passport too
    }
    
    // Check ID number format to determine type (use RAW value before normalization)
    const idNumber = ocrResults.idNumber ? String(ocrResults.idNumber).trim().replace(/\s+/g, '') : '';
    const licenseNumber = ocrResults.licenseNumber ? String(ocrResults.licenseNumber).trim().replace(/\s+/g, '') : '';
    
    // South African driving license format: 2 letters + 6 digits + 2 letters
    if (licenseNumber && (isValidSouthAfricanDrivingLicense(licenseNumber) || 
        /^[A-Z]{2}\d{6}[A-Z]{2}$/i.test(licenseNumber))) {
      return 'sa_driving_license';
    }
    if (idNumber && /^[A-Z]{2}\d{6}[A-Z]{2}$/i.test(idNumber)) {
      return 'sa_driving_license';
    }
    
    // Check for driver's license indicators: expiryDate field
    // Driver's licenses have expiry dates, SA IDs don't
    // NOTE: dateIssued is NOT a validity period indicator - SA ID books also have dateIssued
    // Only check for actual expiry date fields (expiryDate/validTo) - validFrom is optional
    const hasValidFrom = ocrResults.validFrom || ocrResults.validFromDate;
    const hasExpiryDate = ocrResults.expiryDate || ocrResults.licenseExpiryDate || ocrResults.validTo || ocrResults.validToDate;
    if (hasExpiryDate && idNumber && /^\d{13}$/.test(idNumber)) {
      // Has expiry date AND 13-digit ID number = likely driver's license
      // Note: validFrom is optional - some licenses only show expiry date
      return 'sa_driving_license';
    }
    
    // Passport numbers are 6-9 alphanumeric characters (check FIRST before SA ID)
    // This is important because passport numbers can start with letters
    if (idNumber && /^[A-Z0-9]{6,9}$/i.test(idNumber) && !/^\d{13}$/.test(idNumber)) {
      return 'passport';
    }
    
    // South African ID numbers are exactly 13 digits (all numeric)
    // Classify as SA ID if it's 13 digits and doesn't have expiry date (driver's license indicator)
    // dateIssued alone is NOT a validity period indicator - SA ID books have dateIssued too
    // Note: Only expiryDate matters - validFrom is optional for driver's licenses
    if (idNumber && /^\d{13}$/.test(idNumber) && !hasExpiryDate) {
      return 'sa_id';
    }
    
    // Default to passport if we can't determine (more permissive for international documents)
    return 'passport';
  }

  // Get accepted document types
  getAcceptedDocuments(documentType) {
    if (documentType === 'id_document') {
      return [
        'South African ID Book',
        'South African ID Card',
        'South African Passport',
        'South African Driving License',
        'South African Temporary ID Certificate',
        'International Passport'
      ];
    } else {
      return [
        'Utility bill (not older than 3 months)',
        'Bank statement (not older than 3 months)',
        'Municipal account (not older than 3 months)',
        'Insurance policy (not older than 3 months)'
      ];
    }
  }

  // Process KYC submission with simplified OCR and manual review fallback
  async processKYCSubmission(userId, documentType, documentUrl, retryCount = 0) {
    const kycProcessStartTime = Date.now();
    try {
      console.log(`🔄 Processing KYC submission: User ${userId}, Type: ${documentType}, Retry: ${retryCount}`);
      
      let ocrResults;
      const ocrStartTime = Date.now();
      try {
        // Process OCR with simplified OpenAI approach
        ocrResults = await this.processDocumentOCR(documentUrl, documentType);
        const ocrDuration = Date.now() - ocrStartTime;
        console.log(`✅ OCR processing successful - OCR took ${ocrDuration}ms`);
      } catch (ocrError) {
        console.error('❌ OCR processing failed:', ocrError.message);
        
        // Queue for manual review instead of using Tesseract fallback
        return await this.queueForManualReview(userId, documentType, documentUrl, ocrError);
      }
      
      // Validate document against user information
      console.log('🔍 Validating document against user registration...');
      const validation = await this.validateDocumentAgainstUser(ocrResults, userId);
      console.log('📋 Validation results:', {
        isValid: validation.isValid,
        issues: validation.issues,
        tolerantNameMatch: validation.tolerantNameMatch,
        confidence: validation.confidence
      });
      
      // Build response
      const response = {
        success: validation.isValid,
        ocrResults,
        validation,
        acceptedDocuments: this.getAcceptedDocuments(documentType),
        retryCount,
        canRetry: retryCount < 1
      };
      
      // Handle validation results
      if (validation.tolerantNameMatch && validation.issues.length === 0) {
        // First name mismatch but surname and ID match - auto-approve (accent differences are acceptable)
        console.log('ℹ️  First name mismatch (accent difference) but surname and ID match - auto-approving');
        response.status = 'approved';
        response.message = 'KYC verification successful (first name accent difference ignored)';
        response.success = true;
        // Don't queue for review - auto-approve since critical fields match
        const totalDuration = Date.now() - kycProcessStartTime;
        console.log(`⏱️  Total KYC processing time: ${totalDuration}ms`);
        return response;
      }
      
      if (!validation.isValid && retryCount === 0) {
        // First attempt failed - allow retry
        response.status = 'retry';
        response.message = validation.issues.join('. ');
        response.success = false;
      } else if (!validation.isValid && retryCount >= 1) {
        // Second failure - queue for manual review
        response.status = 'under_review';
        response.message = 'Document validation failed after retry. Your document has been submitted for manual review.';
        response.requiresManualReview = true;
        response.success = false;
        
        await this.queueForManualReview(userId, documentType, documentUrl, 
          new Error(validation.issues.join('. ')), ocrResults);
      } else if (validation.isValid) {
        // Validation passed
        response.status = 'approved';
        response.message = 'KYC verification successful';
        response.success = true;
      }
      
      const totalDuration = Date.now() - kycProcessStartTime;
      console.log(`⏱️  Total KYC processing time: ${totalDuration}ms`);
      return response;
    } catch (error) {
      console.error('❌ Error in processKYCSubmission:', error);
      
      // Final fallback: queue for manual review
      return await this.queueForManualReview(userId, documentType, documentUrl, error);
    }
  }

  // Convert local file to base64 data URL for OpenAI Vision API
  async convertLocalFileToDataURL(filePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Read the file as buffer
      const fileBuffer = fs.readFileSync(filePath);
      
      // Convert to base64
      const base64Data = fileBuffer.toString('base64');
      
      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (ext === '.pdf') {
        mimeType = 'application/pdf';
      } else if (['.jpg', '.jpeg'].includes(ext)) {
        mimeType = 'image/jpeg';
      } else if (ext === '.png') {
        mimeType = 'image/png';
      }
      
      // Create data URL
      const dataURL = `data:${mimeType};base64,${base64Data}`;
      
      return dataURL;
    } catch (error) {
      console.error('❌ Error converting file to data URL:', error);
      throw error;
    }
  }
}

// Export individual functions for testing
const kycServiceInstance = new KYCService();
module.exports = kycServiceInstance;
module.exports.validateIDDocument = kycServiceInstance.validateIDDocument?.bind(kycServiceInstance);
module.exports.determineDocumentType = kycServiceInstance.determineDocumentType.bind(kycServiceInstance); 