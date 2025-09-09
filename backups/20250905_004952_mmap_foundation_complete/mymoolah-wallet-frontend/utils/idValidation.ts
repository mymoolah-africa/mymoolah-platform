// Comprehensive ID/Passport validation for global support, especially African countries

export interface IdValidationResult {
  isValid: boolean;
  type: string;
  country?: string;
  confidence: number;
  message?: string;
  format?: string;
}

export interface IdPattern {
  pattern: RegExp;
  type: string;
  country: string;
  description: string;
  format: string;
  confidence: number;
}

// Global ID/Passport patterns with focus on African countries
export const ID_PATTERNS: IdPattern[] = [
  // South African ID Number (13 digits)
  {
    pattern: /^[0-9]{13}$/,
    type: 'south_african_id',
    country: 'ZA',
    description: 'South African ID Number',
    format: 'YYMMDD 0000 000 0',
    confidence: 95
  },

  // South African Passport (2 letters + 7 digits)
  {
    pattern: /^[A-Z]{2}[0-9]{7}$/,
    type: 'south_african_passport',
    country: 'ZA',
    description: 'South African Passport',
    format: 'AB1234567',
    confidence: 90
  },

  // Nigerian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'nigerian_passport',
    country: 'NG',
    description: 'Nigerian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Kenyan Passport (1 letter + 7 digits)
  {
    pattern: /^[A-Z][0-9]{7}$/,
    type: 'kenyan_passport',
    country: 'KE',
    description: 'Kenyan Passport',
    format: 'A1234567',
    confidence: 90
  },

  // Ghanaian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'ghanaian_passport',
    country: 'GH',
    description: 'Ghanaian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Egyptian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'egyptian_passport',
    country: 'EG',
    description: 'Egyptian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Moroccan Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'moroccan_passport',
    country: 'MA',
    description: 'Moroccan Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Ethiopian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'ethiopian_passport',
    country: 'ET',
    description: 'Ethiopian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Tanzanian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'tanzanian_passport',
    country: 'TZ',
    description: 'Tanzanian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Ugandan Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'ugandan_passport',
    country: 'UG',
    description: 'Ugandan Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Rwandan Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'rwandan_passport',
    country: 'RW',
    description: 'Rwandan Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Zambian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'zambian_passport',
    country: 'ZM',
    description: 'Zambian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Zimbabwean Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'zimbabwean_passport',
    country: 'ZW',
    description: 'Zimbabwean Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Malawian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'malawian_passport',
    country: 'MW',
    description: 'Malawian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Mozambican Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'mozambican_passport',
    country: 'MZ',
    description: 'Mozambican Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Angolan Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'angolan_passport',
    country: 'AO',
    description: 'Angolan Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Namibian Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'namibian_passport',
    country: 'NA',
    description: 'Namibian Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Botswanan Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'botswanan_passport',
    country: 'BW',
    description: 'Botswanan Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Lesothan Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'lesothan_passport',
    country: 'LS',
    description: 'Lesothan Passport',
    format: 'A12345678',
    confidence: 90
  },

  // Eswatini Passport (1 letter + 8 digits)
  {
    pattern: /^[A-Z][0-9]{8}$/,
    type: 'eswatini_passport',
    country: 'SZ',
    description: 'Eswatini Passport',
    format: 'A12345678',
    confidence: 90
  },

  // South African Driving License (2 letters + 6 digits + 2 letters)
  {
    pattern: /^[A-Z]{2}[0-9]{6}[A-Z]{2}$/,
    type: 'south_african_driving_license',
    country: 'ZA',
    description: 'South African Driving License',
    format: 'AB123456CD',
    confidence: 90
  },

  // South African Temporary ID Certificate (13 digits)
  {
    pattern: /^[0-9]{13}$/,
    type: 'south_african_temporary_id',
    country: 'ZA',
    description: 'South African Temporary ID Certificate',
    format: 'YYMMDD 0000 000 0',
    confidence: 95
  },

  // International Passport (2 letters + 7 digits) - Generic pattern
  {
    pattern: /^[A-Z]{2}[0-9]{7}$/,
    type: 'international_passport',
    country: 'INT',
    description: 'International Passport',
    format: 'AB1234567',
    confidence: 80
  },

  // Generic Passport (1-2 letters + 6-9 digits)
  {
    pattern: /^[A-Z]{1,2}[0-9]{6,9}$/,
    type: 'generic_passport',
    country: 'GENERIC',
    description: 'Passport Number',
    format: 'A1234567',
    confidence: 70
  },

  // Generic ID (8-15 digits)
  {
    pattern: /^[0-9]{8,15}$/,
    type: 'generic_id',
    country: 'GENERIC',
    description: 'ID Number',
    format: '123456789',
    confidence: 60
  }
];

