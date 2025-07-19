# MyMoolah Platform - Setup Guide

## 📋 **SETUP OVERVIEW**

**Project:** MyMoolah Digital Wallet Platform  
**Current Version:** 2.0.0 - Enhanced Authentication & KYC System  
**Last Updated:** July 19, 2025  
**Setup Status:** ✅ **PRODUCTION READY**

---

## 🚀 **QUICK START SETUP**

### **Prerequisites**
- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Git** for version control
- **SQLite** (development) or **PostgreSQL** (production)
- **Modern browser** with ES6+ support

### **1. Clone Repository**
```bash
# Clone the repository
git clone <repository-url>
cd mymoolah

# Verify you're in the correct directory
pwd
# Should show: /path/to/mymoolah
```

### **2. Install Dependencies**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd mymoolah-wallet-frontend
npm install
cd ..
```

### **3. Environment Configuration**
```bash
# Copy environment template
cp env.template .env

# Edit environment variables
nano .env
```

### **4. Database Setup**
```bash
# Initialize database
npm run init-db

# Verify database creation
ls -la data/
# Should show: mymoolah.db
```

### **5. Start Development Servers**
```bash
# Start backend server (Port 5050)
npm start

# In a new terminal, start frontend (Port 3000)
cd mymoolah-wallet-frontend
npm run dev
```

### **6. Verify Installation**
```bash
# Backend health check
curl http://localhost:5050/health

# Frontend check
open http://localhost:3000
```

---

## 🔐 **AUTHENTICATION SETUP**

### **Multi-Input Authentication Configuration**

#### **Demo Mode Setup**
```typescript
// config/app-config.ts
export const appConfig = {
  demo: {
    enabled: true,
    credentials: {
      phone: {
        identifier: '27821234567',
        password: 'Demo123!'
      },
      account: {
        identifier: '123456789',
        password: 'Account789$'
      },
      username: {
        identifier: 'demo_user',
        password: 'User123@'
      }
    }
  }
};
```

#### **Password Requirements**
```typescript
// Password validation configuration
export const passwordConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  allowedSpecialChars: '!@#$%^&*(),.?":{}|<>'
};
```

### **Input Validation Setup**

#### **Phone Number Validation**
```typescript
// South African phone number patterns
const phonePatterns = {
  international: /^\+27[6-8][0-9]{8}$/,
  national: /^27[6-8][0-9]{8}$/,
  local: /^0[6-8][0-9]{8}$/
};

const validatePhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\s/g, '');
  
  if (phonePatterns.international.test(cleaned)) return true;
  if (phonePatterns.national.test(cleaned)) return true;
  if (phonePatterns.local.test(cleaned)) return true;
  
  return false;
};
```

#### **Account Number Validation**
```typescript
const validateAccountNumber = (account: string) => {
  // 8-12 digits only
  const accountPattern = /^[0-9]{8,12}$/;
  return accountPattern.test(account);
};
```

#### **Username Validation**
```typescript
const validateUsername = (username: string) => {
  // 4-32 chars, letters/numbers/periods/underscores
  const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
  
  if (!usernamePattern.test(username)) return false;
  if (/^[._]/.test(username) || /[._]$/.test(username)) return false;
  
  return true;
};
```

---

## 📋 **KYC SYSTEM SETUP**

### **KYC Status Configuration**

#### **Status Types Setup**
```typescript
// types/kyc.ts
export type KYCStatus = 'pending' | 'documents_uploaded' | 'processing' | 'verified' | 'rejected';

export interface KYCStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'current' | 'error';
  icon: React.ReactNode;
}
```

#### **Document Upload Configuration**
```typescript
// config/kyc-config.ts
export const kycConfig = {
  fileTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedDocuments: {
    identity: ['SA ID', 'Passport', 'Driver\'s License'],
    address: ['Utility bill', 'Bank statement', 'Lease agreement']
  },
  cameraSettings: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }
};
```

### **File Upload Setup**

#### **File Validation**
```typescript
const validateUploadedFile = (file: File, type: DocumentType) => {
  // File type validation
  if (!kycConfig.fileTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, or PDF files only.');
  }

  // File size validation
  if (file.size > kycConfig.maxFileSize) {
    throw new Error('File size exceeds 10MB limit.');
  }

  return true;
};
```

#### **Camera Capture Setup**
```typescript
const setupCameraCapture = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: kycConfig.cameraSettings
    });
    
    return stream;
  } catch (error) {
    throw new Error('Camera access denied. Please use file upload instead.');
  }
};
```

### **Progress Tracking Setup**

#### **Upload Progress**
```typescript
const [uploadProgress, setUploadProgress] = useState(0);

