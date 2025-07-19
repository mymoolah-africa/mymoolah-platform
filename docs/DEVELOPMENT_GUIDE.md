# MyMoolah Platform - Development Guide

## 📋 **DEVELOPMENT OVERVIEW**

**Project:** MyMoolah Digital Wallet Platform  
**Current Version:** 2.0.0 - Enhanced Authentication & KYC System  
**Last Updated:** July 19, 2025 (Git Sync Complete)  
**Development Status:** ✅ **PRODUCTION READY**

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Technology Stack**

#### **Frontend (React 18 + TypeScript)**
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS for responsive design
- **Build Tool:** Vite for fast development
- **State Management:** React Context API
- **UI Components:** shadcn/ui + Custom components
- **Design System:** Figma AI integration

#### **Backend (Node.js + Express)**
- **Runtime:** Node.js with Express.js
- **Database:** SQLite for development, PostgreSQL for production
- **Authentication:** JWT with secure token management
- **Security:** Helmet.js, rate limiting, input validation
- **API:** RESTful API with comprehensive endpoints

#### **Development Tools**
- **Version Control:** Git with feature branch workflow
- **Testing:** Jest for unit testing, Cypress for E2E
- **Linting:** ESLint + Prettier for code quality
- **Documentation:** Comprehensive .md documentation
- **Security:** Regular security audits and testing

---

## 🚀 **QUICK START DEVELOPMENT**

### **1. Environment Setup**
```bash
# Clone repository
git clone <repository-url>
cd mymoolah

# Install dependencies
npm install

# Copy environment template
cp env.template .env

# Initialize database
npm run init-db
```

### **2. Start Development Servers**
```bash
# Start backend (Port 5050)
npm start

# Start frontend (Port 3000)
cd mymoolah-wallet-frontend
npm install
npm run dev
```

### **3. Verify Installation**
```bash
# Backend health check
curl http://localhost:5050/health

# Frontend check
open http://localhost:3000
```

---

## 🔐 **AUTHENTICATION SYSTEM DEVELOPMENT**

### **Multi-Input Authentication**

#### **Supported Input Types**
```typescript
type InputType = 'phone' | 'account' | 'username';

// Phone number validation (SA format)
const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;

// Account number validation
const accountPattern = /^[0-9]{8,12}$/;

// Username validation
const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
```

#### **Implementation Example**
```typescript
// LoginPage.tsx - Multi-input authentication
const detectInputType = (input: string): InputType => {
  const cleanInput = input.trim();
  
  if (phonePattern.test(cleanInput.replace(/\s/g, ''))) {
    return 'phone';
  }
  
  if (accountPattern.test(cleanInput)) {
    return 'account';
  }
  
  if (usernamePattern.test(cleanInput)) {
    return 'username';
  }
  
  return 'unknown';
};
```

### **Complex Password System**

#### **Password Requirements**
```typescript
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  allowedSpecialChars: '!@#$%^&*(),.?":{}|<>'
};
```

#### **Validation Implementation**
```typescript
const validatePassword = (password: string) => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar
  };
};
```

### **Demo Credentials**
```typescript
// Demo mode configuration
const demoCredentials = {
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
};
```

---

## 📋 **KYC SYSTEM DEVELOPMENT**

### **KYC Status Management**

#### **Status Types**
```typescript
type KYCStatus = 'pending' | 'documents_uploaded' | 'processing' | 'verified' | 'rejected';

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  walletId: string;
  kycStatus: KYCStatus;
  email?: string;
  phone?: string;
}
```

#### **Status Flow**
```typescript
// KYC Status progression
const kycFlow = {
  pending: 'Initial state, requires document upload',
  documents_uploaded: 'Files uploaded, ready for verification',
  processing: 'Verification in progress (24-48 hours)',
  verified: 'KYC complete, full access granted',
  rejected: 'Verification failed, requires new documents'
};
```

### **Document Upload System**

