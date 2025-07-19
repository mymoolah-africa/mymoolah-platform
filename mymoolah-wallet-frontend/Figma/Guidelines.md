# MyMoolah Design System Guidelines

## Overview
MyMoolah is a mobile-first fintech wallet application targeting low-cost Android devices with 375px width optimization. These guidelines ensure consistency, performance, and award-winning user experience across all development.

---

## General Development Guidelines

### Mobile-First Principles
* **Always design for 375px width first** - our primary target for low-cost Android devices
* **Touch targets minimum 44px** - ensure accessibility and usability on small screens  
* **Performance is critical** - optimize for low-end Android devices with limited resources
* **Data consumption matters** - minimize asset sizes and API calls
* **Offline considerations** - design for intermittent connectivity scenarios

### Code Quality Standards
* **Component-based architecture** - create reusable components in `/components` directory
* **TypeScript strictly enforced** - no `any` types, proper interface definitions
* **Responsive design with Tailwind** - use utility classes, avoid custom CSS unless necessary
* **File organization** - keep components under 200 lines, separate concerns properly
* **Performance optimization** - lazy load components, optimize images, minimize bundle size

### Architecture Patterns
* **Protected vs Public Routes** - use ProtectedRoute wrapper for authenticated pages
* **Context for State Management** - AuthContext for authentication, MoolahContext for app state
* **Error Boundaries** - wrap components in ErrorBoundary for graceful error handling
* **Mobile Layout Consistency** - use MobileLayout wrapper for main application pages

---

## Application Architecture & Routes

### Current Route Structure
```typescript
// App.tsx - Complete route hierarchy:
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MoolahProvider>
          <Router>
            <div className="min-h-screen bg-white">
              <Routes>
                {/* Public Routes - Gradient backgrounds */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* KYC Routes - Gradient background like auth pages */}
                <Route path="/kyc" element={<ProtectedRoute><KYCDocumentsPage /></ProtectedRoute>} />
                <Route path="/kyc/documents" element={<ProtectedRoute><KYCDocumentsPage /></ProtectedRoute>} />
                <Route path="/kyc/status" element={<ProtectedRoute><KYCStatusPage /></ProtectedRoute>} />
                
                {/* Protected Routes - Clean white Mobile Layout */}
                <Route path="/" element={<ProtectedRoute><MobileLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="send-money" element={<SendMoneyPage />} />
                  <Route path="transact" element={<TransactPage />} />
                  <Route path="vouchers" element={<VouchersPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
        </MoolahProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

### Page Classification System
* **Authentication Pages** (`/login`, `/register`) - Gradient backgrounds, full-screen forms
* **KYC Pages** (`/kyc/*`) - Gradient backgrounds, document-focused workflows
* **Main App Pages** (`/dashboard`, `/send-money`, etc.) - Clean white backgrounds, MobileLayout wrapper
* **Protected vs Public** - All pages except login/register require authentication

---

## Brand System & Design Guidelines

### Color System
```css
Primary Brand Colors:
--mymoolah-green: #86BE41    /* Primary brand color - buttons, CTAs */
--mymoolah-blue: #2D8CCA     /* Secondary brand color - accents, links */

Supporting Colors:
--mymoolah-green-light: #9AD154    /* Hover states, success messages */
--mymoolah-blue-light: #4A9FD9     /* Light accents, info messages */
--mymoolah-green-dark: #7AB139     /* Active states, pressed buttons */
--mymoolah-blue-dark: #2680B8      /* Active states, pressed buttons */

