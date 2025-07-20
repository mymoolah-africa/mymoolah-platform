# MyMoolah Platform - Development Guide

## 🎯 **Development Overview**

**Current Version:** 2.1.0  
**Status:** ✅ **FULLY OPERATIONAL**  
**Last Updated:** July 20, 2025

---

## 🏗️ **Architecture Overview**

### **Frontend Architecture**
```
mymoolah-wallet-frontend/
├── 📁 pages/                    # ✅ All pages implemented
│   ├── LoginPage.tsx           # ✅ Enhanced with logo2.svg
│   ├── RegisterPage.tsx        # ✅ New registration system
│   ├── KYCStatusPage.tsx       # ✅ KYC progress tracking
│   ├── KYCDocumentsPage.tsx    # ✅ Document upload system
│   └── DashboardPage.tsx       # ✅ Main dashboard
├── 📁 components/               # ✅ All components ready
│   ├── ui/                     # ✅ shadcn/ui components (imports fixed)
│   ├── figma/                  # ✅ Figma AI components
│   └── auth/                   # Authentication components
├── 📁 contexts/                # ✅ State management complete
│   ├── AuthContext.tsx         # ✅ Enhanced with KYC support
│   └── MoolahContext.tsx      # Financial operations
├── 📁 config/                  # ✅ Configuration complete
│   └── app-config.ts          # ✅ Demo/production settings
└── 📁 src/assets/              # ✅ All assets available
    ├── logo.svg               # Primary logo
    ├── logo2.svg              # ✅ Professional MyMoolah branding
    └── logo3.svg              # Login page logo
```

### **Backend Architecture**
```
mymoolah/
├── 📁 server.js               # ✅ Main server (Port 5050)
├── 📁 config/                 # ✅ Configuration complete
├── 📁 middleware/             # ✅ Security middleware
├── 📁 routes/                 # ✅ API endpoints
│   ├── auth.js               # ✅ Authentication routes
│   ├── wallets.js            # ✅ Wallet management
│   ├── sendMoney.js          # ✅ Send money API
│   └── kyc.js               # ✅ KYC system
├── 📁 controllers/            # ✅ Business logic
├── 📁 models/                 # ✅ Data models
├── 📁 services/               # ✅ External services
└── 📁 tests/                  # ✅ Test suite
```

---

## 🔄 **Development Workflow**

### **Frontend Development Process**

#### **1. Figma Integration**
```bash
# New designs from Figma AI agent
# Copy new files to appropriate directories
cp Figma/components/* components/ui/
cp Figma/pages/* pages/
```

#### **2. Import Fixes**
```bash
# Remove version numbers from imports
find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*//g' {} \;

# Check for remaining version numbers
find components/ui -name "*.tsx" -exec grep -l "@[0-9]" {} \;
```

#### **3. CSS Configuration**
```css
/* Ensure Tailwind directives are present */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### **4. Component Testing**
```bash
# Start frontend server
npm run dev

# Test components in browser
open http://localhost:3000
```

### **Backend Development Process**

#### **1. API Design**
```javascript
// Plan new endpoints
// Design request/response formats
// Consider authentication requirements
```

#### **2. Route Implementation**
```javascript
// Create route file
// Implement middleware
// Add validation
// Handle errors
```

#### **3. Database Integration**
```javascript
// Update models if needed
// Implement database queries
// Add transaction handling
```

#### **4. Testing**
```bash
# Test API endpoints
curl -X POST http://localhost:5050/api/v1/send-money/resolve-recipient \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234567"}'
```

---

## 🎨 **Design System**

### **MyMoolah Brand Guidelines**

#### **Colors**
```css
/* Primary Colors */
--mymoolah-green: #86BE41;
--mymoolah-blue: #2D8CCA;

/* Secondary Colors */
--mymoolah-gray: #6B7280;
--mymoolah-light-gray: #F3F4F6;
```

#### **Typography**
```css
/* Font Family */
font-family: 'Montserrat', sans-serif;

/* Font Weights */
font-weight: 400; /* Regular */
font-weight: 500; /* Medium */
font-weight: 700; /* Bold */
```

#### **Spacing**
```css
/* Mobile-first spacing */
--mobile-touch-target: 44px;
--section-spacing: 1rem;
--component-spacing: 0.5rem;
```

### **Component Library**

#### **Button System**
```tsx
// Primary Button
<Button variant="default" size="lg">
  Send Money
</Button>

// Secondary Button
<Button variant="secondary" size="md">
  Cancel
</Button>

// Destructive Button
<Button variant="destructive" size="sm">
  Delete
</Button>
```

#### **Card System**
```tsx
// Standard Card
<Card>
  <CardHeader>
    <CardTitle>Wallet Balance</CardTitle>
  </CardHeader>
  <CardContent>
    <p>R 5,000.00</p>
  </CardContent>
</Card>
```

#### **Form Components**
```tsx
// Input Field
<Input 
  type="text" 
  placeholder="Enter phone number"
  className="w-full"
/>

// Select Dropdown
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select payment method" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
    <SelectItem value="atm_pickup">ATM Pickup</SelectItem>
  </SelectContent>
