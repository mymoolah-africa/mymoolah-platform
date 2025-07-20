# MyMoolah - Selective Integration Guide for Cursor IDE

## Overview
This guide provides comprehensive instructions for integrating the complete MyMoolah fintech wallet system into your Cursor IDE project. The system now includes all 6 core pages, unified payment hub architecture, comprehensive KYC system, and production-ready foundations.

---

## **🚀 Complete System Architecture Status**

### **✅ Fully Implemented Features:**
- **6 Core Pages**: Login, Register, Dashboard, SendMoney, Transact, Vouchers, Profile
- **Authentication System**: Multi-input (phone/account/username) with complex passwords
- **KYC System**: Document upload, camera integration, status tracking, transaction blocking
- **SendMoney Hub**: Unified payment system with 3 payment methods and service discovery
- **Mobile-First Design**: 375px optimized with clean white/gradient hybrid backgrounds
- **Component Library**: 90+ files with reusable, accessible components
- **Security Features**: Enterprise-grade authentication, document encryption, secure validation
- **Performance Optimization**: Low-cost Android device optimized

---

## **📁 Complete File Structure Overview**

```
MyMoolah-Production/
├── App.tsx                           # ✅ Main application with complete routing
├── Guidelines.md                     # ✅ Comprehensive design system guide
├── Attributions.md                  # ✅ Complete technology attribution
├── selective-integration.md         # ✅ This integration guide
├── README.md                       # ⭐ NEW - Complete project overview
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx       # ✅ Route protection with KYC integration
│   ├── common/
│   │   ├── ErrorBoundary.tsx        # ✅ Error handling
│   │   └── LoadingSpinner.tsx       # ✅ Loading states
│   ├── figma/
│   │   └── ImageWithFallback.tsx    # ✅ Optimized image component
│   ├── ui/                          # ✅ Complete shadcn/ui library (40+ components)
│   │   ├── button.tsx, card.tsx, input.tsx, dialog.tsx, progress.tsx
│   │   ├── alert.tsx, badge.tsx, form.tsx, label.tsx, separator.tsx
│   │   └── ... [38 more components]
│   ├── BalanceCards.tsx             # ✅ Dashboard balance display
│   ├── BottomNavigation.tsx         # ✅ Mobile navigation
│   ├── Icons.tsx                    # ✅ Custom icons
│   ├── RecentTransactions.tsx       # ✅ Transaction history
│   ├── SecurityBadge.tsx            # ✅ Security indicators
│   └── TopBanner.tsx                # ✅ Notification banners
├── contexts/
│   ├── AuthContext.tsx              # ✅ Enhanced with KYC management
│   └── MoolahContext.tsx            # ✅ Application state
├── layouts/
│   └── MobileLayout.tsx             # ✅ Main app layout wrapper
├── pages/
│   ├── LoginPage.tsx                # ✅ Multi-input authentication
│   ├── RegisterPage.tsx             # ✅ Account creation with validation
│   ├── DashboardPage.tsx            # ✅ Main dashboard with KYC integration
│   ├── SendMoneyPage.tsx            # ⭐ NEW - Unified payment hub
│   ├── TransactPage.tsx             # ✅ Transaction management
│   ├── VouchersPage.tsx             # ✅ Voucher system
│   ├── ProfilePage.tsx              # ✅ User profile with KYC status
│   ├── KYCDocumentsPage.tsx         # ⭐ NEW - Document upload system
│   └── KYCStatusPage.tsx            # ⭐ NEW - Verification tracking
├── config/
│   └── app-config.ts                # ✅ Application configuration
├── styles/
│   └── globals.css                  # ✅ Complete Tailwind v4 system
└── ... [additional config files]
```

---

## **🔧 Installation & Setup Instructions**

### **Step 1: Initialize Your Cursor Project**
```bash
# Create new React + TypeScript project
npm create vite@latest mymoolah-wallet -- --template react-ts
cd mymoolah-wallet

# Install core dependencies
npm install
```

### **Step 2: Install Required Dependencies**
```bash
# Core React dependencies
npm install react@^18.0.0 react-dom@^18.0.0
npm install react-router-dom@^6.0.0

# UI and Styling
npm install tailwindcss@latest postcss autoprefixer
npm install @tailwindcss/forms @tailwindcss/typography

# Component Libraries
npm install lucide-react
npm install recharts

# Form Management
npm install react-hook-form@7.55.0
npm install @hookform/resolvers
npm install zod

# Notifications
npm install sonner@2.0.3

# Development Dependencies
npm install -D typescript @types/react @types/react-dom
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint eslint-plugin-react-hooks eslint-plugin-react-refresh
npm install -D vite @vitejs/plugin-react
```

