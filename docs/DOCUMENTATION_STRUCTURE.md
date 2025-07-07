# Documentation Structure - MyMoolah Project

## 📁 **CRITICAL FILE LOCATION REQUIREMENT**

### **ALL .md files MUST be created and updated in the `/docs/` folder ONLY**

**✅ CORRECT LOCATION:** `/mymoolah/docs/`  
**❌ WRONG LOCATION:** `/mymoolah/` (root project directory)

---

## 📋 **DOCUMENTATION ORGANIZATION**

### **Project Root (`/mymoolah/`)**
- **NO .md files should be created here**
- Only code files, configuration files, and project structure
- Exception: `package.json`, `server.js`, etc.

### **Documentation Folder (`/mymoolah/docs/`)**
- **ALL .md files go here**
- All documentation, guides, and project information
- API documentation, changelog, project status, etc.

---

## 📄 **CURRENT DOCUMENTATION FILES**

### **Core Documentation (in `/docs/`):**
- `README.md` - Main project overview
- `CHANGELOG.md` - Version history and changes
- `PROJECT_STATUS.md` - Current project status
- `API_DOCUMENTATION.md` - API reference
- `FIGMA_API_WIRING.md` - Frontend-backend integration
- `FIGMA_INTEGRATION_WORKFLOW.md` - Critical workflow requirements
- `AGENT_HANDOVER.md` - Session handover information
- `CONTRIBUTING.md` - Development guidelines
- `CLEANUP_STATUS.md` - Cleanup tracking
- `QUICK_FIXES.md` - Quick fixes and patches

### **Technical Documentation:**
- `DEVELOPMENT_GUIDE.md` - Development setup and workflow
- `TESTING_GUIDE.md` - Testing procedures
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `SECURITY.md` - Security guidelines
- `KYC_SYSTEM.md` - KYC implementation
- `FLASH_INTEGRATION.md` - Payment integration

---

## 🚨 **IMPORTANT REMINDERS**

### **For All AI Agents:**
1. **NEVER create .md files in `/mymoolah/` root directory**
2. **ALWAYS create and update .md files in `/mymoolah/docs/`**
3. **When updating documentation, check if file exists in `/docs/` first**
4. **If file doesn't exist in `/docs/`, create it there**
5. **If file exists in root, move it to `/docs/` and update references**

### **File Organization Rules:**
- **Project documentation:** `/mymoolah/docs/`
- **Code files:** `/mymoolah/` (root)
- **Frontend files:** `/mymoolah/mymoolah-wallet-frontend/`
- **Backend files:** `/mymoolah/` (controllers, models, routes, etc.)

---

## 📝 **WORKFLOW FOR DOCUMENTATION UPDATES**

### **When Creating New Documentation:**
1. Check if file exists in `/docs/`
2. If not, create in `/docs/`
3. If exists in root, move to `/docs/`
4. Update any references to the file location

### **When Updating Existing Documentation:**
1. Locate file in `/docs/`
2. Update content in `/docs/` location
3. Remove any duplicate files from root
4. Verify all references point to `/docs/` location

---

**Last Updated:** August 2, 2025  
**Status:** ✅ **DOCUMENTATION STRUCTURE ESTABLISHED** 