Semantic Colors:
--success-color: #16a34a     /* Success states, positive transactions */
--error-color: #dc2626       /* Error states, failed transactions */
--warning-color: #f59e0b     /* Warning states, pending transactions */
--gray-text: #6b7280         /* Secondary text, labels */
```

### Background Strategy (Hybrid Approach)
* **Authentication Pages (Login/Register/KYC)**: Use gradient backgrounds for brand impact
  ```css
  background: linear-gradient(135deg, #86BE41 0%, #2D8CCA 100%);
  ```
* **Main Application Pages**: Use clean white backgrounds for optimal performance
  ```css
  background-color: #ffffff;
  ```
* **Card Elevations**: Use subtle backgrounds for layered content
  ```css
  --background-secondary: #f8fafe;    /* Elevated cards */
  --background-tertiary: #f1f5f9;     /* Input backgrounds */
  ```

### Typography System (Montserrat Font)
```css
Font Family: 'Montserrat', sans-serif (required for all text)
Base Font Size: 14px (--mobile-font-base)
Small Font Size: 12px (--mobile-font-small)

Font Weights:
--font-weight-normal: 400    /* Body text, inputs */
--font-weight-medium: 500    /* Labels, buttons */
--font-weight-bold: 700      /* Headings, emphasis */
```

**Typography Rules:**
* **Never override default typography** unless specifically requested
* **Headings scale responsively** using clamp() for different screen sizes
* **Line height optimized** for mobile readability (1.5-1.6 for body text)
* **Color inheritance** - use semantic color variables, not hardcoded values
* **CRITICAL:** Always explicitly set typography styles to override component defaults:
  ```tsx
  style={{ 
    fontFamily: 'Montserrat, sans-serif', 
    fontSize: 'var(--mobile-font-base)',
    fontWeight: 'var(--font-weight-normal)'
  }}
  ```

---

## Authentication System Guidelines

### **IMPORTANT: Multi-Input Authentication Architecture**
MyMoolah implements a **comprehensive multi-input authentication system** that accepts three different identifier types with complex password requirements to meet enterprise security standards.

### Multi-Input Authentication Requirements
```typescript
// The system accepts three types of identifiers:

1. PHONE NUMBER (South African format):
   - Formats: +27XXXXXXXXX, 27XXXXXXXXX, 0XXXXXXXXX
   - Must start with +27, 27, or 0
   - Followed by 9 digits
   - Must start with 6, 7, or 8 (SA mobile prefixes)
   - Examples: +27821234567, 27821234567, 0821234567

2. ACCOUNT NUMBER:
   - 8-12 digits numeric only
   - No letters or special characters
   - Examples: 12345678, 123456789012

3. USERNAME:
   - 4-32 characters
   - Letters, numbers, periods (.), underscores (_) only
   - Cannot start or end with period or underscore
   - Examples: user123, john.doe, user_name
```

### Input Type Detection and Validation
```typescript
// Required detection logic:
const detectInputType = (input: string): 'phone' | 'account' | 'username' | 'unknown' => {
  const cleanInput = input.trim();
  
  // Phone number patterns (SA format)
  const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
  if (phonePattern.test(cleanInput.replace(/\s/g, ''))) {
    return 'phone';
  }
  
  // Account number pattern (8-12 digits only)
  const accountPattern = /^[0-9]{8,12}$/;
  if (accountPattern.test(cleanInput)) {
    return 'account';
  }
  
  // Username pattern (4-32 chars, letters/numbers/periods/underscores)
  const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
  if (usernamePattern.test(cleanInput)) {
    return 'username';
  }
  
  return 'unknown';
};
```

### Enhanced Password Authentication System
```typescript
// Password validation must include ALL of the following:
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- At least 1 special character (!@#$%^&*)

// Implementation example:
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

### **NEW: Compact Password Format Guidance System**
```tsx
// COMPACT Password Format Hint - Shows before user types
{!passwordFocused && password.length === 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
    <div className="flex items-center gap-2">
      <Info className="w-3 h-3 text-blue-600 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-blue-700 text-xs mb-1" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px' }}>
          <strong>Format:</strong> 8+ chars, A-Z, a-z, 0-9, !@#$
        </p>
        <p className="text-blue-600 text-xs" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px' }}>
          <strong>e.g.</strong> MyWallet2024!
        </p>
      </div>
    </div>
  </div>
)}

// Real-time Password Validation with Examples
{showPasswordValidation && (
  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
      {passwordValidation.isValid && (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600">Valid!</span>
        </div>
      )}
    </div>
    
    {/* Individual requirement checks with icons */}
    <div className="space-y-1 mb-2">
      {/* ... validation checks ... */}
    </div>
    
    {/* Example passwords section */}
    {!passwordValidation.isValid && (
      <div className="border-t border-gray-200 pt-2 mt-2">
        <p className="text-xs text-gray-600 mb-1"><strong>Example passwords:</strong></p>
        <div className="space-y-1">
          <p className="text-xs text-blue-600">• MyWallet2024! ✓</p>
          <p className="text-xs text-blue-600">• SecurePay123@ ✓</p>
          <p className="text-xs text-blue-600">• FinTech#2024 ✓</p>
        </div>
      </div>
    )}
  </div>
)}
```

### Multi-Input Field Implementation Standards
```typescript
// Required field structure - SIMPLIFIED UI MESSAGING:
<div className="space-y-2">
  <Label htmlFor="identifier">
    Phone Number {/* Static label - simplified from dynamic */}
  </Label>
  <Input
    id="identifier"
    type="text"
    placeholder={getPlaceholderText()} // Dynamic placeholder based on input type
    value={credentials.identifier}
    onChange={handleIdentifierChange}
    className={`validation styles based on input validity`}
    style={{ 
      height: 'var(--mobile-touch-target)',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 'var(--mobile-font-base)',
      fontWeight: 'var(--font-weight-normal)',
      borderRadius: 'var(--mobile-border-radius)'
    }}
    aria-describedby="identifier-help identifier-error"
    required
  />
  
  // Simplified help text - no complex multi-input explanation
  <div id="identifier-help" className="text-xs text-gray-500">
    {credentials.identifier.trim() ? (
      // Show detected input type validation status
      <span className={`inline-flex items-center gap-1 ${identifierValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
        {identifierValidation.isValid ? <Check /> : <X />}
        {inputType === 'phone' && 'South African mobile number'}
        {inputType === 'account' && 'Account number (8-12 digits)'}  
        {inputType === 'username' && 'Username (4-32 characters)'}
        {inputType === 'unknown' && 'Invalid format'}
      </span>
    ) : (
      'Enter your phone number (27XXXXXXXXX) - also your account no.'
    )}
  </div>
  
  // Real-time error messages remain the same
  {validationError && (
    <div id="identifier-error" className="text-xs text-red-600">
      {/* Specific error message based on input type */}
    </div>
  )}
</div>
```

### **UI Messaging Standards - SIMPLIFIED**
* **Field Label**: Always use "Phone Number" (static, not dynamic)
* **Help Text**: "Enter your phone number (27XXXXXXXXX) - also your account no."
* **Placeholder**: Dynamic based on detected input type:
  - Phone: "27 XX XXX XXXX"
  - Account: "12345678" 
  - Username: "username"
  - Default: "Phone Number"

### Real-Time Validation Requirements
* **Input Type Detection**: Must dynamically detect and display input type as user types
* **Visual Feedback**: Use check/X icons to show validation status
* **Error Messages**: Specific, actionable error messages for each input type
* **Accessibility**: Proper ARIA labels and screen reader support
* **Performance**: Validation must not cause lag on low-cost Android devices

### Password Field Implementation Standards
* **Input Type**: `type={showPassword ? 'text' : 'password'}` - proper security masking
* **Show/Hide Toggle**: Required eye icon button with proper accessibility labels
* **Compact Format Hints**: Show brief format guidance before user types
* **Real-time Validation**: Show password requirements with check/X icons as user types
* **Touch Target**: Show/hide button must meet 44px minimum touch target
* **Accessibility**: 
  - `aria-describedby="password-requirements"`
  - `aria-label` for show/hide toggle
  - Proper focus management
* **Error States**: Clear, actionable error messages for invalid passwords
* **Loading States**: Disable submit button until both identifier and password are valid

### **Authentication Page Bottom Card Standards**
```tsx
// Required bottom card structure for LoginPage and RegisterPage:
<div className="mt-4 p-4 bg-white/20 backdrop-blur-sm" style={{ borderRadius: 'var(--mobile-border-radius)' }}>
  <div className="flex items-center justify-between px-2">
    {/* T&C's Icon - Required on both pages */}
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target">
          <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
            T&C's
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>{/* Page-specific terms content */}</DialogContent>
    </Dialog>

    {/* Security Badge - 10% Larger, centered */}
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target transform scale-110">
          <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
            Security
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>{/* Security information */}</DialogContent>
    </Dialog>

    {/* FAQ Icon - Required on both pages */}
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex flex-col items-center space-y-1 hover:bg-white/20 p-2 rounded-lg transition-all touch-target">
          <div className="bg-white/30 backdrop-blur-sm rounded-xl w-12 h-12 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white/80" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'var(--mobile-font-small)' }}>
            FAQ
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>{/* Page-specific FAQ content */}</DialogContent>
    </Dialog>
  </div>