### **Step 3: Setup Tailwind CSS Configuration**
```bash
# Initialize Tailwind CSS (v4)
npx tailwindcss init -p

# Note: MyMoolah uses Tailwind v4 with custom CSS variables
# The complete globals.css file is provided with all custom properties
```

---

## **📦 Core File Integration Priority**

### **🔥 CRITICAL FILES - Must Install First**

#### **1. App.tsx - Main Application Router**
```typescript
// Complete routing system with all 6 pages + KYC routes
// ⚠️ IMPORTANT: This is the main entry point
// Copy entire contents - includes ErrorBoundary, AuthProvider, MoolahProvider
```

#### **2. styles/globals.css - Complete Design System**
```css
/* ⚠️ CRITICAL: Complete Tailwind v4 configuration */
/* Includes: MyMoolah brand colors, mobile optimizations, typography system */
/* Must be installed FIRST before any components */
```

#### **3. contexts/AuthContext.tsx - Authentication & KYC System**
```typescript
// ⚠️ ESSENTIAL: Enhanced authentication with KYC management
// Includes: Multi-input validation, KYC status tracking, requiresKYC function
// All pages depend on this context
```

#### **4. Guidelines.md - Development Standards**
```markdown
# ⚠️ MUST READ: Complete design system and implementation guide
# Contains: Typography rules, component patterns, security requirements
# Essential reference for all development
```

### **🏗️ FOUNDATION COMPONENTS - Install Second**

#### **5. components/ui/ Directory - Complete shadcn/ui Library**
```bash
# Install all 40+ components in this order:
# 1. button.tsx, input.tsx, label.tsx (form basics)
# 2. card.tsx, dialog.tsx, alert.tsx (layouts)
# 3. progress.tsx, separator.tsx, badge.tsx (UI elements)
# 4. ... [remaining 35+ components]
```

#### **6. layouts/MobileLayout.tsx - Main App Structure**
```typescript
// ⚠️ REQUIRED: Provides consistent layout for all main pages
// Includes: Bottom navigation, safe area handling, backdrop blur
```

#### **7. components/auth/ProtectedRoute.tsx - Route Security**
```typescript
// ⚠️ ESSENTIAL: Handles authentication and KYC requirements
// Must be installed before any protected pages
```

### **🎨 AUTHENTICATION PAGES - Install Third**

#### **8. LoginPage.tsx - Multi-Input Authentication**
```typescript
// ✅ COMPLETE: Multi-input system (phone/account/username)
// Features: Complex password validation, compact format hints, T&C's/Security/FAQ
// ⚠️ Requires: AuthContext, all form components, Dialog components
```

#### **9. RegisterPage.tsx - Account Creation**
```typescript
// ✅ COMPLETE: Account registration with validation
// Features: Email field, password confirmation, KYC preparation
// ⚠️ Requires: Same dependencies as LoginPage
```

### **🏛️ KYC SYSTEM - Install Fourth**

#### **10. KYCDocumentsPage.tsx - Document Upload**
```typescript
// ⭐ NEW: Complete document upload system
// Features: Camera integration, file validation, SAID/Passport + POA upload
// ⚠️ Requires: Camera API, File API, Progress component, Card components
```

#### **11. KYCStatusPage.tsx - Verification Tracking**
```typescript
// ⭐ NEW: Real-time verification status tracking
// Features: Visual timeline, status updates, action buttons
// ⚠️ Requires: Progress component, Badge component, Timeline styling
```

### **💳 MAIN APPLICATION PAGES - Install Fifth**

#### **12. SendMoneyPage.tsx - Unified Payment Hub**
```typescript
// ⭐ NEW: Complete unified payment system
// Features: 5-step flow, service discovery, 3 payment methods, KYC integration
// ⚠️ Requires: All form components, Progress, Separator, complex state management
```

#### **13. DashboardPage.tsx - Main Dashboard**
```typescript
// ✅ ENHANCED: Dashboard with KYC integration
// Features: Balance cards, transaction history, KYC status banner
// ⚠️ Requires: BalanceCards, RecentTransactions, TopBanner components
```