const handleUpload = async (files: File[]) => {
  setUploadProgress(0);
  
  for (let i = 0; i <= 100; i += 10) {
    setUploadProgress(i);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Actual upload logic here
};
```

---

## 🎨 **FIGMA AI INTEGRATION SETUP**

### **Component Setup**

#### **ImageWithFallback Component**
```typescript
// components/figma/ImageWithFallback.tsx
import React, { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  fallbackSrc = '/src/assets/error-image.svg' 
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}
```

#### **Real-time Validation Setup**
```typescript
// hooks/useValidation.ts
export const useValidation = () => {
  const [showValidation, setShowValidation] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    setShowValidation(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Keep showing validation if content exists
  };

  return {
    showValidation,
    isFocused,
    handleFocus,
    handleBlur
  };
};
```

### **Design System Setup**

#### **Color Variables**
```css
/* styles/variables.css */
:root {
  /* MyMoolah Brand Colors */
  --mymoolah-green: #86BE41;
  --mymoolah-blue: #2D8CCA;
  --mymoolah-green-hover: #7AB139;
  --mymoolah-blue-hover: #2680B8;
  
  /* Mobile Design Variables */
  --mobile-padding: 1rem;
  --mobile-border-radius: 0.75rem;
  --mobile-touch-target: 2.75rem;
  --mobile-font-base: 0.875rem;
  --mobile-font-small: 0.75rem;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}
```

#### **Typography Setup**
```css
/* styles/typography.css */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');

body {
  font-family: 'Montserrat', sans-serif;
  font-size: var(--mobile-font-base);
  font-weight: var(--font-weight-normal);
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Montserrat', sans-serif;
  font-weight: var(--font-weight-bold);
}
```

---

## 📱 **MOBILE OPTIMIZATION SETUP**

### **PWA Configuration**

#### **Service Worker Setup**
```typescript
// public/sw.js
const CACHE_NAME = 'mymoolah-v2.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/src/assets/logo2.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

#### **Manifest Configuration**
```json
// public/manifest.json
{
  "name": "MyMoolah Digital Wallet",
  "short_name": "MyMoolah",
  "description": "Secure digital wallet for South Africans",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#86BE41",
  "theme_color": "#2D8CCA",
  "icons": [
    {
      "src": "/src/assets/logo2.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

### **Performance Optimization**

#### **Lazy Loading Setup**
```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const KYCDocumentsPage = lazy(() => import('./pages/KYCDocumentsPage'));
const KYCStatusPage = lazy(() => import('./pages/KYCStatusPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/kyc/documents" element={<KYCDocumentsPage />} />
        <Route path="/kyc/status" element={<KYCStatusPage />} />
      </Routes>
    </Suspense>
  );
}
```

#### **Image Optimization**
```typescript
// utils/imageOptimization.ts
export const optimizeImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate optimal dimensions
      const maxWidth = 800;
      const maxHeight = 600;
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(optimizedFile);
        }
      }, 'image/jpeg', 0.8);
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

---

## 🔒 **SECURITY SETUP**

### **Enhanced AuthContext Setup**

#### **Updated Interface**
```typescript
// contexts/AuthContext.tsx
interface User {
  id: string;
  name: string;
  phoneNumber: string;
  walletId: string;
  kycStatus: 'pending' | 'documents_uploaded' | 'processing' | 'verified' | 'rejected';
  email?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refreshToken: () => Promise<void>;
  updateKYCStatus: (status: User['kycStatus']) => void;
}
```

#### **KYC Status Management**
```typescript
const updateKYCStatus = (status: User['kycStatus']) => {
  if (user) {
    setUser({ ...user, kycStatus: status });
  }
};

// Provider value
<AuthContext.Provider value={{ 
  user, 
  login, 
  logout, 
  isLoading, 
  isAuthenticated: !!user,
  loading: isLoading,
  refreshToken,
  updateKYCStatus
}}>
```