</div>
```

---

## **NEW: KYC (Know Your Customer) System Guidelines**

### KYC System Architecture Overview
MyMoolah implements a **comprehensive KYC system** that allows users to:
- Register and access basic wallet functions (browse, deposit)  
- Upload identity documents (SAID/Passport + Proof of Address)
- Track verification status in real-time
- Unlock full transaction capabilities after verification

### KYC User Flow & Business Logic
```
Registration → Dashboard Access (Browse/Deposit) → KYC Triggered for Transactions
```

**✅ Allowed Without KYC:**
- ✅ Browse wallet interface
- ✅ View balance and transactions  
- ✅ Make deposits into wallet
- ✅ Basic app exploration

**🔒 Requires KYC:**
- 🔒 Send money to others
- 🔒 Withdraw funds
- 🔒 High-value transactions
- 🔒 Advanced features

### KYC Route Structure & Pages
```typescript
// KYC Routes in App.tsx:
<Route path="/kyc" element={<ProtectedRoute><KYCDocumentsPage /></ProtectedRoute>} />
<Route path="/kyc/documents" element={<ProtectedRoute><KYCDocumentsPage /></ProtectedRoute>} />
<Route path="/kyc/status" element={<ProtectedRoute><KYCStatusPage /></ProtectedRoute>} />

// KYC Status Types:
type KYCStatus = 'not_started' | 'documents_uploaded' | 'under_review' | 'verified' | 'rejected';
```

### **KYC Document Requirements (South African Compliance)**
```typescript
// Required Documents:
1. IDENTITY DOCUMENT:
   - South African ID (SAID) OR
   - Valid Passport
   - Clear, readable image
   - All corners visible

2. PROOF OF ADDRESS (POA):
   - Utility bill (electricity, water, gas)
   - Bank statement
   - Municipal rates notice
   - Must be within last 3 months
   - Clear, readable image