#### **14. Remaining Pages (TransactPage, VouchersPage, ProfilePage)**
```typescript
// ✅ COMPLETE: All feature placeholders with KYC integration
// Install after core system is working
```

---

## **🔍 Component Integration Instructions**

### **Authentication System Integration**

#### **Multi-Input Field Pattern**
```typescript
// ⚠️ CRITICAL PATTERN - Use in LoginPage, RegisterPage, SendMoneyPage

// 1. Input Type Detection
const detectInputType = (input: string): 'phone' | 'account' | 'username' | 'unknown' => {
  const cleanInput = input.trim();
  
  // Phone: +27XXXXXXXXX, 27XXXXXXXXX, 0XXXXXXXXX
  const phonePattern = /^(\+27|27|0)?[6-8][0-9]{8}$/;
  if (phonePattern.test(cleanInput.replace(/\s/g, ''))) return 'phone';
  
  // Account: 8-12 digits only
  const accountPattern = /^[0-9]{8,12}$/;
  if (accountPattern.test(cleanInput)) return 'account';
  
  // Username: 4-32 chars, letters/numbers/periods/underscores
  const usernamePattern = /^[a-zA-Z0-9._]{4,32}$/;
  if (usernamePattern.test(cleanInput)) return 'username';
  
  return 'unknown';
};

// 2. Field Implementation
<div className="space-y-2">
  <Label htmlFor="identifier">Phone Number</Label> {/* Static label */}
  <Input
    id="identifier"
    type="text"
    placeholder={getPlaceholderText()} // Dynamic based on input type
    value={credentials.identifier}
    onChange={handleIdentifierChange}
    // ⚠️ MUST include explicit styling:
    style={{ 
      height: 'var(--mobile-touch-target)',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 'var(--mobile-font-base)',
      fontWeight: 'var(--font-weight-normal)',
      borderRadius: 'var(--mobile-border-radius)'
    }}
  />
  <div className="text-xs text-gray-500">
    {/* Simplified help text */}
    Enter your phone number (27XXXXXXXXX) - also your account no.
  </div>
</div>
```

#### **Password Field with Compact Hints**
```typescript
// ⚠️ CRITICAL PATTERN - Complex password validation

// 1. Password Validation Function
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    isValid: /* all requirements met */
  };
};

// 2. Compact Format Hint
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
```

### **KYC System Integration**

#### **Document Upload Component Pattern**
```typescript
// ⚠️ NEW PATTERN - Camera integration with file upload

// 1. Camera Access
const handleCameraCapture = async (type: DocumentType) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',  // Back camera preferred
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      } 
    });
    
    setShowCamera(true);
    // Implementation for camera capture
    
    // ⚠️ IMPORTANT: Cleanup streams
    stream.getTracks().forEach(track => track.stop());
    
  } catch (error) {
    setError('Camera not available. Please use file upload instead.');
  }
};

// 2. File Validation
const handleFileSelect = (file: File) => {
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    setError('Please upload a JPG, PNG, or PDF file');
    return;
  }

  // File size validation (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    setError('File size must be less than 10MB');
    return;
  }

  // Process file...
};
```

#### **KYC Integration in AuthContext**
```typescript
// ⚠️ CRITICAL ENHANCEMENT - Add to existing AuthContext

interface User {
  // ... existing properties
  kycStatus: 'not_started' | 'documents_uploaded' | 'under_review' | 'verified' | 'rejected';
  kycVerified: boolean;
}

// New KYC management functions
const updateKYCStatus = async (status: KYCStatus) => { /* implementation */ };
const requiresKYC = (action?: string): boolean => {
  if (!user) return true;
  
  // Allow browsing without KYC
  if (action === 'browse' || action === 'deposit') return false;
  
  // Require KYC for transactions
  if (action === 'send' || action === 'transfer' || action === 'withdraw') {
    return user.kycStatus !== 'verified';
  }
  
  return user.kycStatus !== 'verified';
};
```

### **SendMoney Unified Payment Hub Integration**

