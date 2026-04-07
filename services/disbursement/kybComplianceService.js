'use strict';

/**
 * @module kybComplianceService
 * @description KYB (Know Your Business) and KYC compliance service for disbursement clients.
 *
 * Uses GPT-4o for document OCR/extraction from uploaded GCS files.
 * Validates extracted data against client records and SA regulatory requirements.
 * Evaluates overall KYB readiness per entity type.
 */

const OpenAI = require('openai');
const { Storage } = require('@google-cloud/storage');
const { getUATClient, getStagingClient, getProductionClient } = require('../../scripts/db-connection-helper');

const LOG_PREFIX = '[KYBCompliance]';
const storage = new Storage();
const MAX_RETRIES = 2;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Database client resolution
// ---------------------------------------------------------------------------

function getClient() {
  const env = process.env.MM_DEPLOYMENT_ENV || process.env.NODE_ENV || 'uat';
  if (env === 'production') return getProductionClient();
  if (env === 'staging') return getStagingClient();
  return getUATClient();
}

// ---------------------------------------------------------------------------
// KYB document requirements by entity type
// ---------------------------------------------------------------------------

const REQUIRED_DOCUMENTS = Object.freeze({
  company: [
    { documentType: 'cor15', description: 'Company registration certificate (CoR15)', required: true },
    { documentType: 'id_document', description: 'ID document of all directors', required: true },
    { documentType: 'proof_of_address', description: 'Proof of business address', required: true },
    { documentType: 'bank_confirmation', description: 'Bank confirmation letter', required: true },
    { documentType: 'tax_clearance', description: 'SARS tax clearance certificate', required: false },
    { documentType: 'resolution', description: 'Board resolution for authorized signatories', required: true },
  ],
  close_corporation: [
    { documentType: 'ck1', description: 'CK1 founding statement', required: true },
    { documentType: 'id_document', description: 'ID document of all members', required: true },
    { documentType: 'proof_of_address', description: 'Proof of business address', required: true },
    { documentType: 'bank_confirmation', description: 'Bank confirmation letter', required: true },
  ],
  trust: [
    { documentType: 'trust_deed', description: 'Trust deed', required: true },
    { documentType: 'id_document', description: 'ID document of all trustees', required: true },
    { documentType: 'proof_of_address', description: 'Proof of trust address', required: true },
    { documentType: 'bank_confirmation', description: 'Bank confirmation letter', required: true },
    { documentType: 'resolution', description: 'Letter of authority', required: true },
  ],
  sole_proprietor: [
    { documentType: 'id_document', description: 'ID document of owner', required: true },
    { documentType: 'proof_of_address', description: 'Proof of business/residential address', required: true },
    { documentType: 'bank_confirmation', description: 'Bank confirmation letter', required: true },
  ],
  individual: [
    { documentType: 'id_document', description: 'ID document (SA ID, passport, or asylum seeker permit)', required: true },
    { documentType: 'proof_of_address', description: 'Proof of residential address', required: true },
  ],
});

const VALID_ENTITY_TYPES = Object.keys(REQUIRED_DOCUMENTS);

const VALID_DOCUMENT_TYPES = [
  'cor15', 'cor14_3', 'ck1', 'trust_deed', 'id_document',
  'proof_of_address', 'bank_confirmation', 'tax_clearance', 'resolution',
];

// ---------------------------------------------------------------------------
// Extraction field definitions per document type (used in GPT-4o prompts)
// ---------------------------------------------------------------------------

