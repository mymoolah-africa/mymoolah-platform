# MyMoolah Platform - Setup Guide

## 🎯 **Quick Start Guide**

**Current Version:** 2.1.0  
**Status:** ✅ **FULLY OPERATIONAL**  
**Last Updated:** July 20, 2025

---

## 🚀 **Prerequisites**

### **System Requirements**
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Git:** Latest version
- **Operating System:** macOS, Windows, or Linux

### **Development Tools**
- **Code Editor:** VS Code (recommended)
- **Terminal:** Built-in terminal or iTerm2
- **Browser:** Chrome, Firefox, or Safari

---

## 📦 **Installation Steps**

### **1. Clone the Repository**
```bash
git clone <repository-url>
cd mymoolah
```

### **2. Install Backend Dependencies**
```bash
# Navigate to backend directory
cd mymoolah

# Install dependencies
npm install

# Create data directory for SQLite
mkdir -p data
```

### **3. Install Frontend Dependencies**
```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Install dependencies
npm install
```

### **4. Environment Setup**
```bash
# Backend environment (optional - uses defaults)
cp .env.example .env
# Edit .env with your configuration
```

---

## 🔧 **Configuration**

### **Backend Configuration**
The backend uses default configuration for development:

```javascript
// Default settings in server.js
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_PATH = './data/mymoolah.db';
```

### **Frontend Configuration**
The frontend is configured for development:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: true
  }
});
```

---

## 🚀 **Starting the Application**

### **Start Backend Server**
```bash
# From mymoolah directory
cd mymoolah
npm start
```

**Expected Output:**
```
✅ Users table created successfully
MyMoolah Wallet API server is running on port 5050
```

### **Start Frontend Server**
```bash
# From mymoolah-wallet-frontend directory
cd mymoolah-wallet-frontend
npm run dev
```

**Expected Output:**
```
  VITE v4.5.14  ready in 508 ms
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.3.160:3000/
```

---

## 🧪 **Testing the Setup**

### **Test Backend**
```bash
# Test server status
curl http://localhost:5050/test

# Test health endpoint
curl http://localhost:5050/health
```

### **Test Frontend**
```bash
# Open in browser
open http://localhost:3000

# Or test with curl
curl http://localhost:3000
```

### **Test API Endpoints**
```bash
# Test send money API
curl -X POST http://localhost:5050/api/v1/send-money/resolve-recipient \
  -H "Content-Type: application/json" \
  -d '{"identifier": "27821234567"}'
```

---

## 📊 **Current System Status**

### **✅ Backend Services**
- **Server:** Running on port 5050
- **Database:** SQLite operational
- **Authentication:** JWT system working
- **API Endpoints:** All functional
- **File Uploads:** KYC document uploads working

### **✅ Frontend Services**
- **Server:** Running on port 3000
- **Hot Reload:** Working properly
- **UI Components:** All Radix UI components functional
- **Logo System:** logo2.svg displaying correctly
- **Design System:** MyMoolah branding implemented

### **✅ Integration Status**
- **Figma Files:** Successfully integrated
- **Import Issues:** All resolved
- **CSS Configuration:** Tailwind working properly
- **Component Library:** All components operational

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Port Already in Use**
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:5050 | xargs kill -9
```

#### **2. Import Errors**
```bash
# Remove version numbers from imports
find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*//g' {} \;
```

#### **3. CSS Issues**
```bash
# Check if Tailwind directives are present
grep -n "@tailwind" styles/globals.css
```

#### **4. Database Issues**
```bash
# Reinitialize database
npm run init-db

# Check database
sqlite3 data/mymoolah.db ".tables"
```

#### **5. Node Modules Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📱 **Mobile Development**

### **Mobile Testing**
- **iOS Simulator:** Available on macOS
- **Android Emulator:** Available with Android Studio
- **Physical Devices:** Connect via USB or network

### **Mobile Optimization**
- **Touch Targets:** 44px minimum
- **Performance:** Optimized for low-end devices
- **Responsive Design:** Mobile-first approach

---

## 🔐 **Security Setup**

### **Development Security**
- **JWT Tokens:** Working for authentication
- **Input Validation:** All requests validated
- **CORS:** Configured for development
- **Rate Limiting:** Applied to all endpoints