#### **Service Discovery Pattern**
```typescript
// ⭐ NEW ARCHITECTURE - Parallel service discovery

// 1. Payment Method Types
interface PaymentMethod {
  id: 'mymoolah_internal' | 'sa_bank_transfer' | 'atm_cash_pickup';
  name: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  fee: string;
  feeAmount: number;
  available: boolean;
  preferred: boolean;
}

// 2. Parallel Service Resolution
const resolveRecipient = async (identifier: string): Promise<RecipientResolution> => {
  setIsResolvingRecipient(true);
  
  // Parallel API calls for optimal performance
  const [mymoolahResult, bankResult, atmResult] = await Promise.allSettled([
    checkMyMoolahWallet(identifier),     // Internal wallet
    checkSABankAccount(identifier),      // dtMercury integration
    checkATMCashAvailability(identifier) // Future SP
  ]);

  const availableMethods = filterAvailableServices([...results]);
  
  return {
    identifier,
    type: detectInputType(identifier),
    availableMethods,
    recipientName: resolvedName,
    recipientInfo: resolvedInfo
  };
};

// 3. Smart Routing Logic
if (availableMethods.length === 1) {
  // Skip method selection - go directly to amount
  setSelectedMethod(availableMethods[0]);
  setStep('amount');
} else {
  // Show method selection
  setStep('method');
}
```

#### **5-Step Flow Implementation**
```typescript
// ⭐ NEW PATTERN - Progressive transaction flow

type SendMoneyStep = 'recipient' | 'method' | 'amount' | 'review' | 'processing' | 'success';

// Step progression with validation
const handleStepProgression = () => {
  switch (step) {
    case 'recipient':
      // Validate recipient and resolve payment methods
      if (recipientValidation.isValid) {
        resolveRecipient(recipient).then(handleMethodSelection);
      }
      break;
    
    case 'method':
      // Set selected method and proceed to amount
      setSelectedMethod(method);
      setStep('amount');
      break;
    
    case 'amount':
      // Validate amount and generate quote
      if (amountValidation.isValid) {
        generateQuote().then(() => setStep('review'));
      }
      break;
    
    case 'review':
      // Execute transfer
      executeTransfer().then(() => setStep('success'));
      break;
  }
};
```

---

## **⚠️ Critical Integration Requirements**

### **Typography Override System**
```typescript
// ⚠️ ESSENTIAL: All components must override default typography

// Bad (will use component defaults):
<Button>Send Money</Button>

// Good (explicitly styled):
<Button
  style={{ 
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 'var(--mobile-font-base)',
    fontWeight: 'var(--font-weight-medium)'
  }}
>
  Send Money
</Button>
```

### **Touch Target Requirements**
```typescript
// ⚠️ ACCESSIBILITY: All interactive elements need 44px minimum

// Buttons, inputs, touch areas:
style={{ 
  minHeight: 'var(--mobile-touch-target)', // 44px
  minWidth: 'var(--mobile-touch-target)'   // 44px
}}
```

### **Mobile-First Responsive Design**
```css
/* ⚠️ CRITICAL: All layouts must be 375px optimized first */

.mobile-container {
  max-width: var(--mobile-max-width); /* 375px */
  margin: 0 auto;
  padding: var(--mobile-padding);     /* 1rem */
}
```

---

## **🧪 Testing & Validation Instructions**

### **Component Testing Checklist**
```bash
# 1. Mobile Viewport Testing
- [ ] Test at 375px width (primary target)
- [ ] Test touch interactions on all buttons
- [ ] Verify typography uses Montserrat font
- [ ] Check 44px minimum touch targets

# 2. Authentication System Testing
- [ ] Test multi-input field with all 3 types (phone/account/username)
- [ ] Test South African phone format validation
- [ ] Test password complexity requirements
- [ ] Test show/hide password toggle

# 3. KYC System Testing
- [ ] Test document upload (both camera and file)
- [ ] Test file validation (type, size)
- [ ] Test KYC status progression
- [ ] Test transaction blocking for unverified users

# 4. SendMoney System Testing
- [ ] Test complete 5-step flow
- [ ] Test service discovery with all payment methods
- [ ] Test amount validation and quick buttons
- [ ] Test transfer review and confirmation
- [ ] Test success state with receipt
```

### **Integration Validation**
```bash
# Run these commands to validate integration:

# 1. TypeScript compilation
npm run type-check

# 2. Linting
npm run lint

# 3. Build test
npm run build

# 4. Development server
npm run dev
```

---

## **🚨 Common Integration Issues & Solutions**

### **Issue 1: Component Styling Not Applied**
```typescript
// Problem: Using component without explicit styling
<Input placeholder="Enter amount" />

// Solution: Always include MyMoolah styling
<Input
  placeholder="Enter amount"
  style={{ 
    height: 'var(--mobile-touch-target)',
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 'var(--mobile-font-base)',
    borderRadius: 'var(--mobile-border-radius)'
  }}
/>
```

