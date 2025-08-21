const OpenAI = require('openai');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

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
  const a = normalizeName(docFirst);
  const b = normalizeName(userFirst);
  
  if (!a || !b) return { matches: false, similarity: 0, reason: 'Empty name' };
  if (a === b) return { matches: true, similarity: 1.0, reason: 'Exact match' };
  
  // Common nickname mappings
  const nicknames = {
    'robert': ['bob', 'rob', 'robby'],
    'michael': ['mike', 'mikey', 'mick'],
    'william': ['bill', 'billy', 'will', 'willy'],
    'richard': ['rick', 'ricky', 'dick'],
    'james': ['jim', 'jimmy'],
    'john': ['jon', 'johnny', 'jack'],
    'david': ['dave', 'davey'],
    'christopher': ['chris', 'topher'],
    'matthew': ['matt', 'matty'],
    'andrew': ['andy', 'drew'],
    'daniel': ['dan', 'danny'],
    'nicholas': ['nick', 'nicky'],
    'joseph': ['joe', 'joey'],
    'thomas': ['tom', 'tommy'],
    'charles': ['charlie', 'chuck'],
    'anthony': ['tony', 'ant'],
    'mark': ['marc'],
    'donald': ['don', 'donny'],
    'steven': ['steve', 'stevie'],
    'paul': ['paulie'],
    'kenneth': ['ken', 'kenny'],
    'ronald': ['ron', 'ronnie'],
    'kevin': ['kev'],
    'jason': ['jay'],
    'edward': ['ed', 'eddie', 'ted'],
    'brian': ['brian'],
    'ronald': ['ron', 'ronnie'],
    'anthony': ['tony', 'ant'],
    'kevin': ['kev'],
    'jason': ['jay'],
    'matthew': ['matt', 'matty'],
    'gary': ['gary'],
    'timothy': ['tim', 'timmy'],
    'jose': ['jose'],
    'larry': ['larry'],
    'jeffrey': ['jeff'],
    'frank': ['frankie'],
    'scott': ['scott'],
    'eric': ['eric'],
    'stephen': ['steve', 'stevie'],
    'andrew': ['andy', 'drew'],
    'raymond': ['ray'],
    'gregory': ['greg'],
    'joshua': ['josh'],
    'jerry': ['jerry'],
    'dennis': ['dennis'],
    'walter': ['walt'],
    'peter': ['pete'],
    'harold': ['harry', 'hal'],
    'douglas': ['doug'],
    'henry': ['hank'],
    'carl': ['carl'],
    'arthur': ['art', 'artie'],
    'ryan': ['ryan'],
    'roger': ['rog'],
    'joe': ['joey'],
    'juan': ['juan'],
    'jack': ['jackie'],
    'albert': ['al', 'bert'],
    'jonathan': ['jon', 'jonny'],
    'justin': ['justin'],
    'terry': ['terry'],
    'gerald': ['gerry', 'jerry'],
    'keith': ['keith'],
    'samuel': ['sam', 'sammy'],
    'willie': ['will'],
    'ralph': ['ralph'],
    'lawrence': ['larry', 'lawrence'],
    'nicholas': ['nick', 'nicky'],
    'roy': ['roy'],
    'benjamin': ['ben', 'benny'],
    'bruce': ['bruce'],
    'brandon': ['brandon'],
    'adam': ['adam'],
    'harry': ['harry'],
    'fred': ['freddie'],
    'wayne': ['wayne'],
    'billy': ['bill'],
    'steve': ['steve'],
    'louis': ['lou', 'louie'],
    'jeremy': ['jeremy'],
    'aaron': ['aaron'],
    'randy': ['randy'],
    'howard': ['howie'],
    'eugene': ['gene'],
    'carlos': ['carlos'],
    'russell': ['russ'],
    'bobby': ['bob'],
    'victor': ['vic'],
    'martin': ['marty'],
    'ernest': ['ernie'],
    'phillip': ['phil'],
    'todd': ['todd'],
    'jesse': ['jesse'],
    'craig': ['craig'],
    'alan': ['al'],
    'shawn': ['shawn'],
    'clarence': ['clarence'],
    'sean': ['sean'],
    'philip': ['phil'],
    'chris': ['chris'],
    'johnny': ['john'],
    'earl': ['earl'],
    'jimmy': ['jim'],
    'antonio': ['tony'],
    'danny': ['dan'],
    'bryan': ['brian'],
    'tony': ['tony'],
    'luis': ['lou'],
    'mike': ['mike'],
    'stanley': ['stan'],
    'leonard': ['len', 'lenny'],
    'nathan': ['nate'],
    'dale': ['dale'],
    'manuel': ['manuel'],
    'rodney': ['rod'],
    'curtis': ['curt'],
    'norman': ['norm'],
    'allen': ['al'],
    'marvin': ['marv'],
    'vincent': ['vince'],
    'glenn': ['glenn'],
    'jeffery': ['jeff'],
    'travis': ['travis'],
    'jeff': ['jeff'],
    'chad': ['chad'],
    'jacob': ['jake'],
    'lee': ['lee'],
    'melvin': ['mel'],
    'alfred': ['alf', 'alfie'],
    'kyle': ['kyle'],
    'francis': ['frank', 'frankie'],
    'bradley': ['brad'],
    'jesus': ['jesus'],
    'herbert': ['herb'],
    'frederick': ['fred', 'freddie'],
    'ray': ['ray'],
    'joel': ['joel'],
    'edwin': ['ed', 'eddie'],
    'don': ['don'],
    'eddie': ['ed'],
    'ricky': ['rick'],
    'troy': ['troy'],
    'randall': ['randy'],
    'barry': ['barry'],
    'alexander': ['alex'],
    'bernard': ['bernard'],
    'marcus': ['marc'],
    'micheal': ['mike'],
    'theodore': ['ted', 'teddy'],
    'clifford': ['cliff'],
    'miguel': ['mike'],
    'jay': ['jay'],
    'homer': ['homer'],
    'gerard': ['gerry'],
    'doug': ['doug'],
    'kenny': ['ken'],
    'robin': ['rob'],
    'lee': ['lee'],
    'derek': ['derek'],
    'warren': ['warren'],
    'darrell': ['darrell'],
    'jerome': ['jerry'],
    'floyd': ['floyd'],
    'leo': ['leo'],
    'alvin': ['al'],
    'tim': ['tim'],
    'wesley': ['wes'],
    'gordon': ['gord'],
    'dean': ['dean'],
    'greg': ['greg'],
    'jorge': ['george'],
    'dustin': ['dusty'],
    'pedro': ['pete'],
    'derrick': ['derek'],
    'dan': ['dan'],
    'lewis': ['lew'],
    'zachary': ['zach'],
    'corey': ['corey'],
    'herman': ['herm'],
    'maurice': ['maurice'],
    'vernon': ['vern'],
    'roberto': ['rob', 'bob'],
    'clyde': ['clyde'],
    'glen': ['glenn'],
    'hector': ['hector'],
    'shane': ['shane'],
    'ricardo': ['rick'],
    'sam': ['sam'],
    'rick': ['rick'],
    'lester': ['les'],
    'brent': ['brent'],
    'ramon': ['ramon'],
    'charlie': ['charlie'],
    'tyler': ['tyler'],
    'gilbert': ['gil'],
    'gene': ['gene']
  };
  
  // Check for nickname matches
  const normalizedA = a.toLowerCase();
  const normalizedB = b.toLowerCase();
  
  // Check if either name is a nickname of the other
  if (nicknames[normalizedA] && nicknames[normalizedA].includes(normalizedB)) {
    return { matches: true, similarity: 0.95, reason: 'Nickname match' };
  }
  if (nicknames[normalizedB] && nicknames[normalizedB].includes(normalizedA)) {
    return { matches: true, similarity: 0.95, reason: 'Nickname match' };
  }
  
  // Check for exact match
  if (normalizedA === normalizedB) {
    return { matches: true, similarity: 1.0, reason: 'Exact match' };
  }
  
  // Check for prefix matches (for abbreviations like "J." vs "John")
  if ((normalizedA.startsWith(normalizedB) || normalizedB.startsWith(normalizedA)) && 
      Math.min(normalizedA.length, normalizedB.length) >= 2) {
    return { matches: true, similarity: 0.9, reason: 'Prefix match' };
  }
  
  // Check for similarity using Jaro-Winkler
  const similarity = jaroWinkler(normalizedA, normalizedB);
  
  // More lenient threshold for first names
  if (similarity >= 0.75) {
    return { matches: true, similarity, reason: 'Similarity match' };
  }
  
  return { matches: false, similarity, reason: 'No match' };
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

  async runTesseractOCR(localFilePath) {
    // Preprocess: autorotate, upscale moderately, grayscale, increase contrast, binarize, sharpen
    const preprocessedPath = localFilePath.replace(/(\.[a-z]+)$/i, '.preprocessed$1');
    await sharp(localFilePath)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .grayscale()
      .normalise()
      .threshold(140)
      .sharpen()
      .toFile(preprocessedPath);

    const { data } = await Tesseract.recognize(preprocessedPath, 'eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:/- ',
      preserve_interword_spaces: '1',
      psm: 6, // Assume a single uniform block of text
      oem: 1  // LSTM neural nets
    });
    return data.text || '';
  }

  parseSouthAfricanIdText(plainText) {
    const text = (plainText || '').replace(/\r/g, '').trim();
    const results = {};

    // Normalized helpers
    const oneLine = text.replace(/\s+/g, ' ');
    const upper = text.toUpperCase();

    // 1) Try labelled fields (English & common Afrikaans variants)
    const surnameMatch = upper.match(/\bSURNAME\b[:\s]*([A-Z' -]+)/) || upper.match(/\bVAN\b[:\s]*([A-Z' -]+)/);
    const namesMatch = upper.match(/\bNAMES?\b[:\s]*([A-Z' -]+)/) || upper.match(/\bNAME\b[:\s]*([A-Z' -]+)/);
    const idMatch = oneLine.match(/(?:Identity|Identiteit|ID|ID\.?|ID\s*No\.?|ID\s*Nr\.?|ID\s*Number|Identity\s*No\.?)[^0-9]*([0-9 ]{6,})/i);
    const dobMatch = oneLine.match(/(?:Date\s*of\s*Birth|Geboortedatum)[:\s]*([0-9]{1,2}\s*[A-Z]{3}\s*[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);

    if (surnameMatch) {
      const s = surnameMatch[1].trim();
      results.surname = s;
      results.fullName = results.fullName ? `${results.fullName} ${s}` : s;
    }
    if (namesMatch) {
      const names = namesMatch[1].trim();
      results.firstNames = names;
      results.fullName = results.fullName ? `${names} ${results.fullName}` : names;
    }
    if (idMatch) results.idNumber = idMatch[1].replace(/\D/g, '').slice(0, 13);
    if (dobMatch) results.dateOfBirth = dobMatch[1].trim();

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
      let surIdx = lines.findIndex(l => /(\bSURNAME\b|VAN\s*\/\s*SURNAME|VAN\s+SURNAME)/.test(l));
      let namesIdx = lines.findIndex(l => /(FORENAMES|VOORNAME)/.test(l));
      let surnameVal = null;
      let namesVal = null;
      if (surIdx >= 0) {
        // Scan up to 3 lines below to skip empty/noisy lines
        for (let k = 1; k <= 3 && surIdx + k < lines.length; k++) {
          const raw = lines[surIdx + k];
          // Ignore the S.A. BURGER/CITIZEN line completely
          if (/S\.?A\.?\s*\.?BURGER|CITIZEN/.test(raw)) continue;
          const cand = onlyLetters(raw).replace(/\s+/g, ' ').trim();
          if (cand && /^[A-Z'\-]{3,}$/.test(cand)) { surnameVal = cand; break; }
        }
      }
      if (namesIdx >= 0 && namesIdx + 1 < lines.length) {
        const cand = onlyLetters(lines[namesIdx + 1]);
        if (cand && /[A-Z]/.test(cand)) namesVal = cand.replace(/\s+/g, ' ').trim();
      }
      if (surnameVal || namesVal) {
        const first = namesVal ? namesVal.split(/\s+/)[0] : '';
        const last = surnameVal || '';
        const full = `${first} ${last}`.trim();
        if (last.length > 0) results.surname = last;
        if (first.length > 0) results.firstNames = first;
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

  // Process document OCR using OpenAI with fallback to Tesseract
  async processDocumentOCR(documentUrl, documentType) {
    try {
      // Initialize OpenAI if not already done
      await this.initializeOpenAI();

      // If OpenAI is not available, throw to trigger fallback
      if (!this.openai) {
        throw new Error('OpenAI API not available for OCR processing');
      }

      // Handle local file paths by converting to base64
      let imageData = null;
      let mimeType = 'image/jpeg';
      let localFilePath = null;
      
      if (documentUrl.startsWith('/uploads/')) {

        localFilePath = require('path').join(__dirname, '..', documentUrl);
        const fs = require('fs');
        const path = require('path');
        
        const fileBuffer = fs.readFileSync(localFilePath);
        imageData = fileBuffer.toString('base64');
        
        // Determine MIME type based on file extension
        const ext = path.extname(localFilePath).toLowerCase();
        if (['.jpg', '.jpeg'].includes(ext)) {
          mimeType = 'image/jpeg';
        } else if (ext === '.png') {
          mimeType = 'image/png';
        } else if (ext === '.pdf') {
          throw new Error('PDF files are not supported for OCR processing. Please upload an image file (JPEG or PNG).');
        } else {
          throw new Error('Unsupported file type. Please upload an image file (JPEG or PNG).');
        }
        

      } else {
        // For remote URLs, we'd need to fetch and convert
        throw new Error('Only local file processing is currently supported');
      }

      // Use real OpenAI vision API for OCR
      const prompt = documentType === 'id_document' 
        ? "Extract the following information from this identity document (South African ID book/card, South African passport, or international passport): Full name, ID/Passport number, Date of birth, Nationality, Document type (ID/Passport), Country of issue. Return as JSON format with exact values as they appear on the document."
        : "Extract the following information from this South African proof of address document: Street address, City, Postal code, Province. Return as JSON format.";

      
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: {
                url: `data:${mimeType};base64,${imageData}`
              }
            }
          ]
        }],
        max_tokens: 500
      });

      const content = response.choices[0].message.content || '';
      if (/i\s*can'?t\s*help/i.test(content) || /unable to extract/i.test(content)) {

        const tText = await this.runTesseractOCR(localFilePath);
        const parsed = this.parseSouthAfricanIdText(tText);
        return parsed;
      }

      
      
      const parsedFromOpenAI = this.parseOCRResults(content, documentType);
      if (documentType === 'id_document' && (!parsedFromOpenAI.fullName || !parsedFromOpenAI.idNumber)) {

        const tText = await this.runTesseractOCR(localFilePath);
        const parsed = this.parseSouthAfricanIdText(tText);
        return parsed.fullName || parsed.idNumber ? parsed : parsedFromOpenAI;
      }

      return parsedFromOpenAI;
      
    } catch (error) {
      console.error('❌ Error processing OCR (primary):', error);
      // Final fallback: try Tesseract if local file is available
      try {
        if (documentUrl.startsWith('/uploads/')) {
          const localFilePath = require('path').join(__dirname, '..', documentUrl);
          const tText = await this.runTesseractOCR(localFilePath);
          const parsed = this.parseSouthAfricanIdText(tText);
          return parsed;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback OCR also failed:', fallbackError);
      }
      throw new Error(`OCR processing failed: ${error.message}`);
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
        const canonical = {
          fullName:
            lower['full name'] || lower['name'] || lower['names'] || lower['fullname'] || null,
          idNumber:
            (lower['id/passport number'] || lower['identity number'] || lower['id number'] || lower['passport number'] || lower['id']) || null,
          licenseNumber:
            (lower['license number'] || lower['driving license number'] || lower['license']) || null,
          dateOfBirth:
            lower['date of birth'] || lower['dob'] || null,
          nationality: lower['nationality'] || null,
          documentType: lower['document type'] || lower['doctype'] || null,
          countryOfIssue: lower['country of issue'] || lower['country'] || null
        };
        // Ensure strings
        Object.keys(canonical).forEach(key => {
          if (canonical[key] != null) canonical[key] = String(canonical[key]).trim();
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

      // Required fields
      const fullName = (ocrResults && ocrResults.fullName) || '';
      const idNumber = (ocrResults && ocrResults.idNumber) || '';
      const licenseNumber = (ocrResults && ocrResults.licenseNumber) || '';
      const dateOfBirth = (ocrResults && ocrResults.dateOfBirth) || '';
      if (!fullName) validation.issues.push('Full name not found on document');
      if (!idNumber && !licenseNumber) validation.issues.push('ID/Passport/License number not found on document');
      if (!dateOfBirth) validation.issues.push('Date of birth not found on document');

      // Early return if basics missing
      if (validation.issues.length > 0) {
        return validation;
      }

      // Enhanced name matching with surname priority only (first name ignored)
      const docSurname = ocrResults.surname || '';
      const { first: docFirst, last: docLast } = splitFullName(fullName);
      const surnameForCompare = docSurname || docLast;
      const userFirst = normalizeName(user.firstName || '');
      const userLast = normalizeName(user.lastName || '');

      // Priority 1: Surname must match (robust normalization)
      // Pre-compute ID match (used to decide tolerance or skip when surname cannot be confidently extracted)
      const documentType = this.determineDocumentType(ocrResults);
      const registeredId = normalizeIdDigits(user.idNumber || '');
      const docIdForMatch = normalizeIdDigits(ocrResults.idNumber || ocrResults.licenseNumber || '');
      const idMatches = documentType === 'sa_id' && registeredId && docIdForMatch && registeredId === docIdForMatch;

      // If SA ID matches registration exactly, accept immediately to avoid false negatives from surname OCR.
      if (idMatches) {
        validation.confidence = 100;
        validation.isValid = true;
        return validation;
      }

      if (surnameForCompare && userLast) {
        const docLastNorm = normalizeSurnameOCR(surnameForCompare);
        const userLastNorm = normalizeSurnameOCR(userLast);
        if (docLastNorm !== userLastNorm) {
          const similarity = jaroWinkler(docLastNorm, userLastNorm);
          const threshold = 0.999;
          if (similarity < threshold) {
            validation.issues.push(`Surname mismatch (${surnameForCompare} vs ${user.firstName} ${user.lastName})`);
            return validation;
          }
        }
      } else if (!surnameForCompare) {
        validation.issues.push('Surname not found on document');
        return validation;
      }

      // Priority 2: Light first name matching (flexible)
      if (docFirst && userFirst) {
        const firstMatchResult = lightFirstNameMatch(docFirst, userFirst);
        if (!firstMatchResult.matches) {
          // Log the mismatch but don't fail validation
  
          validation.tolerantNameMatch = true; // Allow manual review
        }
      }

      // Enforce ID number match with what was captured at registration (only for SA IDs)
      const registeredId2 = normalizeIdDigits(user.idNumber || '');
      const docId2 = normalizeIdDigits(idNumber || licenseNumber || '');
      if (documentType === 'sa_id' && registeredId2 && docId2 && registeredId2 !== docId2) {
        // If both are 13 digits and docId has OCR ambiguities, still mismatch triggers failure
        validation.issues.push('ID number does not match the number captured at registration');
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

      // Enhanced confidence calculation with surname priority
      const checks = [
        // Surname match (critical - must pass)
        validation.issues.findIndex(i => i.toLowerCase().includes('surname')) === -1,
        // ID/Passport/License number (critical - must pass)
        validation.issues.findIndex(i => i.toLowerCase().includes('id') || i.toLowerCase().includes('passport') || i.toLowerCase().includes('license')) === -1,
        // Date of birth (critical - must pass)
        validation.issues.findIndex(i => i.toLowerCase().includes('birth')) === -1
      ];
      
      const criticalChecks = checks.filter(Boolean).length;
      const criticalConfidence = (criticalChecks / checks.length) * 100;
      
      // Confidence: surname + id + dob only
      validation.confidence = Math.min(100, criticalConfidence);
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

  // Process KYC submission with retry tracking
  async processKYCSubmission(userId, documentType, documentUrl, retryCount = 0) {
    try {
      
      
      // Process OCR
      const ocrResults = await this.processDocumentOCR(documentUrl, documentType);
      
      
      // Validate document against user information
      
      const validation = await this.validateDocumentAgainstUser(ocrResults, userId);
      

      // Add retry information to response
      const response = {
        success: validation.isValid, // Set success based on validation result
        ocrResults,
        validation,
        acceptedDocuments: this.getAcceptedDocuments(documentType),
        retryCount,
        canRetry: retryCount < 1 // Allow one retry
      };

      

      // Manual review path for first name mismatches (surname matches but first name doesn't)
      if (validation.tolerantNameMatch && validation.issues.length === 0) {
        response.status = 'review';
        response.message = 'Surname matches but first name differs. Requires manual review.';
        response.canRetry = false;
        response.escalateToSupport = true;

        return response;
      }

      // If validation failed and this is the first attempt, allow retry
      if (!validation.isValid && retryCount === 0) {
        response.status = 'retry';
        response.message = validation.issues.join('. ');
        response.success = false; // Ensure success is false for validation failures

      } else if (!validation.isValid && retryCount >= 1) {
        // Second failure - escalate to support
        response.status = 'failed';
        response.message = validation.issues.join('. ');
        response.escalateToSupport = true;
        response.success = false; // Ensure success is false for validation failures

      } else if (validation.isValid) {
        // Validation passed
        response.status = 'approved';
        response.message = 'KYC verification successful';

      }

      
      return response;
    } catch (error) {
      console.error('❌ Error processing KYC submission:', error);
      return {
        success: false,
        error: error.message,
        message: error.message,
        status: 'retry',
        acceptedDocuments: this.getAcceptedDocuments(documentType),
        retryCount,
        canRetry: retryCount < 1
      };
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