</Select>
```

---

## 🔧 **Technical Stack**

### **Frontend Stack**
- **React 18** with TypeScript
- **Vite** build system (v4.5.14)
- **Tailwind CSS** with custom design system
- **Radix UI** components (all imports fixed)
- **Lucide React** icons
- **React Router** for navigation
- **Context API** for state management

### **Backend Stack**
- **Node.js** with Express
- **SQLite** database (properly configured)
- **JWT** authentication (working correctly)
- **bcrypt** password hashing
- **multer** file uploads
- **express-validator** request validation
- **CORS** enabled

### **Development Tools**
- **npm** package management
- **Git** version control
- **ESLint** code linting
- **Prettier** code formatting

---

## 📱 **Mobile Development**

### **Mobile-First Design**
```css
/* Mobile-first approach */
.container {
  padding: 1rem;
  max-width: 100%;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    max-width: 768px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
    max-width: 1024px;
  }
}
```

### **Touch Optimization**
```css
/* Minimum touch target size */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.75rem 1rem;
}

/* Touch-friendly spacing */
.touch-target {
  margin: 0.5rem;
  padding: 0.75rem;
}
```

### **Performance Optimization**
```javascript
// Lazy loading for images
const ImageWithFallback = ({ src, alt, fallback }) => {
  const [imgSrc, setImgSrc] = useState(src);
  
  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallback)}
    />
  );
};

// Code splitting
const LazyComponent = lazy(() => import('./HeavyComponent'));
```

---

## 🔐 **Security Implementation**

### **Authentication**
```javascript
// JWT Token Generation
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Password Hashing
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Password Verification
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

### **Input Validation**
```javascript
// Request validation
const validateLogin = [
  body('identifier').notEmpty().withMessage('Identifier is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validateRequest
];
```

### **File Upload Security**
```javascript
// Multer configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

---

## 🧪 **Testing Strategy**

### **Frontend Testing**
```javascript
// Component testing
import { render, screen } from '@testing-library/react';
import LoginPage from '../pages/LoginPage';

test('renders login form', () => {
  render(<LoginPage />);
  expect(screen.getByText('Login')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument();
});
```

### **Backend Testing**
```javascript
// API endpoint testing
describe('POST /api/v1/auth/login', () => {
  test('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '27821234567',
        password: 'Demo123!'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### **Integration Testing**
```bash
# Test complete workflow
# 1. Register user
curl -X POST http://localhost:5050/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "identifier": "27821234568", "identifierType": "phone", "email": "test@mymoolah.com", "password": "Test123!", "firstName": "Test", "lastName": "User"}'

# 2. Login user
curl -X POST http://localhost:5050/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234568", "password": "Test123!"}'

# 3. Test send money
curl -X POST http://localhost:5050/api/v1/send-money/resolve-recipient \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234567"}'
```

---

## 📊 **Performance Optimization**

### **Frontend Optimization**
```javascript
// Code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

// Image optimization
const optimizedImage = {
  src: '/images/logo2.svg',
  alt: 'MyMoolah Logo',
  loading: 'lazy'
};

// Bundle optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  }
});
```

### **Backend Optimization**
```javascript
// Database query optimization
const getWalletBalance = async (userId) => {
  return await db.get(
    'SELECT balance FROM wallets WHERE userId = ?',
    [userId]
  );
};

// Caching strategy
const cache = new Map();
const getCachedData = (key) => {
  if (cache.has(key)) {
    return cache.get(key);
  }
  // Fetch and cache data
  const data = fetchData(key);
  cache.set(key, data);
  return data;
};
```

---

## 🚨 **Error Handling**

### **Frontend Error Handling**
```javascript
// Error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

### **Backend Error Handling**
```javascript
// Global error handler
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Validation error handler
const handleValidationError = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};
```

---

## 📚 **Documentation Standards**

### **Code Documentation**
```javascript
/**
 * Authenticates a user with the provided credentials
 * @param {string} identifier - Phone number, account number, or username
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication result with token
 */
const authenticateUser = async (identifier, password) => {
  // Implementation
};
```

### **API Documentation**
```javascript
/**
 * @route POST /api/v1/auth/login
 * @desc Authenticate user
 * @access Public
 * @body {string} identifier - Phone number, account number, or username
 * @body {string} password - User password
 * @returns {Object} Authentication result with JWT token
 */
```

### **Component Documentation**
```tsx
/**
 * LoginPage Component
 * 
 * Handles user authentication with multi-input support
 * 
 * @component
 * @example
 * <LoginPage />
 */
const LoginPage = () => {
  // Component implementation
};
```

---

## 🔄 **Version Control**

### **Git Workflow**
```bash
# Create feature branch
git checkout -b feature/send-money-api

# Make changes
git add .
git commit -m "feat: add send money API endpoints"

# Push changes
git push origin feature/send-money-api

# Create pull request
# Merge after review
```

### **Commit Standards**
```bash
# Commit types
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation
style:    # Formatting
refactor: # Code restructuring
test:     # Adding tests
chore:    # Maintenance
```

---

## 📞 **Support & Resources**

### **Development Resources**
- **API Documentation:** `/docs/API_DOCUMENTATION.md`
- **Project Status:** `/docs/PROJECT_STATUS.md`
- **Setup Guide:** `/docs/SETUP_GUIDE.md`
- **Agent Handover:** `/docs/AGENT_HANDOVER.md`

### **External Resources**
- **React Documentation:** https://react.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Radix UI:** https://www.radix-ui.com/
- **Express.js:** https://expressjs.com/

### **Community Support**
- **GitHub Issues:** Report bugs and feature requests
- **Documentation:** Keep docs updated
- **Code Reviews:** Peer review process

---

**Development Status:** ✅ **FULLY OPERATIONAL**  
**Last Updated:** July 20, 2025  
**Next Review:** July 27, 2025 