```

### KYCDocumentsPage Implementation Pattern
```tsx
// Required structure for KYC document upload:
export function KYCDocumentsPage() {
  const { user, updateKYCStatus } = useAuth();
  const [documents, setDocuments] = useState<{
    identity: DocumentUpload;
    address: DocumentUpload;
  }>();
  
  // Document upload interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      <div className="max-w-sm mx-auto">
        {/* Header with back button and title */}
        <div style={{ padding: 'var(--mobile-padding)' }}>
          <button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-sm rounded-3xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1>Verify Your Identity</h1>
            <p>Upload your documents to unlock full wallet features</p>
          </div>
          
          {/* Progress indicator */}
          <Progress value={(documentsUploaded / 2) * 100} />
        </div>
        
        {/* Document Upload Sections */}
        <div className="flex-1" style={{ padding: 'var(--mobile-padding)' }}>
          {/* Identity Document Card */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-[#86BE41]" />
                Identity Document
                {documents.identity.file && <Check className="w-5 h-5 text-green-500" />}
              </CardTitle>
              <p>Upload your South African ID document or Passport</p>
            </CardHeader>
            <CardContent>
              {documents.identity.file ? (
                <DocumentPreview document={documents.identity} onRemove={handleRemoveDocument} />
              ) : (
                <DocumentUploadInterface 
                  onCameraCapture={() => handleCameraCapture('identity')}
                  onFileUpload={() => handleFileUpload('identity')}
                />
              )}
            </CardContent>
          </Card>
          
          {/* Proof of Address Card */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Home className="w-5 h-5 text-[#2D8CCA]" />
                Proof of Address
                {documents.address.file && <Check className="w-5 h-5 text-green-500" />}
              </CardTitle>
              <p>Upload utility bill, bank statement, or municipal rates notice (last 3 months)</p>
            </CardHeader>
            <CardContent>
              {/* Similar structure to identity document */}
            </CardContent>
          </Card>
          
          {/* Submit Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!allDocumentsUploaded}
            className="w-full bg-gradient-to-r from-[#86BE41] to-[#2D8CCA]"
          >
            Submit for Verification
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Document Upload Component Patterns
```tsx
// Camera Integration Component:
const handleCameraCapture = async (type: DocumentType) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',  // Prefer back camera
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      } 
    });
    
    // Camera interface implementation
    setShowCamera(true);
    
    // Cleanup
    stream.getTracks().forEach(track => track.stop());
    
  } catch (error) {
    setError('Camera not available. Please use file upload instead.');
  }
};

// File Upload Validation:
const handleFileSelect = (type: DocumentType, file: File) => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    setError('Please upload a JPG, PNG, or PDF file');
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    setError('File size must be less than 10MB');
    return;
  }

  // Create preview for images
  let preview = null;
  if (file.type.startsWith('image/')) {
    preview = URL.createObjectURL(file);
  }

  setDocuments(prev => ({
    ...prev,
    [type]: {
      ...prev[type],
      file,
      preview,
      status: 'uploaded'
    }
  }));
};

// Document Upload Interface:
<div className="space-y-3">
  <div className="grid grid-cols-2 gap-3">
    <Button
      onClick={() => handleCameraCapture(type)}
      variant="outline"
      className="h-20 flex-col border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
    >
      <Camera className="w-6 h-6 mb-1" />
      Take Photo
    </Button>
    
    <Button
      onClick={() => handleFileUpload(type)}
      variant="outline"
      className="h-20 flex-col border-[#86BE41] text-[#86BE41] hover:bg-[#86BE41] hover:text-white"
    >
      <Upload className="w-6 h-6 mb-1" />
      Browse Files
    </Button>
  </div>
  
  <p className="text-xs text-gray-500 text-center">
    Accepted: JPG, PNG, PDF (Max 10MB)
  </p>
</div>
```

### KYCStatusPage Implementation Pattern
```tsx
// KYC Status tracking with visual timeline:
export function KYCStatusPage() {
  const { user, refreshUserStatus } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getStatusStages = (currentStatus: KYCStatus): StatusStage[] => {
    return [
      {
        id: 'upload',
        title: 'Documents Uploaded',
        description: 'Your identity and address documents have been received',
        status: currentStatus === 'not_started' ? 'pending' : 'completed',
        icon: <FileText className="w-5 h-5" />
      },
      {
        id: 'review',
        title: 'Under Review',
        description: 'Our team is verifying your documents using secure OCR technology',
        status: currentStatus === 'under_review' ? 'current' : 
                currentStatus === 'verified' || currentStatus === 'rejected' ? 'completed' : 'pending',
        icon: <Eye className="w-5 h-5" />
      },
      {
        id: 'complete',
        title: currentStatus === 'rejected' ? 'Action Required' : 'Verification Complete',
        description: currentStatus === 'rejected' ? 
          'Some documents need to be re-submitted' : 
          'Your identity has been verified successfully',
        status: currentStatus === 'verified' ? 'completed' : 
                currentStatus === 'rejected' ? 'current' : 'pending',
        icon: currentStatus === 'rejected' ? 
          <AlertTriangle className="w-5 h-5" /> : 
          <CheckCircle className="w-5 h-5" />
      }
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#86BE41] to-[#2D8CCA]">
      <div className="max-w-sm mx-auto">
        {/* Status visualization */}
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                stage.status === 'completed' ? 'bg-green-100 text-green-600' :
                stage.status === 'current' ? 'bg-[#2D8CCA]/10 text-[#2D8CCA]' :
                'bg-gray-100 text-gray-400'
              }`}>
                {stage.icon}
              </div>
              <div className="flex-1">
                <h4>{stage.title}</h4>
                <p>{stage.description}</p>
                {stage.status === 'current' && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#2D8CCA]" />
                    <span>Estimated time: 2-5 minutes</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### AuthContext KYC Integration
```typescript
// Enhanced AuthContext with KYC status management:
interface User {
  id: string;
  name: string;
  identifier: string;
  identifierType: 'phone' | 'account' | 'username';
  phoneNumber?: string;
  walletId: string;
  kycStatus: KYCStatus;
  kycVerified: boolean; // Computed property
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshToken: () => Promise<void>;
  updateKYCStatus: (status: KYCStatus) => Promise<void>; // NEW
  refreshUserStatus: () => Promise<void>; // NEW
  requiresKYC: (action?: string) => boolean; // NEW
}

// KYC Management Functions:
const updateKYCStatus = async (status: KYCStatus) => {
  if (isDemoMode()) {
    localStorage.setItem('mymoolah_kyc_status', status);
    setUser(prev => prev ? { ...prev, kycStatus: status, kycVerified: status === 'verified' } : null);
  } else {
    // API call to backend
    const response = await fetch('/api/kyc/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    // Handle response...
  }
};

const requiresKYC = (action?: string): boolean => {
  if (!user) return true;
  
  // Allow browsing and deposits without KYC
  if (action === 'browse' || action === 'deposit') {
    return false;
  }
  
  // Require KYC for transactions
  if (action === 'send' || action === 'transfer' || action === 'withdraw') {
    return user.kycStatus !== 'verified';
  }
  
  return user.kycStatus !== 'verified';
};
```

### **KYC Integration Points Throughout App**
```tsx
// Dashboard - KYC status banner:
{!user.kycVerified && (
  <Alert className="border-orange-200 bg-orange-50 mb-4">
    <AlertTriangle className="h-4 w-4 text-orange-600" />
    <AlertDescription>
      <div className="flex items-center justify-between">
        <span>Complete identity verification to unlock full features</span>
        <Button 
          size="sm" 
          onClick={() => navigate('/kyc/documents')}
          className="bg-gradient-to-r from-[#86BE41] to-[#2D8CCA]"
        >
          Verify Now
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}

// SendMoneyPage - KYC requirement check:
const handleTransactionAttempt = () => {
  if (requiresKYC('send')) {
    navigate('/kyc/documents?returnTo=/send-money');
    return;
  }
  // Proceed with transaction
};

// Profile Page - KYC status display:
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <Shield className={`w-5 h-5 ${user.kycVerified ? 'text-green-500' : 'text-orange-500'}`} />
    <div>
      <p className="font-medium">Identity Verification</p>
      <p className="text-sm text-gray-600">
        {user.kycVerified ? 'Verified' : 'Pending verification'}
      </p>
    </div>
  </div>
  {!user.kycVerified && (
    <Button size="sm" variant="outline" onClick={() => navigate('/kyc/status')}>
      {user.kycStatus === 'not_started' ? 'Start' : 'View Status'}
    </Button>
  )}
</div>
```

---

## Component Guidelines

### Button System
```typescript
// Primary Button - Main CTAs (Sign In, Send Money, etc.)
className="mymoolah-btn-primary"
// Background: Linear gradient from green to blue
// Use for: Primary actions, main CTAs, critical user flows

// Secondary Button - Alternative actions
className="mymoolah-btn-secondary" 
// Background: White with green border
// Use for: Secondary actions, cancel options, alternative flows

// Touch Target Requirements
// Minimum 44px height and width for all interactive elements
style={{ 
  minHeight: 'var(--mobile-touch-target)',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: 'var(--mobile-font-base)',
  fontWeight: 'var(--font-weight-medium)'
}}
```

### Multi-Input Authentication Field Pattern
```typescript
// Required structure for multi-input authentication:
const [credentials, setCredentials] = useState({ identifier: '', password: '' });
const inputType = detectInputType(credentials.identifier);
const identifierValidation = getIdentifierValidation();

// SIMPLIFIED: Static field label
const getFieldLabel = () => 'Phone Number';

// Dynamic placeholder based on input type
const getPlaceholderText = () => {
  switch (inputType) {
    case 'phone': return '27 XX XXX XXXX';
    case 'account': return '12345678';
    case 'username': return 'username';
    default: return 'Phone Number';
  }
};

// SIMPLIFIED: Static help text
const getHelpText = () => {
  if (credentials.identifier.trim()) {
    return (
      <span className={`inline-flex items-center gap-1 ${identifierValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
        {identifierValidation.isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {inputType === 'phone' && 'South African mobile number'}
        {inputType === 'account' && 'Account number (8-12 digits)'}
        {inputType === 'username' && 'Username (4-32 characters)'}
        {inputType === 'unknown' && 'Invalid format'}
      </span>
    );
  }
  return 'Enter your phone number (27XXXXXXXXX) - also your account no.';
};
```

### **NEW: Document Upload Component Pattern**
```tsx
// Reusable document upload interface:
interface DocumentUploadProps {
  title: string;
  subtitle: string;
  acceptedFormats: string[];
  onUpload: (file: File) => void;
  status: DocumentStatus;
  preview?: string | null;
  onRemove?: () => void;
}

const DocumentUploadSection: React.FC<DocumentUploadProps> = ({
  title, subtitle, acceptedFormats, onUpload, status, preview, onRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // Camera implementation
      setShowCamera(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera access failed:', error);
    }
  };

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-[#86BE41]/20 to-[#2D8CCA]/20 rounded-xl w-10 h-10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#86BE41]" />
          </div>
          {title}
          {status === 'uploaded' && <Check className="w-5 h-5 text-green-500 ml-auto" />}
        </CardTitle>
        <p className="text-gray-600">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {status === 'uploaded' ? (
          <DocumentPreview preview={preview} onRemove={onRemove} />
        ) : (
          <DocumentUploadInterface 
            onCameraCapture={handleCameraCapture}
            onFileUpload={() => fileInputRef.current?.click()}
          />
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardContent>
    </Card>
  );
};
```

### Password Input Component Pattern
```typescript
// Required structure for password fields with compact hints:
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  
  {/* COMPACT Password Format Hint */}
  {!passwordFocused && password.length === 0 && (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
      <div className="flex items-center gap-2">
        <Info className="w-3 h-3 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-blue-700 text-xs mb-1" style={{ fontSize: '11px' }}>
            <strong>Format:</strong> 8+ chars, A-Z, a-z, 0-9, !@#$
          </p>
          <p className="text-blue-600 text-xs" style={{ fontSize: '10px' }}>
            <strong>e.g.</strong> MyWallet2024!
          </p>
        </div>
      </div>
    </div>
  )}

  <div className="relative">
    <Input
      type={showPassword ? 'text' : 'password'}
      value={password}
      onChange={handlePasswordChange}
      onFocus={() => setPasswordFocused(true)}
      onBlur={() => setPasswordFocused(false)}
      style={{ 
        height: 'var(--mobile-touch-target)',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 'var(--mobile-font-base)',
        fontWeight: 'var(--font-weight-normal)',
        borderRadius: 'var(--mobile-border-radius)'
      }}
      aria-describedby="password-requirements"
      required
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 touch-target"
      style={{ 
        minHeight: 'var(--mobile-touch-target)', 
        minWidth: 'var(--mobile-touch-target)' 
      }}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff /> : <Eye />}
    </button>
  </div>

  {/* Real-time validation display */}
  {showPasswordValidation && (
    <div id="password-requirements" className="mt-3 p-3 bg-gray-50 rounded-lg">
      {/* Password requirements with check/X icons and examples */}
    </div>
  )}
</div>
```

### Card System
```typescript
// Standard Card - Basic content containers
className="mymoolah-card"
// White background, subtle border, mobile-optimized shadow

// Elevated Card - Important content, forms
className="mymoolah-card-elevated"
// Light background, enhanced shadow for emphasis

// KYC Card - Document upload cards
className="bg-white/95 backdrop-blur-sm border-0 shadow-xl"
// Semi-transparent white with stronger shadow for gradient backgrounds

// Card Spacing with explicit styling
style={{ 
  padding: 'var(--mobile-padding)',
  borderRadius: 'var(--mobile-border-radius)'
}}
```

### Input System
```typescript
// All inputs require explicit styling to override defaults:
style={{ 
  height: 'var(--mobile-touch-target)',
  fontFamily: 'Montserrat, sans-serif',
  fontSize: 'var(--mobile-font-base)',
  fontWeight: 'var(--font-weight-normal)',
  borderRadius: 'var(--mobile-border-radius)',
  backgroundColor: 'var(--background-tertiary)',
  border: '1px solid var(--color-gray-medium)'
}}

// Special input types:
type="text"     // For multi-input authentication (phone/account/username)
type="password" // For passwords (enables secure masking)
type="tel"      // For dedicated phone fields (enables numeric keypad)
type="email"    // For email inputs (enables @ symbol access)
type="file"     // For document uploads (with accept attribute)
```

### Navigation Guidelines
* **Bottom Navigation**: Use BottomNavigation component for main app navigation
* **Maximum 5 items** in bottom navigation (optimal for mobile thumb reach)
* **Active states** must use MyMoolah brand colors
* **Icon + label** pattern for clarity
* **Safe area considerations** for devices with home indicators

---

## Page-Specific Guidelines

### Authentication Pages (Login/Register)
* **Gradient background required** - maintains brand impact on entry
* **Mobile container max-width**: 375px centered
* **Card-based forms** with white/semi-transparent backgrounds
* **Multi-Input Authentication**: Support phone/account/username with dynamic validation
* **SIMPLIFIED UI**: Static "Phone Number" label with simplified help text
* **Password Authentication**: Complex password with compact format hints and real-time validation
* **Bottom card consistency**: All three icons (T&C's, Security, FAQ) required on both pages
* **Security dialogs** with comprehensive information
* **Demo mode support** with auto-fill capabilities for testing
* **Typography overrides**: All text must explicitly use Montserrat font family

### KYC Pages (Document Upload/Status)
* **Gradient background required** - matches authentication page branding
* **Mobile container max-width**: 375px centered
* **Document-focused workflow** - clear upload interface with preview
* **Camera integration** - mobile-first document capture
* **Progress tracking** - visual indicators for completion status
* **Real-time status updates** - auto-refresh for pending verifications
* **Accessibility compliance** - proper ARIA labels for document types
* **Error handling** - clear guidance for failed uploads or rejected documents

### Main Application Pages (Dashboard, Send Money, etc.)
* **Clean white background required** - optimal for low-cost Android performance
* **MobileLayout wrapper required** - provides consistent structure
* **KYC integration points** - status banners, requirement checks
* **Bottom navigation** - persistent across all main pages
* **Safe area padding** - accommodate device-specific areas
* **Loading states** - proper skeleton screens and spinners

### Form Guidelines
* **Real-time validation** - show errors as user types when appropriate
* **Compact format hints** - brief guidance that doesn't overwhelm mobile screens
* **Clear error messages** - specific, actionable feedback for each input type
* **Success states** - confirm successful actions with appropriate feedback
* **Loading states** - disable buttons during processing, show loading indicators
* **Keyboard handling** - proper input types for mobile keyboards
* **Multi-input support** - dynamic detection and validation of input types
* **Password complexity** - enforce all 5 requirements with visual feedback
* **Document validation** - file type, size, and quality checks
* **Accessibility compliance** - proper ARIA labels, focus management, keyboard navigation

---

## Performance Guidelines

### Low-Cost Android Device Optimizations
```css
/* Automatically applied in globals.css */
-webkit-font-smoothing: antialiased;
transform: translateZ(0);              /* GPU acceleration */
touch-action: manipulation;            /* Fast touch response */
will-change: auto;                     /* Optimize animations */
```

### Animation & Motion
* **Reduced motion support** - respect user preference for reduced motion
* **60fps animations** - use transform and opacity for smooth animations
* **Minimal duration** - keep animations under 300ms for mobile
* **Strategic use only** - animations for feedback, not decoration

### Image & Asset Optimization
* **Use ImageWithFallback component** for all new images
* **Unsplash for stock photos** - ensure relevance to fintech context
* **SVG for icons** - scalable, performant icons from lucide-react
* **WebP format** when possible for photographs
* **Lazy loading** for non-critical images
* **Document preview optimization** - compress uploaded images for preview

### **NEW: KYC-Specific Performance**
* **File upload optimization** - compress images before upload
* **Camera stream management** - proper cleanup of media streams
* **Document preview** - efficient image rendering and memory management
* **Status polling** - intelligent refresh intervals to avoid excessive API calls

---

## Accessibility Guidelines

### Touch & Mobility
* **44px minimum touch targets** - enforced via CSS custom properties
* **Sufficient contrast ratios** - tested in high contrast mode
* **Focus indicators** - clear focus states for keyboard navigation
* **Safe areas** - proper padding for devices with notches/home indicators
* **Multi-input accessibility** - clear ARIA labels for different input types
* **Password accessibility** - proper ARIA labels, screen reader support for validation states
* **Document upload accessibility** - clear labeling of upload areas and requirements

### Screen Readers & Assistive Technology
* **Semantic HTML** - proper heading hierarchy, landmark elements
* **ARIA labels** - descriptive labels for interactive elements, especially dynamic input types
* **Alt text** - meaningful descriptions for images and icons
* **Focus management** - proper tab order, focus trapping in modals
* **Dynamic content announcements** - ensure screen readers announce input type changes
* **Validation feedback** - ensure screen readers can access real-time validation feedback
* **KYC process guidance** - clear announcements for document upload progress and status

---

## Security & Data Guidelines

### Financial Data Handling
* **Never log sensitive data** - passwords, account numbers, phone numbers, transaction amounts
* **Secure state management** - sensitive data only in secure contexts
* **Input validation** - both client and server-side validation required
* **Error messages** - never expose system internals in user-facing errors
* **Document security** - secure handling of uploaded identity documents

### Authentication Flow
* **Protected routes** - use ProtectedRoute wrapper consistently
* **Session management** - proper token handling and expiration
* **Multi-input security** - secure handling of all three identifier types
* **Password security** - complex requirements, secure storage, limited attempts
* **KYC data protection** - encryption of uploaded documents, secure transmission
* **Biometric support** - when available, integrate fingerprint/face ID as secondary factor
* **Password masking** - default masked state with optional visibility toggle

### **NEW: KYC Security Requirements**
* **Document encryption** - all uploaded files encrypted in transit and at rest
* **OCR data handling** - extracted text securely processed and not logged
* **Compliance reporting** - audit trails for verification attempts and outcomes
* **PII protection** - careful handling of personally identifiable information
* **Secure deletion** - proper cleanup of temporary files and preview data

---

## Testing Guidelines

### Mobile Testing Priorities
* **375px viewport** - primary test viewport for low-cost Android
* **Touch interactions** - test all touch targets and gestures
* **Performance** - test on slower devices and networks
* **Offline scenarios** - test with intermittent connectivity
* **Battery impact** - optimize for minimal battery drain

### Authentication-Specific Testing
* **Multi-input validation** - test all three input types (phone/account/username)
* **South African phone formats** - test +27, 27, and 0 prefixes
* **Account number validation** - test 8-12 digit numeric inputs
* **Username validation** - test character limits and allowed characters
* **Password validation** - test all 5 complexity requirements
* **Compact format hints** - test display/hide behavior on focus/blur
* **Show/hide toggle** - test password visibility functionality
* **Real-time feedback** - test validation as user types
* **Error scenarios** - test invalid login attempts, network failures
* **Accessibility** - test with screen readers, keyboard navigation
* **Mobile keyboards** - test multi-input on various device keyboards

### **NEW: KYC-Specific Testing**
* **Document upload flow** - test complete upload process for both document types
* **File type validation** - test supported formats (JPG, PNG, PDF)
* **File size validation** - test maximum size limits (10MB)
* **Camera integration** - test camera access and capture on various devices
* **Document preview** - test image preview and removal functionality
* **Status tracking** - test real-time status updates and progression
* **Error handling** - test network failures, invalid files, rejected documents
* **Cross-browser compatibility** - test camera API across different mobile browsers
* **Accessibility** - test document upload with screen readers and keyboard navigation

### Fintech-Specific Testing
* **Transaction flows** - test complete user journeys including KYC requirements
* **Error scenarios** - test failure modes and recovery
* **Data validation** - test edge cases for financial inputs
* **Security scenarios** - test authentication and authorization flows
* **KYC integration** - test transaction blocking and KYC requirement triggers

---

## Integration Guidelines

### Cursor IDE Integration
* **Export ready** - all components properly modularized
* **Clear documentation** - comprehensive README and component docs
* **Migration scripts** - provided for seamless integration
* **Dependency management** - clear package.json with required versions
* **Authentication utilities** - reusable validation functions for all input types
* **Password utilities** - reusable validation functions for password complexity
* **KYC utilities** - document validation, upload helpers, status management

### Mojaloop Integration
* **Mock data structures** - match expected Mojaloop API responses
* **Error handling** - proper handling of network and API errors
* **Real-time updates** - WebSocket or polling for live transaction updates
* **Compliance** - follow Mojaloop security and data standards
* **Authentication tokens** - secure handling of JWT/OAuth tokens
* **Multi-identifier support** - backend must handle phone/account/username mapping
* **KYC compliance** - integration with Mojaloop KYC requirements and standards

### **NEW: Backend API Integration Requirements**
```typescript
// KYC Document Upload API:
POST /api/kyc/upload-documents
{
  identityDocument: File,
  addressDocument: File,
  userId: string
}

// KYC Status Check API:
GET /api/kyc/status
Response: {
  status: KYCStatus,
  updatedAt: string,
  documents: {
    identity: { status: string, rejectionReason?: string },
    address: { status: string, rejectionReason?: string }
  }
}

// User Status Update API:
GET /api/user/status
Response: {
  kycStatus: KYCStatus,
  kycVerified: boolean,
  // ... other user data
}
```

---

## Development Workflow

### Code Standards
* **TypeScript strict mode** - no implicit any, proper type definitions
* **Component naming** - PascalCase for components, camelCase for functions
* **File organization** - one component per file, clear folder structure
* **Import order** - React first, then libraries, then local imports
* **Explicit styling** - always override component defaults with MyMoolah styles

### Git Workflow
* **Feature branches** - one feature per branch
* **Descriptive commits** - clear, specific commit messages
* **Code review** - all changes reviewed before merge
* **Testing** - all features tested before deployment

### Documentation
* **Component documentation** - clear props, usage examples
* **API documentation** - document all custom hooks and utilities
* **README updates** - keep installation and setup instructions current
* **Changelog** - track significant changes and updates

---

## Quality Assurance

### Definition of Done
* ✅ **Mobile-first responsive** (works perfectly at 375px)
* ✅ **Brand colors consistent** (MyMoolah green/blue palette)
* ✅ **Typography follows Montserrat system** (explicitly styled)
* ✅ **Performance optimized** (fast on low-cost Android)
* ✅ **Accessibility compliant** (44px touch targets, proper contrast)
* ✅ **Multi-input authentication** (phone/account/username support with validation)
* ✅ **Password complexity enforced** (all 5 requirements with compact format hints)
* ✅ **Simplified UI messaging** (static "Phone Number" label, clear help text)
* ✅ **Bottom card consistency** (T&C's, Security, FAQ icons on auth pages)
* ✅ **KYC system integration** (document upload, status tracking, transaction blocking)
* ✅ **Error handling implemented**
* ✅ **Loading states included**
* ✅ **TypeScript strict compliance**
* ✅ **Component properly documented**
* ✅ **Tested on mobile viewport**

### Review Checklist
- [ ] Component follows mobile-first principles
- [ ] Uses MyMoolah brand colors correctly
- [ ] Typography uses Montserrat font system with explicit styling
- [ ] Touch targets meet 44px minimum
- [ ] Performance optimized for low-end devices
- [ ] Multi-input field supports all three authentication types
- [ ] UI uses simplified messaging ("Phone Number" label, simplified help text)
- [ ] Password fields use compact format hints (not overwhelming)
- [ ] Authentication pages have consistent bottom card (T&C's, Security, FAQ)
- [ ] South African phone number validation works correctly
- [ ] Account number validation (8-12 digits) implemented
- [ ] Username validation (4-32 chars, allowed characters) implemented
- [ ] Password fields implement all security requirements
- [ ] Real-time validation provides clear feedback
- [ ] KYC document upload interface works correctly (if applicable)
- [ ] KYC status tracking displays properly (if applicable)
- [ ] Document validation (file type, size) implemented (if applicable)
- [ ] Camera integration works on mobile devices (if applicable)
- [ ] Proper error handling and loading states
- [ ] Accessibility features implemented (ARIA labels, keyboard navigation)
- [ ] TypeScript types properly defined
- [ ] Component is reusable and well-structured
- [ ] Documentation is clear and complete

---

## Critical Implementation Notes

### ⚠️ Breaking Changes from Previous Version:
1. **Authentication Method**: Multi-input field with simplified UI messaging
2. **Field Label**: Static "Phone Number" instead of dynamic labels
3. **Help Text**: Simplified to "Enter your phone number (27XXXXXXXXX) - also your account no."
4. **Input Validation**: Dynamic detection and validation of three input types
5. **Typography**: All components now require explicit Montserrat font styling
6. **Password Validation**: Real-time validation with 5 complexity requirements mandatory
7. **Password Format Hints**: Compact blue hint boxes (not overwhelming)
8. **Bottom Card Consistency**: T&C's, Security, FAQ icons required on both auth pages
9. **Touch Targets**: All interactive elements must meet 44px minimum requirement
10. **Form Inputs**: Show/hide password toggle required for all password fields
11. **KYC System**: Complete document upload and status tracking system
12. **Route Structure**: New KYC routes added to App.tsx
13. **AuthContext**: Enhanced with KYC status management functions

### 🔥 Cursor AI Integration Requirements:
* **Multi-Input Field**: Must support phone/account/username with dynamic detection
* **Simplified UI**: Static "Phone Number" label with simplified help text
* **Compact Password Hints**: Brief format guidance that doesn't overwhelm mobile
* **Bottom Card Icons**: Consistent T&C's, Security, FAQ on login and register pages
* **South African Phone Numbers**: Specific format validation (+27, 27, 0 prefixes)
* **Account Number Validation**: 8-12 digits numeric only
* **Username Validation**: 4-32 characters with specific allowed characters
* **Password Field**: Must include all 5 complexity requirements with real-time validation
* **KYC Document Upload**: Support SAID/Passport + POA with camera integration
* **KYC Status Tracking**: Visual progress timeline with real-time updates
* **KYC Integration**: Transaction blocking and requirement checks throughout app
* **Document Validation**: File type, size, and quality validation
* **Camera Integration**: Mobile-first document capture with fallback
* **Accessibility**: Full screen reader and keyboard navigation support
* **Typography**: Explicit Montserrat styling to override component defaults
* **Error Messages**: User-friendly, actionable feedback for all validation failures

### **NEW: KYC System Components Required:**
* **KYCDocumentsPage.tsx** - Main document upload interface
* **KYCStatusPage.tsx** - Verification status tracking
* **DocumentUploadSection** - Reusable upload component
* **DocumentPreview** - File preview and removal
* **CameraCapture** - Mobile camera integration
* **StatusTimeline** - Visual progress tracking
* **Enhanced AuthContext** - KYC status management

---

*These guidelines ensure MyMoolah maintains award-winning quality, optimal performance for low-cost Android devices, meets enterprise security requirements, and provides comprehensive KYC compliance while delivering a simplified, user-friendly interface that preserves consistency across all development phases including document verification workflows.*