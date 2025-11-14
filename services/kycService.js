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

function isDrivingLicenseValid(expiryDate) {
  if (!expiryDate) return false;
  
  try {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry > today;
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
    const today = new Date();
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

  // Simplified, reliable image preprocessing for OCR
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

  // Legacy Tesseract OCR method - kept for backward compatibility but not used
  async runTesseractOCR(localFilePath) {
    // This method is deprecated - using simplified OpenAI approach instead
    // Kept for backward compatibility only
    console.warn('⚠️  runTesseractOCR is deprecated - using OpenAI OCR instead');
    throw new Error('Tesseract OCR is no longer used. Please use OpenAI OCR.');
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
    // ID number: if still missing, collapse all non-digits and take first 13
    if (!results.idNumber) {
      const digitsOnly = text.replace(/\D/g, '');
      if (digitsOnly.length >= 13) {
        results.idNumber = digitsOnly.slice(0, 13);
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
    let imageData;
    try {
      imageData = await this.preprocessImageForOCR(localFilePath);
    } catch (preprocessError) {
      console.error('❌ Image preprocessing error:', preprocessError.message);
      // Fallback to original image
      const fileBuffer = await fs.readFile(localFilePath);
      imageData = fileBuffer.toString('base64');
    }
    
    // Enhanced OpenAI prompt for South African ID documents
    const prompt = documentType === 'id_document' 
      ? `You are extracting information from a South African Identity Document (ID book). 

The document has a green background with security patterns. Look for:
1. ID NUMBER: A 13-digit number (format: YYMMDDGSSSCAZ) usually near the top with a barcode
2. SURNAME/VAN: The surname appears after "VAN/SURNAME" label, usually in bold uppercase
3. FORENAMES/VOORNAME: The forenames appear after "VOORNAME/FORENAMES" label, usually in bold uppercase
4. DATE OF BIRTH: Format YYYY-MM-DD or DD MMM YYYY, appears after "GEBOORTEDATUM/DATE OF BIRTH"
5. DATE ISSUED: Format YYYY-MM-DD, appears after "DATUM UITGEREIK/DATE ISSUED"
6. COUNTRY OF BIRTH: Usually "SUID-AFRIKA" or "SOUTH AFRICA"

IMPORTANT:
- Extract EXACT text as it appears on the document
- For ID number, extract all 13 digits without spaces
- For names, preserve capitalization and spacing exactly
- For dates, use YYYY-MM-DD format
- Ignore security patterns, watermarks, and background text
- Focus on the right page which contains personal details

Return ONLY valid JSON in this exact format:
{
  "idNumber": "9201165204087",
  "surname": "BOTES",
  "forenames": "HENDRIK DANIEL",
  "fullName": "HENDRIK DANIEL BOTES",
  "dateOfBirth": "1992-01-16",
  "dateIssued": "2008-04-03",
  "countryOfBirth": "SOUTH AFRICA"
}`
      : "Extract the following information from this South African proof of address document: Street address, City, Postal code, Province. Return as JSON format.";
    
    // Retry logic for OpenAI API calls
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 OpenAI OCR attempt ${attempt}/${MAX_RETRIES}...`);
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { 
                type: "image_url", 
                image_url: {
                  url: `data:${mimeType};base64,${imageData}`,
                  detail: "high"
                }
              }
            ]
          }],
          max_tokens: 500,
          temperature: 0.1
        });
        
        const content = response.choices[0].message.content || '';
        
        // Check if OpenAI couldn't help
        if (/i\s*can'?t\s*help/i.test(content) || /unable to extract/i.test(content)) {
          throw new Error('OpenAI could not extract information from document');
        }
        
        // Parse results
        const parsedResults = this.parseOCRResults(content, documentType);
        
        // Validate critical fields
        if (documentType === 'id_document') {
          // Clean and validate ID number (remove spaces, dashes, etc.)
          const cleanedIdNumber = parsedResults.idNumber ? parsedResults.idNumber.replace(/\D/g, '') : '';
          const hasIdNumber = cleanedIdNumber.length === 13 && /^\d{13}$/.test(cleanedIdNumber);
          
          // Check for name (surname, forenames, or fullName)
          const hasName = (parsedResults.surname?.trim().length >= 2) || 
                         (parsedResults.forenames?.trim().length >= 2) ||
                         (parsedResults.fullName?.trim().length >= 2);
          
          // Log what was extracted for debugging
          console.log('📋 OCR Extraction Results:', {
            idNumber: parsedResults.idNumber,
            cleanedIdNumber: cleanedIdNumber,
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
        
        console.log('✅ OpenAI OCR successful');
        return parsedResults;
        
      } catch (error) {
        lastError = error;
        console.error(`❌ OpenAI OCR attempt ${attempt} failed:`, error.message);
        
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
    
    // All retries failed - throw error (will be caught and queued for manual review)
    console.error('❌ All OpenAI OCR attempts failed. Queueing for manual review.');
    throw new Error(`OCR processing failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  // Queue document for manual review
  async queueForManualReview(userId, documentType, documentUrl, error, ocrResults = null) {
    try {
      const { sequelize } = require('../models');
      const Kyc = require('../models/Kyc')(sequelize, require('sequelize').DataTypes);
      
      // Convert frontend documentType to database enum value
      const dbDocumentType = documentType === 'id_document' ? 'id_card' : 
                            documentType === 'proof_of_address' ? 'utility_bill' : 
                            documentType;
      
      // Prepare reviewer notes with error details
      const reviewerNotes = `OCR Processing Failed: ${error?.message || 'Unknown error'}\n` +
                           `Review Reason: OCR_FAILED\n` +
                           `OCR Results: ${ocrResults ? JSON.stringify(ocrResults, null, 2) : 'None'}`;
      
      // Create or update KYC record with manual review status
      const [kycRecord, created] = await Kyc.findOrCreate({
        where: { 
          userId, 
          documentType: dbDocumentType 
        },
        defaults: {
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
        }
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
      
      console.log(`📋 Document queued for manual review: User ${userId}, Type: ${dbDocumentType}`);
      
      // TODO: Send notification to admin/support team
      // await this.notifySupportTeam(userId, documentType, error);
      
      return {
        success: false,
        status: 'under_review',
        message: 'Your document has been submitted for manual review. We will notify you once verification is complete.',
        requiresManualReview: true
      };
    } catch (error) {
      console.error('❌ Error queueing for manual review:', error);
      throw error;
    }
  }

  // Parse OCR results
  parseOCRResults(ocrText, documentType) {
    try {
      // Try to parse as JSON first
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
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
          nationality: lower['nationality'] || null,
          documentType: lower['document type'] || lower['doctype'] || null,
          countryOfIssue: (lower['countryofbirth'] || lower['country of birth'] || lower['country of issue'] || lower['country'] || null)
        };
        
        // Clean and normalize ID number (remove spaces, ensure 13 digits)
        if (canonical.idNumber) {
          canonical.idNumber = String(canonical.idNumber).replace(/\s+/g, '').replace(/\D/g, '').slice(0, 13);
          if (canonical.idNumber.length !== 13) {
            canonical.idNumber = null; // Invalid length
          }
        }
        
        // Normalize date format
        if (canonical.dateOfBirth) {
          const dob = String(canonical.dateOfBirth).trim();
          // Convert various formats to YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
            canonical.dateOfBirth = dob;
          } else if (/^\d{1,2}\s+[A-Z]{3}\s+\d{4}$/i.test(dob)) {
            const months = { JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
                            JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12' };
            const parts = dob.toUpperCase().split(/\s+/);
            if (parts.length === 3 && months[parts[1]]) {
              const day = parts[0].padStart(2, '0');
              canonical.dateOfBirth = `${parts[2]}-${months[parts[1]]}-${day}`;
            }
          }
        }
        
        // Ensure all string fields are trimmed
        Object.keys(canonical).forEach(key => {
          if (canonical[key] != null && typeof canonical[key] === 'string') {
            canonical[key] = canonical[key].trim();
          }
        });
        
        return canonical;
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
      
      const documentType = this.determineDocumentType(ocrResults);
      const registeredId = normalizeIdDigits(user.idNumber || '');
      const docIdForMatch = normalizeIdDigits(ocrResults.idNumber || ocrResults.licenseNumber || '');
      
      // CRITICAL CHECK 1: ID Number must match exactly
      // Applies to: SA ID, Passport, Driver's License, Temporary ID Certificate
      if (registeredId && docIdForMatch) {
        if (registeredId !== docIdForMatch) {
          validation.issues.push(`ID/Passport/License number mismatch: Document shows "${ocrResults.idNumber || ocrResults.licenseNumber}" but registration shows "${user.idNumber}"`);
          // ID mismatch is critical - fail immediately
          return validation;
        }
      } else if (!docIdForMatch) {
        validation.issues.push('ID/Passport/License number not found on document');
        return validation;
      }

      // CRITICAL CHECK 2: Surname must match exactly
      const docSurname = ocrResults.surname || '';
      const { first: docFirst, last: docLast } = splitFullName(fullName);
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
      const rawId = normalizeIdDigits(idNumber);
      const rawLicense = normalizeIdDigits(licenseNumber);
      
      if (documentType === 'sa_id') {
        if (!/^\d{13}$/.test(rawId) || !isValidSouthAfricanId(rawId)) {
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
        if (!isValidSouthAfricanDrivingLicense(rawLicense) && !isValidSouthAfricanDrivingLicense(rawId)) {
          validation.issues.push('Invalid South African driving license number (format: 2 letters + 6 digits + 2 letters)');
        }
        
        // Check if driving license is still valid (not expired)
        const expiryDate = ocrResults.expiryDate || ocrResults.licenseExpiryDate;
        if (expiryDate && !isDrivingLicenseValid(expiryDate)) {
          validation.issues.push('Driving license has expired. Please use a valid, unexpired license.');
        }
      } else if (documentType === 'passport') {
        if (!/^[A-Z0-9]{6,9}$/i.test(rawId)) {
          validation.issues.push('Invalid passport number format (must be 6-9 alphanumeric characters)');
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
      return 'sa_id';
    }
    
    // Check ID number format to determine type
    const idNumber = ocrResults.idNumber ? ocrResults.idNumber.replace(/\s/g, '') : '';
    const licenseNumber = ocrResults.licenseNumber ? ocrResults.licenseNumber.replace(/\s/g, '') : '';
    
    // South African driving license format: 2 letters + 6 digits + 2 letters
    if (isValidSouthAfricanDrivingLicense(licenseNumber) || 
        /^[A-Z]{2}\d{6}[A-Z]{2}$/i.test(idNumber)) {
      return 'sa_driving_license';
    }
    
    // South African ID numbers are exactly 13 digits
    if (/^\d{13}$/.test(idNumber)) {
      return 'sa_id';
    }
    
    // Passport numbers are typically 6-9 alphanumeric characters
    if (/^[A-Z0-9]{6,9}$/i.test(idNumber)) {
      return 'passport';
    }
    
    // Default to passport if we can't determine (more permissive)
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
    try {
      console.log(`🔄 Processing KYC submission: User ${userId}, Type: ${documentType}, Retry: ${retryCount}`);
      
      let ocrResults;
      try {
        // Process OCR with simplified OpenAI approach
        ocrResults = await this.processDocumentOCR(documentUrl, documentType);
        console.log('✅ OCR processing successful');
      } catch (ocrError) {
        console.error('❌ OCR processing failed:', ocrError.message);
        
        // Queue for manual review instead of using Tesseract fallback
        return await this.queueForManualReview(userId, documentType, documentUrl, ocrError);
      }
      
      // Validate document against user information
      const validation = await this.validateDocumentAgainstUser(ocrResults, userId);
      
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
        // First name mismatch - queue for manual review
        response.status = 'under_review';
        response.message = 'Surname matches but first name differs. Requires manual review.';
        response.canRetry = false;
        response.requiresManualReview = true;
        
        await this.queueForManualReview(userId, documentType, documentUrl, 
          new Error('First name mismatch'), ocrResults);
        
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