const EXTRACTION_FIELDS = Object.freeze({
  cor15: {
    description: 'CoR15 — Company Registration Certificate',
    fields: {
      companyName: 'Full registered company name',
      registrationNumber: 'Company registration number (e.g. 2024/123456/07)',
      directors: 'Array of directors, each with: { fullName, idNumber }',
      registeredAddress: 'Full registered address as a single string',
      dateOfIncorporation: 'Date of incorporation (YYYY-MM-DD)',
    },
  },
  cor14_3: {
    description: 'CoR14.3 — Change of Directors',
    fields: {
      companyName: 'Company name',
      registrationNumber: 'Company registration number',
      directors: 'Array of directors after change, each with: { fullName, idNumber, appointmentDate }',
    },
  },
  ck1: {
    description: 'CK1 — Close Corporation Founding Statement',
    fields: {
      ccName: 'Full CC name',
      registrationNumber: 'CC registration number (e.g. CK2005/123456/23)',
      members: 'Array of members, each with: { fullName, idNumber, percentageInterest }',
      registeredAddress: 'Registered address',
    },
  },
  trust_deed: {
    description: 'Trust Deed',
    fields: {
      trustName: 'Name of the trust',
      mastersReference: "Master's office reference number",
      trustees: 'Array of trustees, each with: { fullName, idNumber }',
      beneficiaries: 'Array of beneficiary names',
    },
  },
  id_document: {
    description: 'South African ID Document / Passport / Asylum Seeker Permit',
    fields: {
      fullName: 'Full name as printed on the document',
      idNumber: 'SA ID number (13 digits) or passport number',
      dateOfBirth: 'Date of birth (YYYY-MM-DD)',
      nationality: 'Nationality / country of issue',
      expiryDate: 'Document expiry date (YYYY-MM-DD), null if not applicable',
      documentSubType: 'One of: sa_id, passport, asylum_permit',
    },
  },
  proof_of_address: {
    description: 'Proof of Address (utility bill, bank statement, rates account)',
    fields: {
      address: 'Full physical address as printed',
      nameOnDocument: 'Name of the account holder on the document',
      documentDate: 'Date of the document (YYYY-MM-DD)',
      utilityType: 'Type of utility/document (e.g. electricity, water, rates, bank statement)',
    },
  },
  bank_confirmation: {
    description: 'Bank Confirmation Letter',
    fields: {
      bankName: 'Name of the bank',
      accountNumber: 'Bank account number',
      branchCode: 'Branch code',
      accountHolderName: 'Account holder name as per the bank',
      accountType: 'Account type (e.g. cheque, savings, business)',
    },
  },
  tax_clearance: {
    description: 'SARS Tax Clearance Certificate',
    fields: {
      taxReferenceNumber: 'Tax reference number',
      taxStatus: 'Tax compliance status (e.g. compliant, non-compliant)',
      expiryDate: 'Certificate expiry date (YYYY-MM-DD)',
      entityName: 'Name of the taxpayer entity',
    },
  },
  resolution: {
    description: 'Board Resolution / Letter of Authority',
    fields: {
      entityName: 'Name of the company/trust',
      authorizedSignatories: 'Array of authorized persons, each with: { fullName, idNumber, role }',
      resolutionDate: 'Date of the resolution (YYYY-MM-DD)',
      purpose: 'Purpose/scope of the resolution',
    },
  },
});

// ---------------------------------------------------------------------------
// SA ID number validation
// ---------------------------------------------------------------------------