// Country codes mapping for better UX
export const COUNTRY_CODES: { [key: string]: string } = {
  'ZA': 'South Africa',
  'NG': 'Nigeria',
  'KE': 'Kenya',
  'GH': 'Ghana',
  'EG': 'Egypt',
  'MA': 'Morocco',
  'ET': 'Ethiopia',
  'TZ': 'Tanzania',
  'UG': 'Uganda',
  'RW': 'Rwanda',
  'ZM': 'Zambia',
  'ZW': 'Zimbabwe',
  'MW': 'Malawi',
  'MZ': 'Mozambique',
  'AO': 'Angola',
  'NA': 'Namibia',
  'BW': 'Botswana',
  'LS': 'Lesotho',
  'SZ': 'Eswatini',
  'INT': 'International',
  'GENERIC': 'Generic'
};

/**
 * Validates an ID/Passport number and returns detailed information
 */
export function validateIdNumber(idNumber: string): IdValidationResult {
  const cleanId = idNumber.replace(/\s/g, '').toUpperCase();
  
  if (!cleanId) {
    return {
      isValid: false,
      type: 'unknown',
      confidence: 0,
      message: 'Please enter an ID or passport number'
    };
  }

  // Test against all patterns
  for (const pattern of ID_PATTERNS) {
    if (pattern.pattern.test(cleanId)) {
      return {
        isValid: true,
        type: pattern.type,
        country: pattern.country,
        confidence: pattern.confidence,
        message: `${pattern.description} detected`,
        format: pattern.format
      };
    }
  }

  // If no pattern matches, provide helpful feedback
  return {
    isValid: false,
    type: 'unknown',
    confidence: 0,
    message: 'Invalid ID or passport number format'
  };
}

/**
 * Auto-detects ID type based on input
 */
export function detectIdType(idNumber: string): string {
  const result = validateIdNumber(idNumber);
  return result.type;
}

/**
 * Gets the country name from country code
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_CODES[countryCode] || 'Unknown';
}

/**
 * Formats ID number for display
 */
export function formatIdNumber(idNumber: string, type: string): string {
  const cleanId = idNumber.replace(/\s/g, '').toUpperCase();
  
  switch (type) {
    case 'south_african_id':
      // Format as YYMMDD 0000 000 0
      return cleanId.replace(/(\d{6})(\d{4})(\d{3})(\d{1})/, '$1 $2 $3 $4');
    
    case 'south_african_driving_license':
      // Format as AB 123456 CD
      return cleanId.replace(/([A-Z]{2})(\d{6})([A-Z]{2})/, '$1 $2 $3');
    
    default:
      // For passports, add spaces every 3 characters
      return cleanId.replace(/(.{3})/g, '$1 ').trim();
  }
}

/**
 * Gets placeholder text based on detected type
 */
export function getPlaceholderText(type: string): string {
  switch (type) {
    case 'south_african_id':
      return 'YYMMDD 0000 000 0';
    case 'south_african_passport':
      return 'AB1234567';
    case 'south_african_driving_license':
      return 'AB123456CD';
    case 'south_african_temporary_id':
      return 'YYMMDD 0000 000 0';
    case 'nigerian_passport':
    case 'kenyan_passport':
    case 'ghanaian_passport':
    case 'egyptian_passport':
    case 'moroccan_passport':
    case 'ethiopian_passport':
    case 'tanzanian_passport':
    case 'ugandan_passport':
    case 'rwandan_passport':
    case 'zambian_passport':
    case 'zimbabwean_passport':
    case 'malawian_passport':
    case 'mozambican_passport':
    case 'angolan_passport':
    case 'namibian_passport':
    case 'botswanan_passport':
    case 'lesothan_passport':
    case 'eswatini_passport':
      return 'A12345678';
    default:
      return 'Enter ID or Passport Number';
  }
}

/**
 * Gets helper text for ID validation
 */
export function getHelperText(validation: IdValidationResult): string {
  if (!validation.isValid) {
    return validation.message || 'Please enter a valid ID or passport number';
  }
  
  const countryName = validation.country ? getCountryName(validation.country) : '';
  return `${validation.type.replace(/_/g, ' ').toUpperCase()} - ${countryName}`;
}