### **Issue 2: Authentication Context Not Available**
```typescript
// Problem: Using authentication outside provider
const { user } = useAuth(); // Error: Cannot read properties of undefined

// Solution: Ensure AuthProvider wraps your app
<AuthProvider>
  <YourComponent />
</AuthProvider>
```

### **Issue 3: KYC Functions Not Working**
```typescript
// Problem: Missing KYC enhancement in AuthContext
const { requiresKYC } = useAuth(); // undefined

// Solution: Use enhanced AuthContext with KYC functions
// Copy the complete AuthContext.tsx with KYC integration
```

### **Issue 4: Mobile Layout Issues**
```css
/* Problem: Desktop-first approach */
.container {
  width: 100%;
  max-width: 1200px; /* Too wide for mobile */
}

/* Solution: Mobile-first with MyMoolah constraints */
.mobile-container {
  max-width: var(--mobile-max-width); /* 375px */
  margin: 0 auto;
  padding: var(--mobile-padding);
}
```

---

## **📋 Post-Integration Checklist**

### **✅ Core System Verification**
- [ ] All 6 pages load without errors
- [ ] Authentication system works with all 3 input types
- [ ] KYC document upload functions properly
- [ ] SendMoney flow completes all 5 steps
- [ ] Mobile layout renders correctly at 375px
- [ ] Typography uses Montserrat font throughout
- [ ] Touch targets meet 44px minimum requirement
- [ ] Error boundaries catch and display errors gracefully

### **✅ Feature Integration Verification**
- [ ] Multi-input validation detects phone/account/username correctly
- [ ] Password complexity validation works with all 5 requirements
- [ ] Compact password hints display properly
- [ ] KYC status blocks transactions appropriately
- [ ] Service discovery resolves payment methods
- [ ] Payment method selection shows proper fees and times
- [ ] Camera integration works for document capture
- [ ] File upload validation works correctly

### **✅ Performance & Accessibility**
- [ ] Page loads quickly on slow devices/networks
- [ ] All interactive elements are keyboard accessible
- [ ] Screen readers can navigate the interface
- [ ] Colors meet contrast ratio requirements
- [ ] Animations respect reduced motion preferences
- [ ] Forms provide clear validation feedback

---

## **🔄 Update & Maintenance Instructions**

### **Regular Updates**
```bash
# Monthly dependency updates
npm update

# Security audits
npm audit --audit-level high
npm audit fix

# Type checking
npm run type-check
```

### **Adding New Features**
```typescript
// 1. Follow MyMoolah component patterns
// 2. Include explicit typography styling
// 3. Ensure mobile-first responsive design
// 4. Add proper TypeScript types
// 5. Include accessibility features
// 6. Test on 375px viewport
```

### **Integration with Backend**
```typescript
// Replace demo/mock functions with real API calls:
// - Authentication endpoints
// - KYC document upload APIs  
// - Payment service provider integrations
// - Transaction processing APIs

// Maintain the same interfaces and error handling patterns
```

---

## **📞 Support & Troubleshooting**

### **Common Development Issues**
1. **Styling Problems**: Ensure globals.css is imported first
2. **Authentication Issues**: Verify AuthContext is properly wrapped
3. **Component Errors**: Check all required dependencies are installed
4. **Mobile Layout**: Test on actual mobile devices, not just browser dev tools
5. **TypeScript Errors**: Ensure all interfaces and types are properly imported

### **Performance Optimization**
1. **Bundle Size**: Use code splitting for large components
2. **Image Optimization**: Use WebP format where supported
3. **API Calls**: Implement proper caching strategies
4. **Memory Usage**: Clean up event listeners and timeouts
5. **Battery Impact**: Minimize background processing

### **Security Considerations**
1. **Authentication Tokens**: Implement secure token storage
2. **API Endpoints**: Use HTTPS for all communications
3. **User Data**: Never log sensitive information
4. **File Uploads**: Validate and sanitize all uploads
5. **XSS Protection**: Sanitize user input

---

*This integration guide ensures successful implementation of the complete MyMoolah system with all advanced features including unified payment hub, comprehensive KYC system, and mobile-first design optimized for low-cost Android devices.*

*For additional support or questions, refer to the comprehensive Guidelines.md file for detailed implementation patterns and best practices.*