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
    // Enhanced preprocessing for South African ID documents
    // Strategy: Multiple preprocessing attempts with best result selection
    
    const preprocessedPaths = [];
    const strategies = [
      {
        name: 'high_contrast',
        process: async (input, output) => {
          await sharp(input)
            .rotate()
            .resize({ width: 2400, withoutEnlargement: true })
            .greyscale()
            .normalise()
            .sharpen({ sigma: 2, flat: 1, jagged: 2 })
            .modulate({ brightness: 1.1, saturation: 0 })
            .linear(1.2, -(128 * 0.2))
            .toFile(output);
        }
      },
      {
        name: 'adaptive_threshold',
        process: async (input, output) => {
          await sharp(input)
            .rotate()
            .resize({ width: 2400, withoutEnlargement: true })
            .greyscale()
            .normalise()
            .threshold(128)
            .sharpen({ sigma: 2.5 })
            .toFile(output);
        }
      },
      {
        name: 'color_channel',
        process: async (input, output) => {
          await sharp(input)
            .rotate()
            .resize({ width: 2400, withoutEnlargement: true })
            .extractChannel('red') // Extract red channel to reduce green background interference
            .greyscale()
            .normalise()
            .sharpen({ sigma: 2 })
            .linear(1.3, -(128 * 0.3))
            .toFile(output);
        }
      }
    ];

    const ocrResults = [];

    // Try each preprocessing strategy
    for (const strategy of strategies) {
      try {
        const preprocessedPath = localFilePath.replace(/(\.[a-z]+)$/i, `.${strategy.name}$1`);
        preprocessedPaths.push(preprocessedPath);
        
        await strategy.process(localFilePath, preprocessedPath);

        // Try multiple PSM modes for best results
        const psmModes = [6, 11, 12, 13];
        
        for (const psm of psmModes) {
          try {
            const { data } = await Tesseract.recognize(preprocessedPath, 'eng', {
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:/- ',
              preserve_interword_spaces: '1',
              psm: psm,
              oem: 1  // LSTM neural nets
            });

            const text = data.text || '';
            const confidence = data.confidence || 0;

            // Score this result
            const idMatch = text.match(/\b(\d{13})\b/);
            const surnameMatch = text.toUpperCase().match(/\bSURNAME\b[:\s]*([A-Z' -]+)/) || 
                                text.toUpperCase().match(/\bVAN\b[:\s]*([A-Z' -]+)/);
            const namesMatch = text.toUpperCase().match(/\bFORENAMES?\b[:\s]*([A-Z' -]+)/) ||
                             text.toUpperCase().match(/\bVOORNAME\b[:\s]*([A-Z' -]+)/);

            const score = (confidence / 100) + 
                         (idMatch ? 0.3 : 0) + 
                         (surnameMatch ? 0.2 : 0) + 
                         (namesMatch ? 0.2 : 0);

            ocrResults.push({
              text,
              confidence,
              score,
              strategy: strategy.name,
              psm,
              idMatch: !!idMatch,
              surnameMatch: !!surnameMatch,
              namesMatch: !!namesMatch
            });
          } catch (psmError) {
            // Continue with next PSM mode
          }
        }
      } catch (strategyError) {
        console.warn(`⚠️  Preprocessing strategy ${strategy.name} failed:`, strategyError.message);
      }
    }

    // Cleanup preprocessed files
    for (const path of preprocessedPaths) {
      await fs.unlink(path).catch(() => {});
    }

    // Select best result based on score
    if (ocrResults.length > 0) {
      ocrResults.sort((a, b) => b.score - a.score);
      const bestResult = ocrResults[0];
      
      console.log(`✅ Best OCR result: ${bestResult.strategy} PSM${bestResult.psm} (confidence: ${bestResult.confidence.toFixed(1)}%)`);
      
      return bestResult.text;
    }

    // Fallback to original simple preprocessing if all strategies fail
    const fallbackPath = localFilePath.replace(/(\.[a-z]+)$/i, '.fallback$1');
    await sharp(localFilePath)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .grayscale()
      .normalise()
      .threshold(140)
      .sharpen()
      .toFile(fallbackPath);

    const { data } = await Tesseract.recognize(fallbackPath, 'eng', {
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:/- ',
      preserve_interword_spaces: '1',
      psm: 6,
      oem: 1
    });

    await fs.unlink(fallbackPath).catch(() => {});
    return data.text || '';
  }

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

  // Process document OCR using OpenAI with fallback to Tesseract
  async processDocumentOCR(documentUrl, documentType) {
    // Check if we have a local file path for fallback
    const hasLocalFile = documentUrl && documentUrl.startsWith('/uploads/');
    let localFilePath = null;
    
    if (hasLocalFile) {
      localFilePath = require('path').join(__dirname, '..', documentUrl);
    }

    try {
      // Initialize OpenAI if not already done
      await this.initializeOpenAI();

      // If OpenAI is not available, use Tesseract fallback immediately
      if (!this.openai) {
        if (hasLocalFile) {
          console.log('ℹ️  OpenAI not available, using Tesseract OCR fallback');
          const tText = await this.runTesseractOCR(localFilePath);
          const parsed = this.parseSouthAfricanIdText(tText);
          return parsed;
        }
        throw new Error('OpenAI API not available and no local file for Tesseract fallback');
      }

      // Handle local file paths by converting to base64
      let imageData = null;
      let mimeType = 'image/jpeg';
      
      if (documentUrl.startsWith('/uploads/')) {
        // localFilePath already set above if hasLocalFile is true
        if (!localFilePath) {
          localFilePath = require('path').join(__dirname, '..', documentUrl);
        }
        
        const fileBuffer = await fs.readFile(localFilePath);
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

      
      
      // Preprocess image for better OCR quality before sending to OpenAI
      let enhancedImageData = imageData;
      try {
        const enhancedBuffer = await sharp(localFilePath)
          .rotate()
          .resize({ width: 2400, withoutEnlargement: true })
          .greyscale()
          .normalise()
          .sharpen({ sigma: 2, flat: 1, jagged: 2 })
          .modulate({ brightness: 1.1, saturation: 0 })
          .linear(1.2, -(128 * 0.2))
          .toBuffer();
        
        enhancedImageData = enhancedBuffer.toString('base64');
      } catch (preprocessError) {
        console.warn('⚠️  Image preprocessing failed, using original:', preprocessError.message);
        // Continue with original image
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { 
              type: "image_url", 
              image_url: {
                url: `data:${mimeType};base64,${enhancedImageData}`,
                detail: "high" // Request high detail for better OCR
              }
            }
          ]
        }],
        max_tokens: 500,
        temperature: 0.1 // Low temperature for more accurate extraction
      });

      const content = response.choices[0].message.content || '';
      if (/i\s*can'?t\s*help/i.test(content) || /unable to extract/i.test(content)) {

        const tText = await this.runTesseractOCR(localFilePath);
        const parsed = this.parseSouthAfricanIdText(tText);
        return parsed;
      }

      
      
      const parsedFromOpenAI = this.parseOCRResults(content, documentType);
      
      // Enhanced validation: If critical fields are missing, try Tesseract fallback
      if (documentType === 'id_document') {
        const hasIdNumber = parsedFromOpenAI.idNumber && /^\d{13}$/.test(parsedFromOpenAI.idNumber.replace(/\D/g, ''));
        const hasSurname = parsedFromOpenAI.surname && parsedFromOpenAI.surname.trim().length >= 2;
        const hasForenames = parsedFromOpenAI.forenames && parsedFromOpenAI.forenames.trim().length >= 2;
        
        if (!hasIdNumber || (!hasSurname && !hasForenames)) {
          console.log('⚠️  OpenAI OCR missing critical fields, trying Tesseract fallback...');
          const tText = await this.runTesseractOCR(localFilePath);
          const parsed = this.parseSouthAfricanIdText(tText);
          
          // Merge results: prefer OpenAI but fill missing fields from Tesseract
          const merged = {
            ...parsedFromOpenAI,
            idNumber: parsedFromOpenAI.idNumber || parsed.idNumber,
            surname: parsedFromOpenAI.surname || parsed.surname,
            forenames: parsedFromOpenAI.forenames || parsed.firstNames,
            fullName: parsedFromOpenAI.fullName || parsed.fullName,
            dateOfBirth: parsedFromOpenAI.dateOfBirth || parsed.dateOfBirth
          };
          
          // Use Tesseract result if it has more complete data
          if ((parsed.idNumber && parsed.surname) && (!hasIdNumber || !hasSurname)) {
            console.log('✅ Using Tesseract result (more complete)');
            return parsed;
          }
          
          return merged;
        }
      }

      return parsedFromOpenAI;
      
    } catch (error) {
      console.error('❌ Error processing OCR (primary):', error);
      // Final fallback: try Tesseract if local file is available
      // This handles cases where OpenAI API fails (401, 429, network errors, etc.)
      if (hasLocalFile && localFilePath) {
        try {
          console.log('ℹ️  Attempting Tesseract OCR fallback due to OpenAI error...');
          const tText = await this.runTesseractOCR(localFilePath);
          const parsed = this.parseSouthAfricanIdText(tText);
          console.log('✅ Tesseract OCR fallback successful');
          return parsed;
        } catch (fallbackError) {
          console.error('❌ Fallback OCR also failed:', fallbackError);
          // If fallback also fails, throw the original error with fallback failure info
          throw new Error(`OCR processing failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
        }
      } else if (hasLocalFile) {
        // localFilePath should already be set, but if not, try to set it again
        try {
          const fallbackFilePath = require('path').join(__dirname, '..', documentUrl);
          console.log('ℹ️  Attempting Tesseract OCR fallback due to OpenAI error...');
          const tText = await this.runTesseractOCR(fallbackFilePath);
          const parsed = this.parseSouthAfricanIdText(tText);
          console.log('✅ Tesseract OCR fallback successful');
          return parsed;
        } catch (fallbackError) {
          console.error('❌ Fallback OCR also failed:', fallbackError);
          throw new Error(`OCR processing failed: ${error.message}. Fallback also failed: ${fallbackError.message}`);
        }
      }
      // If no local file available, throw the original error
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