#### **File Validation**
```typescript
const validateFile = (file: File) => {
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, or PDF file');
  }

  // File size validation (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  return true;
};
```

#### **Camera Capture Implementation**
```typescript
const handleCameraCapture = async (type: DocumentType) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',  // Prefer back camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      } 
    });
    
    // Camera capture logic
    setShowCamera(true);
    
    // Stop stream after capture
    stream.getTracks().forEach(track => track.stop());
    
  } catch (error) {
    setError('Camera not available. Please use file upload instead.');
  }
};
```

### **Document Upload Components**

#### **KYCDocumentsPage.tsx**
```typescript
interface DocumentUpload {
  type: DocumentType;
  file: File | null;
  preview: string | null;
  status: DocumentStatus;
  error?: string;
}

const [documents, setDocuments] = useState<{
  identity: DocumentUpload;
  address: DocumentUpload;
}>({
  identity: { type: 'identity', file: null, preview: null, status: 'pending' },
  address: { type: 'address', file: null, preview: null, status: 'pending' }
});
```

#### **KYCStatusPage.tsx**
```typescript
const getKYCSteps = (): KYCStep[] => [
  {
    id: 'account-created',
    title: 'Account Created',
    description: 'Your MyMoolah account has been successfully created',
    status: 'completed',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />
  },
  {
    id: 'documents-upload',
    title: 'Upload Documents',
    description: 'Upload your ID and proof of address',
    status: user.kycStatus === 'pending' ? 'current' : 'completed',
    icon: user.kycStatus === 'pending' ? <Upload className="w-5 h-5 text-blue-500" /> : <CheckCircle className="w-5 h-5 text-green-500" />
  },
  // ... more steps
];
```

---

## 🎨 **FIGMA AI INTEGRATION DEVELOPMENT**

### **Enhanced Components**

#### **ImageWithFallback Component**
```typescript
// components/figma/ImageWithFallback.tsx
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

#### **Real-time Validation**
```typescript
// Real-time input validation with visual feedback
const [showPasswordValidation, setShowPasswordValidation] = useState(false);
const [passwordFocused, setPasswordFocused] = useState(false);

const handlePasswordFocus = () => {
  setPasswordFocused(true);
  setShowPasswordValidation(true);
};

const handlePasswordBlur = () => {
  setPasswordFocused(false);
  if (formData.password.length === 0) {
    setShowPasswordValidation(false);
  }
};
```

### **Design System Implementation**

#### **Color Scheme**
```css
/* MyMoolah Brand Colors */
:root {
  --mymoolah-green: #86BE41;
  --mymoolah-blue: #2D8CCA;
  --mymoolah-green-hover: #7AB139;
  --mymoolah-blue-hover: #2680B8;
}
```

#### **Typography**
```css
/* Montserrat Font Family */
body {
  font-family: 'Montserrat', sans-serif;
}

/* Font Weights */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-bold { font-weight: 700; }
```

#### **Mobile-First Design**
```css
/* Mobile-first responsive design */
.container {
  max-width: 24rem; /* 384px - mobile width */
  margin: 0 auto;
  padding: 1rem;
}

/* Touch-friendly buttons */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

## 📱 **MOBILE OPTIMIZATION DEVELOPMENT**

### **Performance Features**

#### **Lazy Loading**
```typescript
// Lazy load components for better performance
const KYCDocumentsPage = lazy(() => import('./pages/KYCDocumentsPage'));
const KYCStatusPage = lazy(() => import('./pages/KYCStatusPage'));

// Suspense wrapper
<Suspense fallback={<LoadingSpinner />}>
  <Route path="/kyc/documents" element={<KYCDocumentsPage />} />
  <Route path="/kyc/status" element={<KYCStatusPage />} />
</Suspense>
```