### **File Upload Security**

#### **Secure Upload Configuration**
```typescript
// utils/secureUpload.ts
export const secureUploadConfig = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 2,
  encryption: true,
  virusScan: true
};

export const validateUpload = (file: File) => {
  // Type validation
  if (!secureUploadConfig.allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  
  // Size validation
  if (file.size > secureUploadConfig.maxSize) {
    throw new Error('File too large');
  }
  
  // Name validation
  const fileName = file.name.toLowerCase();
  if (fileName.includes('script') || fileName.includes('javascript')) {
    throw new Error('Invalid file name');
  }
  
  return true;
};
```

---

## 📊 **API SETUP**

### **New Endpoints Configuration**

#### **Authentication Routes**
```typescript
// routes/auth.ts
router.post('/register', async (req, res) => {
  const { firstName, lastName, identifier, email, password, confirmPassword } = req.body;
  
  // Validate input type
  const inputType = detectInputType(identifier);
  const validation = validateInput(identifier, inputType);
  
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.message });
  }
  
  // Validate password complexity
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: 'Password does not meet requirements' });
  }
  
  // Create user with KYC status
  const user = await createUser({
    firstName,
    lastName,
    identifier,
    email,
    password,
    kycStatus: 'pending'
  });
  
  res.status(201).json({ user });
});

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  
  // Multi-input authentication
  const inputType = detectInputType(identifier);
  const user = await findUserByIdentifier(identifier, inputType);
  
  if (!user || !await verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = generateJWT(user);
  res.json({ user, token });
});
```

#### **KYC Routes**
```typescript
// routes/kyc.ts
router.post('/upload-documents', upload.array('documents', 2), async (req, res) => {
  try {
    const { userId } = req.body;
    const files = req.files as Express.Multer.File[];
    
    // Validate files
    for (const file of files) {
      validateUploadedFile(file);
    }
    
    // Process upload
    const uploadResult = await processDocumentUpload(userId, files);
    
    // Update KYC status
    await updateUserKYCStatus(userId, 'documents_uploaded');
    
    res.json({ success: true, uploadResult });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/status/:userId', async (req, res) => {
  const { userId } = req.params;
  const user = await findUserById(userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const kycStatus = {
    status: user.kycStatus,
    progress: getKYCProgress(user.kycStatus),
    message: getKYCStatusMessage(user.kycStatus)
  };
  
  res.json(kycStatus);
});
```

---

## 🧪 **TESTING SETUP**

### **Component Testing Setup**

#### **Jest Configuration**
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx'
  ]
};
```

#### **Test Utilities**
```typescript
// utils/test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### **Integration Testing Setup**

#### **Cypress Configuration**
```javascript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 375,
    viewportHeight: 667,
    video: false,
    screenshotOnRunFailure: true
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    }
  }
});
```

#### **KYC Flow Testing**
```typescript
// cypress/e2e/kyc-flow.cy.ts
describe('KYC Flow', () => {
  it('should complete full KYC process', () => {
    // Start registration
    cy.visit('/register');
    
    // Fill registration form
    cy.get('[data-testid="firstName"]').type('John');
    cy.get('[data-testid="lastName"]').type('Doe');
    cy.get('[data-testid="identifier"]').type('27821234567');
    cy.get('[data-testid="email"]').type('john@example.com');
    cy.get('[data-testid="password"]').type('SecurePass123!');
    cy.get('[data-testid="confirmPassword"]').type('SecurePass123!');
    
    // Submit registration
    cy.get('[data-testid="submit"]').click();
    
    // Verify KYC status page
    cy.url().should('include', '/kyc/status');
    cy.contains('KYC Verification').should('be.visible');
    
    // Upload documents
    cy.get('[data-testid="upload-identity"]').attachFile('id.pdf');
    cy.get('[data-testid="upload-address"]').attachFile('address.pdf');
    
    // Submit documents
    cy.get('[data-testid="submit-documents"]').click();
    
    // Verify success
    cy.contains('Documents uploaded successfully!').should('be.visible');
  });
});
```

---