function validateSAID(idNumber) {
  if (!idNumber || typeof idNumber !== 'string') {
    return { valid: false, reason: 'ID number is missing or not a string' };
  }

  const cleaned = idNumber.replace(/\s/g, '');
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, reason: 'ID number must be exactly 13 digits' };
  }

  const year = parseInt(cleaned.substring(0, 2), 10);
  const month = parseInt(cleaned.substring(2, 4), 10);
  const day = parseInt(cleaned.substring(4, 6), 10);

  if (month < 1 || month > 12) {
    return { valid: false, reason: 'Invalid month in ID number' };
  }
  if (day < 1 || day > 31) {
    return { valid: false, reason: 'Invalid day in ID number' };
  }

  const fullYear = year >= 0 && year <= 26 ? 2000 + year : 1900 + year;
  const dob = new Date(fullYear, month - 1, day);
  if (dob.getMonth() !== month - 1 || dob.getDate() !== day) {
    return { valid: false, reason: 'Date of birth encoded in ID is not a valid calendar date' };
  }

  const citizenshipDigit = parseInt(cleaned[10], 10);
  if (citizenshipDigit !== 0 && citizenshipDigit !== 1) {
    return { valid: false, reason: 'Citizenship digit must be 0 (SA citizen) or 1 (permanent resident)' };
  }

  // Luhn check
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(cleaned[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  if (sum % 10 !== 0) {
    return { valid: false, reason: 'Luhn check digit failed' };
  }

  const genderCode = parseInt(cleaned.substring(6, 10), 10);
  return {
    valid: true,
    dateOfBirth: `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    gender: genderCode < 5000 ? 'female' : 'male',
    citizen: citizenshipDigit === 0,
  };
}

// ---------------------------------------------------------------------------
// GCS file download
// ---------------------------------------------------------------------------

async function downloadFromGCS(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    throw new Error('Invalid file URL');
  }

  let bucketName;
  let filePath;

  if (fileUrl.startsWith('gs://')) {
    const withoutScheme = fileUrl.slice(5);
    const slashIdx = withoutScheme.indexOf('/');
    bucketName = withoutScheme.substring(0, slashIdx);
    filePath = withoutScheme.substring(slashIdx + 1);
  } else if (fileUrl.includes('storage.googleapis.com')) {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    bucketName = parts[0];
    filePath = parts.slice(1).join('/');
  } else {
    throw new Error('Unsupported file URL format — expected gs:// or storage.googleapis.com URL');
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);

  const [exists] = await file.exists();
  if (!exists) {
    throw new Error('Document file not found in GCS');
  }

  const [buffer] = await file.download();
  const [metadata] = await file.getMetadata();
  const contentType = metadata.contentType || 'application/octet-stream';

  return { buffer, contentType, filePath };
}

// ---------------------------------------------------------------------------
// GPT-4o document analysis
// ---------------------------------------------------------------------------

function buildExtractionPrompt(documentType) {
  const spec = EXTRACTION_FIELDS[documentType];
  if (!spec) {
    throw new Error(`No extraction spec defined for document type: ${documentType}`);
  }

  const fieldList = Object.entries(spec.fields)
    .map(([key, desc]) => `  "${key}": ${desc}`)
    .join('\n');

  return `You are a KYB (Know Your Business) compliance analyst for a South African banking platform.

Analyze this ${spec.description} document and extract the following fields in JSON format:
{
${fieldList}
}

Rules:
- Extract EXACTLY what appears in the document
- If a field is not visible or unclear, set it to null
- For dates, use ISO format (YYYY-MM-DD)
- For ID numbers, include all 13 digits
- For amounts, use numeric values
- Respond ONLY with valid JSON, no additional text`;
}

async function callGPT4oForExtraction(base64Data, contentType, documentType) {
  const prompt = buildExtractionPrompt(documentType);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`${LOG_PREFIX} GPT-4o extraction attempt ${attempt}/${MAX_RETRIES} for type=${documentType}`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a precise document OCR and data extraction system. Return only valid JSON.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${contentType};base64,${base64Data}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_completion_tokens: 4000,
      });

      if (!response?.choices?.length) {
        throw new Error('OpenAI returned empty response');
      }

      const raw = response.choices[0].message?.content || '';
      console.log(`${LOG_PREFIX} GPT-4o responded, model=${response.model}, tokens=${JSON.stringify(response.usage || {})}`);

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('GPT-4o response did not contain valid JSON');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      lastError = err;
      console.error(`${LOG_PREFIX} GPT-4o attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw new Error(`Document extraction failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

// ---------------------------------------------------------------------------
// Public: getRequiredDocuments
// ---------------------------------------------------------------------------

function getRequiredDocuments(entityType) {
  if (!entityType || typeof entityType !== 'string') {
    throw new Error('entityType is required');
  }

  const normalized = entityType.toLowerCase().trim();
  if (!VALID_ENTITY_TYPES.includes(normalized)) {
    throw new Error(`Invalid entity type: "${entityType}". Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
  }

  return REQUIRED_DOCUMENTS[normalized].map((doc) => ({ ...doc }));
}

// ---------------------------------------------------------------------------
// Public: analyzeDocument
// ---------------------------------------------------------------------------

async function analyzeDocument({ clientId, documentType, fileUrl }) {
  if (!clientId) throw new Error('clientId is required');
  if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
    throw new Error(`Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`);
  }
  if (!fileUrl) throw new Error('fileUrl is required');

  console.log(`${LOG_PREFIX} Analyzing document type=${documentType} for client=${clientId}`);

  const { buffer, contentType } = await downloadFromGCS(fileUrl);
  const base64Data = buffer.toString('base64');
  const extractedData = await callGPT4oForExtraction(base64Data, contentType, documentType);

  const client = await getClient();
  try {
    await client.query(
      `UPDATE kyb_documents
          SET extracted_data = $1,
              status = 'extracted',
              updated_at = NOW()
        WHERE client_id = $2
          AND document_type = $3
          AND file_url = $4`,
      [JSON.stringify(extractedData), clientId, documentType, fileUrl]
    );

    console.log(`${LOG_PREFIX} Extraction saved for type=${documentType}, client=${clientId}`);
    return extractedData;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Public: validateExtractedData
// ---------------------------------------------------------------------------

async function validateExtractedData(clientId, documentType, extractedData) {
  if (!clientId) throw new Error('clientId is required');
  if (!documentType) throw new Error('documentType is required');
  if (!extractedData || typeof extractedData !== 'object') {
    throw new Error('extractedData must be a non-null object');
  }

  const errors = [];
  const warnings = [];

  const client = await getClient();
  try {
    const { rows } = await client.query(
      `SELECT company_name, registration_number, entity_type
         FROM disbursement_clients
        WHERE id = $1`,
      [clientId]
    );

    if (!rows.length) {
      return { valid: false, errors: ['Client not found'], warnings: [] };
    }

    const clientRecord = rows[0];

    // --- Document-specific validation ---

    if (documentType === 'cor15' || documentType === 'cor14_3') {
      const extractedName = (extractedData.companyName || '').trim().toLowerCase();
      const clientName = (clientRecord.company_name || '').trim().toLowerCase();
      if (extractedName && clientName && extractedName !== clientName) {
        errors.push(`Company name mismatch: document has "${extractedData.companyName}", client record has "${clientRecord.company_name}"`);
      }

      const extractedReg = (extractedData.registrationNumber || '').replace(/\s/g, '');
      const clientReg = (clientRecord.registration_number || '').replace(/\s/g, '');
      if (extractedReg && clientReg && extractedReg !== clientReg) {
        errors.push('Registration number does not match client record');
      }

      if (Array.isArray(extractedData.directors)) {
        for (const director of extractedData.directors) {
          if (director.idNumber) {
            const idResult = validateSAID(director.idNumber);
            if (!idResult.valid) {
              errors.push(`Director ID validation failed: ${idResult.reason}`);
            }
          }
        }
      }
    }

    if (documentType === 'ck1') {
      const extractedName = (extractedData.ccName || '').trim().toLowerCase();
      const clientName = (clientRecord.company_name || '').trim().toLowerCase();
      if (extractedName && clientName && extractedName !== clientName) {
        errors.push(`CC name mismatch: document has "${extractedData.ccName}", client record has "${clientRecord.company_name}"`);
      }

      const extractedReg = (extractedData.registrationNumber || '').replace(/\s/g, '');
      const clientReg = (clientRecord.registration_number || '').replace(/\s/g, '');
      if (extractedReg && clientReg && extractedReg !== clientReg) {
        errors.push('Registration number does not match client record');
      }

      if (Array.isArray(extractedData.members)) {
        for (const member of extractedData.members) {
          if (member.idNumber) {
            const idResult = validateSAID(member.idNumber);
            if (!idResult.valid) {
              errors.push(`Member ID validation failed: ${idResult.reason}`);
            }
          }
        }
      }
    }

    if (documentType === 'trust_deed') {
      if (Array.isArray(extractedData.trustees)) {
        for (const trustee of extractedData.trustees) {
          if (trustee.idNumber) {
            const idResult = validateSAID(trustee.idNumber);
            if (!idResult.valid) {
              errors.push(`Trustee ID validation failed: ${idResult.reason}`);
            }
          }
        }
      }
    }

    if (documentType === 'id_document') {
      if (extractedData.idNumber && extractedData.documentSubType === 'sa_id') {
        const idResult = validateSAID(extractedData.idNumber);
        if (!idResult.valid) {
          errors.push(`SA ID validation failed: ${idResult.reason}`);
        }
      }

      if (extractedData.expiryDate) {
        const expiry = new Date(extractedData.expiryDate);
        if (expiry < new Date()) {
          errors.push('ID document has expired');
        }
      }
    }

    if (documentType === 'proof_of_address') {
      if (extractedData.address) {
        const addrLower = extractedData.address.toLowerCase();
        if (/\bp\.?\s*o\.?\s*box\b/i.test(addrLower) || /\bpo\s*box\b/i.test(addrLower)) {
          errors.push('Address is a PO Box — a physical address is required');
        }
        if (/\bprivate\s*bag\b/i.test(addrLower)) {
          errors.push('Address is a Private Bag — a physical address is required');
        }
      }

      if (extractedData.documentDate) {
        const docDate = new Date(extractedData.documentDate);
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        if (docDate < threeMonthsAgo) {
          errors.push('Proof of address is older than 3 months');
        }
      } else {
        warnings.push('Document date could not be extracted — manual review recommended');
      }
    }

    if (documentType === 'bank_confirmation') {
      if (!extractedData.bankName) {
        errors.push('Bank name not found in document');
      }
      if (!extractedData.accountNumber) {
        errors.push('Account number not found in document');
      }
      if (!extractedData.accountHolderName) {
        warnings.push('Account holder name not extracted — manual verification needed');
      }
    }

    if (documentType === 'tax_clearance') {
      if (extractedData.expiryDate) {
        const expiry = new Date(extractedData.expiryDate);
        if (expiry < new Date()) {
          errors.push('Tax clearance certificate has expired');
        }
      }
      if (extractedData.taxStatus && extractedData.taxStatus.toLowerCase() !== 'compliant') {
        errors.push(`Tax status is "${extractedData.taxStatus}" — must be compliant`);
      }
    }

    if (documentType === 'resolution') {
      if (!Array.isArray(extractedData.authorizedSignatories) || extractedData.authorizedSignatories.length === 0) {
        errors.push('No authorized signatories found in resolution');
      }
    }

    const validationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
    };

    await client.query(
      `UPDATE kyb_documents
          SET validation_result = $1,
              status = CASE WHEN $2 THEN 'validated' ELSE 'validation_failed' END,
              updated_at = NOW()
        WHERE client_id = $3
          AND document_type = $4`,
      [JSON.stringify(validationResult), errors.length === 0, clientId, documentType]
    );

    console.log(`${LOG_PREFIX} Validation complete for type=${documentType}, client=${clientId}, valid=${errors.length === 0}`);
    return validationResult;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Public: evaluateKYBStatus
// ---------------------------------------------------------------------------

async function evaluateKYBStatus(clientId) {
  if (!clientId) throw new Error('clientId is required');

  const client = await getClient();
  try {
    const { rows: clientRows } = await client.query(
      `SELECT id, entity_type, company_name, kyb_status
         FROM disbursement_clients
        WHERE id = $1`,
      [clientId]
    );

    if (!clientRows.length) {
      return {
        status: 'rejected',
        missingDocuments: [],
        failedDocuments: [],
        summary: 'Client not found',
      };
    }

    const { entity_type: entityType, company_name: companyName } = clientRows[0];
    const required = REQUIRED_DOCUMENTS[entityType];
    if (!required) {
      return {
        status: 'rejected',
        missingDocuments: [],
        failedDocuments: [],
        summary: `Unknown entity type: ${entityType}`,
      };
    }

    const { rows: documents } = await client.query(
      `SELECT document_type, status, validation_result
         FROM kyb_documents
        WHERE client_id = $1
        ORDER BY created_at DESC`,
      [clientId]
    );

    const docMap = new Map();
    for (const doc of documents) {
      if (!docMap.has(doc.document_type)) {
        docMap.set(doc.document_type, doc);
      }
    }

    const missingDocuments = [];
    const failedDocuments = [];
    let allRequiredValid = true;

    for (const req of required) {
      const uploaded = docMap.get(req.documentType);

      if (!uploaded) {
        if (req.required) {
          missingDocuments.push({
            documentType: req.documentType,
            description: req.description,
          });
          allRequiredValid = false;
        }
        continue;
      }

      if (uploaded.status === 'validation_failed' || uploaded.status === 'rejected') {
        const validationErrors = uploaded.validation_result?.errors || [];
        failedDocuments.push({
          documentType: req.documentType,
          description: req.description,
          status: uploaded.status,
          errors: validationErrors,
        });
        if (req.required) {
          allRequiredValid = false;
        }
      } else if (uploaded.status !== 'validated' && uploaded.status !== 'approved') {
        if (req.required) {
          allRequiredValid = false;
          missingDocuments.push({
            documentType: req.documentType,
            description: req.description,
            note: `Uploaded but not yet validated (status: ${uploaded.status})`,
          });
        }
      }
    }

    let status;
    let summary;

    if (failedDocuments.length > 0) {
      status = 'rejected';
      summary = `${failedDocuments.length} document(s) failed validation`;
    } else if (missingDocuments.length > 0) {
      status = 'incomplete';
      summary = `${missingDocuments.length} required document(s) missing or pending validation`;
    } else if (allRequiredValid) {
      status = 'approved';
      summary = `All required documents validated for ${entityType}`;
    } else {
      status = 'pending';
      summary = 'Documents under review';
    }

    if (status === 'approved') {
      await client.query(
        `UPDATE disbursement_clients
            SET kyb_status = 'approved',
                kyb_completed_at = NOW(),
                updated_at = NOW()
          WHERE id = $1
            AND kyb_status != 'approved'`,
        [clientId]
      );
      console.log(`${LOG_PREFIX} KYB approved for client=${clientId}`);
    }

    console.log(`${LOG_PREFIX} KYB evaluation for client=${clientId}: status=${status}`);

    return {
      status,
      missingDocuments,
      failedDocuments,
      summary,
    };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  analyzeDocument,
  getRequiredDocuments,
  evaluateKYBStatus,
  validateExtractedData,
  REQUIRED_DOCUMENTS,
};