### **Production Security**
- **HTTPS:** Required in production
- **Environment Variables:** Secure configuration
- **Database Security:** SQLite with proper permissions
- **File Upload Security:** Validated document uploads

---

## 📚 **Documentation**

### **Available Documentation**
- **API Documentation:** `/docs/API_DOCUMENTATION.md`
- **Project Status:** `/docs/PROJECT_STATUS.md`
- **Changelog:** `/docs/CHANGELOG.md`
- **Agent Handover:** `/docs/AGENT_HANDOVER.md`

### **Key Information**
- **Current Version:** 2.1.0
- **Last Updated:** July 20, 2025
- **Status:** Fully operational
- **Next Review:** July 27, 2025

---

## 🎯 **Development Workflow**

### **Frontend Development**
1. **Figma Integration:** New designs from Figma AI agent
2. **Component Development:** React/TypeScript components
3. **Styling:** Tailwind CSS with custom design tokens
4. **Testing:** Component and integration testing
5. **Deployment:** Vite build and serve

### **Backend Development**
1. **API Design:** RESTful endpoint planning
2. **Route Implementation:** Express.js route handlers
3. **Database Integration:** SQLite queries and models
4. **Authentication:** JWT token management
5. **Testing:** API endpoint testing

### **Integration Process**
1. **Figma Export:** AI agent provides updated components
2. **Code Integration:** Manual integration of new files
3. **Import Fixes:** Remove version numbers from imports
4. **CSS Updates:** Tailwind configuration adjustments
5. **Testing:** Full frontend and backend testing

---

## 📊 **Performance Metrics**

### **Frontend Performance**
- **Build Time:** < 5 seconds with Vite
- **Bundle Size:** Optimized with tree shaking
- **Mobile Performance:** Optimized for low-end devices
- **Loading Speed:** Fast initial page loads

### **Backend Performance**
- **Response Time:** < 100ms for most endpoints
- **Database Queries:** Optimized SQLite queries
- **Memory Usage:** Efficient Node.js memory management
- **Concurrent Users:** Handles multiple simultaneous requests

---

## 🚨 **Known Issues & Resolutions**

### **Resolved Issues** ✅ **FIXED**
- **Import Version Numbers:** Fixed all @version imports in UI components
- **CSS Tailwind Directives:** Added missing @tailwind directives
- **Figma Asset Imports:** Replaced with local asset references
- **Authentication Property Names:** Fixed camelCase consistency
- **Database Schema:** Aligned with User model properties

### **Current Status** ✅ **CLEAN**
- **No Known Issues:** All systems operational
- **Frontend Running:** http://localhost:3000
- **Backend Running:** http://localhost:5050
- **Database Connected:** SQLite operational
- **All APIs Working:** Tested and functional

---

## 📞 **Support & Maintenance**

### **Daily Tasks**
- **Server Health:** Check both servers are running
- **Log Monitoring:** Review error logs
- **Performance:** Monitor response times

### **Weekly Tasks**
- **Dependencies:** Update npm packages
- **Security:** Review security patches
- **Documentation:** Update docs as needed

### **Monthly Tasks**
- **Performance Review:** Optimize slow endpoints
- **Security Audit:** Comprehensive security review
- **Backup Strategy:** Verify data backups

---

## 🎯 **Next Steps**

### **Immediate Priorities**
1. **User Testing:** Test all pages and workflows
2. **Performance Optimization:** Further optimize for mobile devices
3. **Security Audit:** Comprehensive security review
4. **Documentation:** Update all technical documentation

### **Short-term Goals**
1. **Production Deployment:** Prepare for production environment
2. **Monitoring Setup:** Implement logging and monitoring
3. **Backup Strategy:** Implement automated backups
4. **CI/CD Pipeline:** Set up continuous integration

### **Long-term Vision**
1. **Scalability:** Plan for user growth
2. **Feature Expansion:** Additional wallet features
3. **Third-party Integrations:** Payment gateway integrations
4. **Mobile App:** Native mobile application

---

**Setup Status:** ✅ **COMPLETE**  
**Last Updated:** July 20, 2025  
**Next Review:** July 27, 2025 