#### **Image Optimization**
```typescript
// Optimized image loading with fallback
const OptimizedImage = ({ src, alt, className }: ImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`image-container ${className}`}>
      {!isLoaded && !hasError && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        className={`optimized-image ${isLoaded ? 'loaded' : ''}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
};
```

### **PWA Capabilities**

#### **Service Worker Registration**
```typescript
// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
```

#### **Offline Support**
```typescript
// Offline detection and handling
const useOfflineStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
};
```

---

## 🔒 **SECURITY DEVELOPMENT**

### **Enhanced AuthContext**

#### **Updated Interface**
```typescript
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refreshToken: () => Promise<void>;
  updateKYCStatus: (status: User['kycStatus']) => void; // NEW
}
```

#### **KYC Status Management**
```typescript
const updateKYCStatus = (status: User['kycStatus']) => {
  if (user) {
    setUser({ ...user, kycStatus: status });
  }
};
```

### **File Upload Security**

#### **Validation Implementation**
```typescript
const validateUploadedFile = (file: File, type: DocumentType) => {
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, or PDF files only.');
  }

  // File size validation
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit.');
  }

  // File name validation
  const fileName = file.name.toLowerCase();
  if (fileName.includes('script') || fileName.includes('javascript')) {
    throw new Error('Invalid file name.');
  }

  return true;
};
```

#### **Secure Upload Process**
```typescript
const handleSecureUpload = async (file: File, type: DocumentType) => {
  try {
    // Validate file
    validateUploadedFile(file, type);

    // Create FormData with secure headers
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    formData.append('userId', user?.id || '');

    // Upload with progress tracking
    const response = await fetch('/api/kyc/upload-documents', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

---

## 📊 **API DEVELOPMENT**

### **New Endpoints**

#### **Authentication Endpoints**
```typescript
// POST /api/auth/register - User registration with KYC
interface RegisterRequest {
  firstName: string;
  lastName: string;
  identifier: string; // phone/account/username
  email: string;
  password: string;
  confirmPassword: string;
}

// POST /api/auth/login - Multi-input authentication
interface LoginRequest {
  identifier: string; // phone/account/username
  password: string;
}
```

#### **KYC Endpoints**
```typescript
// POST /api/kyc/upload-documents - Document upload
interface DocumentUploadRequest {
  identityDocument: File;
  addressDocument: File;
  userId: string;
}

// GET /api/kyc/status - KYC status check
interface KYCStatusResponse {
  status: KYCStatus;
  progress: number;
  message: string;
  documents: {
    identity: DocumentInfo;
    address: DocumentInfo;
  };
}

// PUT /api/kyc/update-status - Status updates
interface KYCStatusUpdate {
  userId: string;
  status: KYCStatus;
  reason?: string;
}
```

### **Enhanced Endpoints**

#### **Updated Login Endpoint**
```typescript
// Enhanced login with multi-input support
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Detect input type
    const inputType = detectInputType(identifier);
    
    // Validate based on input type
    const validation = validateInput(identifier, inputType);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.message });
    }

    // Find user by identifier type
    const user = await findUserByIdentifier(identifier, inputType);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateJWT(user);
    
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});
```

---

## 🧪 **TESTING DEVELOPMENT**

### **Component Testing**

#### **Authentication Testing**
```typescript
// LoginPage.test.tsx
describe('LoginPage', () => {
  test('should validate phone number format', () => {
    render(<LoginPage />);
    
    const input = screen.getByPlaceholderText('Phone Number');
    fireEvent.change(input, { target: { value: '27821234567' } });
    
    expect(screen.getByText('South African mobile number')).toBeInTheDocument();
  });

  test('should validate complex password requirements', () => {
    render(<LoginPage />);
    
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('One uppercase letter (A-Z)')).toBeInTheDocument();
  });
});
```

#### **KYC Testing**
```typescript
// KYCDocumentsPage.test.tsx
describe('KYCDocumentsPage', () => {
  test('should validate file upload', () => {
    render(<KYCDocumentsPage />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText('Upload Identity Document');
    
    fireEvent.change(input, { target: { files: [file] } });
    
    expect(screen.getByText('Please upload a JPG, PNG, or PDF file')).toBeInTheDocument();
  });

  test('should handle camera capture', async () => {
    // Mock camera access
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }]
        })
      }
    });

    render(<KYCDocumentsPage />);
    
    const cameraButton = screen.getByText('Camera');
    fireEvent.click(cameraButton);
    
    // Verify camera functionality
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });
});
```

### **Integration Testing**

#### **KYC Flow Testing**
```typescript
// KYC flow integration test
describe('KYC Flow', () => {
  test('should complete full KYC process', async () => {
    // Start registration
    render(<RegisterPage />);
    
    // Fill registration form
    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Phone Number'), { target: { value: '27821234567' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Create a strong password'), { target: { value: 'SecurePass123!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'SecurePass123!' } });
    
    // Submit registration
    fireEvent.click(screen.getByText('Create Account'));
    
    // Verify KYC status page
    await waitFor(() => {
      expect(screen.getByText('KYC Verification')).toBeInTheDocument();
    });
    
    // Upload documents
    const identityFile = new File(['test'], 'id.pdf', { type: 'application/pdf' });
    const addressFile = new File(['test'], 'address.pdf', { type: 'application/pdf' });
    
    fireEvent.change(screen.getByLabelText('Upload Identity Document'), { target: { files: [identityFile] } });
    fireEvent.change(screen.getByLabelText('Upload Proof of Address'), { target: { files: [addressFile] } });
    
    // Submit documents
    fireEvent.click(screen.getByText('Submit Documents'));
    
    // Verify status update
    await waitFor(() => {
      expect(screen.getByText('Documents uploaded successfully!')).toBeInTheDocument();
    });
  });
});
```

---

## 📚 **DOCUMENTATION DEVELOPMENT**

### **Code Documentation**

#### **Component Documentation**
```typescript
/**
 * ImageWithFallback Component
 * 
 * A robust image component that handles loading errors gracefully
 * by providing a fallback image when the primary image fails to load.
 * 
 * @param src - The primary image source URL
 * @param alt - Alt text for accessibility
 * @param className - CSS classes for styling
 * @param fallbackSrc - Fallback image URL (optional)
 * 
 * @example
 * <ImageWithFallback
 *   src="/src/assets/logo2.svg"
 *   alt="MyMoolah Logo"
 *   className="w-16 h-16"
 * />
 */
export function ImageWithFallback({ src, alt, className, fallbackSrc }: ImageWithFallbackProps) {
  // Implementation...
}
```

#### **API Documentation**
```typescript
/**
 * Multi-input Authentication Endpoint
 * 
 * Handles user authentication using phone numbers, account numbers, or usernames.
 * Supports complex password validation and real-time feedback.
 * 
 * @route POST /api/auth/login
 * @param {string} identifier - Phone number, account number, or username
 * @param {string} password - Complex password meeting requirements
 * 
 * @returns {Object} User data and JWT token
 * @throws {401} Invalid credentials
 * @throws {400} Invalid input format
 * 
 * @example
 * POST /api/auth/login
 * {
 *   "identifier": "27821234567",
 *   "password": "SecurePass123!"
 * }
 */
app.post('/api/auth/login', async (req, res) => {
  // Implementation...
});
```

---

## 🚀 **DEPLOYMENT DEVELOPMENT**

### **Production Configuration**

#### **Environment Variables**
```bash
# Production environment variables
NODE_ENV=production
PORT=5050
JWT_SECRET=your-secure-jwt-secret
DATABASE_URL=postgresql://user:pass@host:port/db
MOJALOOP_API_URL=https://api.mojaloop.io
FSCA_COMPLIANCE=true
DEMO_MODE=false
```

#### **Build Configuration**
```json
// package.json build scripts
{
  "scripts": {
    "build": "vite build",
    "build:prod": "NODE_ENV=production vite build",
    "preview": "vite preview",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext ts,tsx",
    "type-check": "tsc --noEmit"
  }
}
```

### **Security Deployment**

#### **Security Headers**
```typescript
// Enhanced security headers for production
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
// Production rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## 🎯 **BEST PRACTICES**

### **Code Quality**
- **TypeScript** - Use strict type checking
- **ESLint** - Enforce code style and quality
- **Prettier** - Consistent code formatting
- **Jest** - Comprehensive unit testing
- **Cypress** - End-to-end testing

### **Security Practices**
- **Input Validation** - Validate all user inputs
- **Output Sanitization** - Sanitize all outputs
- **Authentication** - Secure JWT implementation
- **Authorization** - Role-based access control
- **Encryption** - Encrypt sensitive data

### **Performance Practices**
- **Lazy Loading** - Load components on demand
- **Image Optimization** - Optimize images for web
- **Caching** - Implement appropriate caching
- **Code Splitting** - Split code for faster loading
- **Bundle Optimization** - Optimize bundle size

### **Accessibility Practices**
- **WCAG 2.1 AA** - Follow accessibility guidelines
- **Keyboard Navigation** - Support keyboard-only users
- **Screen Readers** - Provide proper alt text
- **Color Contrast** - Ensure sufficient contrast
- **Focus Management** - Proper focus handling

---

## 🔄 **RECENT UPDATES (July 19, 2025)**

### **Logo System Development** ✅ **COMPLETE**
- **LoginPage Logo**: Updated to use `logo3.svg` with proper error handling
- **RegisterPage Logo**: Enhanced `logo2.svg` to 60% larger size (w-26 h-26)
- **Fallback System**: Implemented robust error handling with "M" logo fallback
- **Asset Management**: All logos properly organized in `/src/assets/` directory
- **Error Handling**: Custom error handling for logo loading failures

### **Development Server Status** ✅ **OPERATIONAL**
- **Frontend Server**: Successfully running on `http://localhost:3000/` with Vite v4.5.14
- **Hot Reload**: Enabled for real-time development
- **TypeScript**: Full type safety with strict mode enabled
- **Asset Loading**: All logos loading correctly with proper paths

### **Technical Improvements** ✅ **COMPLETE**
- **Image Component**: Replaced ImageWithFallback with native img tag for better control
- **Error Handling**: Custom error handling for logo loading failures
- **CSS Classes**: Updated logo sizing classes (w-26 h-26 for RegisterPage)
- **Path Resolution**: Fixed asset paths to use `/src/assets/` structure

### **UI/UX Development** ✅ **MAINTAINED**
- **Visual Consistency**: Maintained exact Figma design fidelity
- **Mobile Optimization**: Touch-friendly interfaces preserved
- **Accessibility**: WCAG 2.1 AA compliance maintained
- **Performance**: Optimized for low-cost devices

### **Git Sync Status** ✅ **COMPLETE**
- **Repository**: https://github.com/mymoolah-africa/mymoolah-platform.git
- **Branch**: main
- **Last Commit**: f0a9e60 - Logo System Enhancement & Documentation Update
- **Sync Status**: ✅ Cloud repository 100% identical to local
- **Force Push**: ✅ Completed successfully
- **Files Synced**: 51 files changed, 13,416 insertions, 3,049 deletions
- **Backup**: mymoolah-backup-20250719-214754.tar.gz (1.6MB)

---

## 📞 **SUPPORT & CONTACT**

### **Development Support**
- **Technical Issues:** dev@mymoolah.com
- **Security Issues:** security@mymoolah.com
- **Documentation:** docs@mymoolah.com

### **Company Information**
- **Company:** MyMoolah Digital Solutions
- **Location:** Johannesburg, South Africa
- **Website:** https://mymoolah.com
- **Phone:** +27 (0) 11 XXX XXXX

---

*This development guide provides comprehensive information for developing and maintaining the MyMoolah platform with enhanced authentication, KYC verification, and Figma AI integration.* 