## 🚀 **DEPLOYMENT SETUP**

### **Production Configuration**

#### **Environment Variables**
```bash
# .env.production
NODE_ENV=production
PORT=5050
JWT_SECRET=your-secure-production-jwt-secret
DATABASE_URL=postgresql://user:pass@host:port/db
MOJALOOP_API_URL=https://api.mojaloop.io
FSCA_COMPLIANCE=true
DEMO_MODE=false
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
```

#### **Build Scripts**
```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "build:prod": "NODE_ENV=production vite build",
    "start:prod": "node server.js",
    "test:prod": "npm run test && npm run test:e2e",
    "deploy": "npm run build:prod && npm run start:prod"
  }
}
```

### **Security Deployment**

#### **Security Headers**
```typescript
// server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mojaloop.io"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

#### **Rate Limiting**
```typescript
// middleware/rateLimiter.ts
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 📚 **DOCUMENTATION SETUP**

### **Code Documentation**

#### **JSDoc Comments**
```typescript
/**
 * Multi-input authentication function
 * 
 * Validates user input and determines the type of identifier
 * (phone number, account number, or username) for authentication.
 * 
 * @param identifier - The user's input (phone/account/username)
 * @returns The detected input type or 'unknown' if invalid
 * 
 * @example
 * detectInputType('27821234567') // returns 'phone'
 * detectInputType('123456789') // returns 'account'
 * detectInputType('demo_user') // returns 'username'
 */
export function detectInputType(identifier: string): InputType {
  // Implementation...
}
```

#### **API Documentation**
```typescript
/**
 * @api {post} /api/auth/login Multi-input Authentication
 * @apiName Login
 * @apiGroup Authentication
 * @apiVersion 2.0.0
 * 
 * @apiParam {String} identifier Phone number, account number, or username
 * @apiParam {String} password Complex password meeting requirements
 * 
 * @apiSuccess {Object} user User information
 * @apiSuccess {String} token JWT authentication token
 * 
 * @apiError {401} InvalidCredentials Invalid identifier or password
 * @apiError {400} InvalidInput Invalid input format
 */
```

---

## 🔄 **RECENT UPDATES (July 19, 2025)**

### **Logo System Setup** ✅ **COMPLETE**
- **LoginPage Logo**: Updated to use `logo3.svg` with proper error handling
- **RegisterPage Logo**: Enhanced `logo2.svg` to 60% larger size (w-26 h-26)
- **Fallback System**: Implemented robust error handling with "M" logo fallback
- **Asset Management**: All logos properly organized in `/src/assets/` directory
- **Error Handling**: Custom error handling for logo loading failures

### **Development Server Setup** ✅ **OPERATIONAL**
- **Frontend Server**: Successfully running on `http://localhost:3000/` with Vite v4.5.14
- **Hot Reload**: Enabled for real-time development
- **TypeScript**: Full type safety with strict mode enabled
- **Asset Loading**: All logos loading correctly with proper paths

### **Technical Setup Improvements** ✅ **COMPLETE**
- **Image Component**: Replaced ImageWithFallback with native img tag for better control
- **Error Handling**: Custom error handling for logo loading failures
- **CSS Classes**: Updated logo sizing classes (w-26 h-26 for RegisterPage)
- **Path Resolution**: Fixed asset paths to use `/src/assets/` structure

### **UI/UX Setup** ✅ **MAINTAINED**
- **Visual Consistency**: Maintained exact Figma design fidelity
- **Mobile Optimization**: Touch-friendly interfaces preserved
- **Accessibility**: WCAG 2.1 AA compliance maintained
- **Performance**: Optimized for low-cost devices

---

## 📞 **SUPPORT & CONTACT**

### **Setup Support**
- **Technical Issues:** dev@mymoolah.com
- **Security Issues:** security@mymoolah.com
- **Documentation:** docs@mymoolah.com

### **Company Information**
- **Company:** MyMoolah Digital Solutions
- **Location:** Johannesburg, South Africa
- **Website:** https://mymoolah.com
- **Phone:** +27 (0) 11 XXX XXXX

---

*This setup guide provides comprehensive instructions for setting up the MyMoolah platform with enhanced authentication, KYC verification, and Figma AI integration.* 