# MyMoolah Figma Integration Guide

## 🎯 **Overview**

This guide addresses the recurring issues that occur during Figma integrations and provides automated solutions to make the process more robust and reliable.

## 🚨 **Common Issues & Solutions**

### **Issue 1: Import Statement Errors**
**Problem:** Version numbers in import statements cause module resolution failures
```
Error: Failed to resolve import "@radix-ui/react-slot@1.1.2"
```

**Solution:** Use the automated script or manual fix
```bash
# Automated fix (recommended)
./scripts/figma-integration.sh

# Manual fix
find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*//g' {} \;
```

### **Issue 2: CSS Tailwind Directives Missing**
**Problem:** Missing `@tailwind` directives in globals.css
```
Error: @tailwind base; @tailwind components; @tailwind utilities; not found
```

**Solution:** Ensure proper Tailwind configuration
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### **Issue 3: Figma Asset Import Errors**
**Problem:** Figma asset imports that don't resolve
```
Error: Failed to resolve import "figma:asset/9855454703f12c5c3f8170585b26613f48658613.png"
```

**Solution:** Replace with local assets
```bash
# Replace Figma assets with local logo
find . -name "*.tsx" -exec sed -i '' 's/figma:asset\/[^"]*"/..\/src\/assets\/logo2.svg"/g' {} \;
```

### **Issue 4: Server Port Conflicts**
**Problem:** Frontend server can't start due to port conflicts
```
Port 3000 is in use, trying another one...
Port 3001 is in use, trying another one...
```

**Solution:** Kill existing processes and restart
```bash
# Kill all running servers
pkill -f "vite"
pkill -f "node server.js"
pkill -f "npm run dev"
pkill -f "npm start"

# Wait and restart
sleep 3
npm run dev
```

### **Issue 5: Running Commands from Wrong Directory**
**Problem:** npm commands fail because you're in the wrong directory
```
npm error: Could not read package.json: Error: ENOENT: no such file or directory
```

**Solution:** Always run commands from the correct directory
```bash
# For backend (from mymoolah directory)
cd /Users/andremacbookpro/mymoolah
npm start

# For frontend (from mymoolah-wallet-frontend directory)
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend
npm run dev
```

## 🚀 **Automated Integration Script**

### **Using the Integration Script**
The `figma-integration.sh` script automates all common fixes:

```bash
# Run from mymoolah project root
cd /Users/andremacbookpro/mymoolah
./scripts/figma-integration.sh
```

### **What the Script Does:**
1. ✅ Stops all running servers
2. ✅ Cleans up temporary files
3. ✅ Fixes import statements (removes version numbers)
4. ✅ Fixes CSS configuration
5. ✅ Installs/updates dependencies
6. ✅ Initializes database
7. ✅ Starts both servers
8. ✅ Runs basic tests
9. ✅ Provides status report

## 📋 **Step-by-Step Manual Process**

### **Step 1: Prepare Environment**
```bash
# Navigate to project root
cd /Users/andremacbookpro/mymoolah

# Stop any running servers
pkill -f "vite"
pkill -f "node server.js"
pkill -f "npm run dev"
pkill -f "npm start"
sleep 3
```

### **Step 2: Fix Import Statements**
```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Remove version numbers from imports
find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*//g' {} \;

# Fix specific imports
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-slot@[^"]*"/@radix-ui\/react-slot"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-progress@[^"]*"/@radix-ui\/react-progress"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-tabs@[^"]*"/@radix-ui\/react-tabs"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-dialog@[^"]*"/@radix-ui\/react-dialog"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-label@[^"]*"/@radix-ui\/react-label"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-switch@[^"]*"/@radix-ui\/react-switch"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-separator@[^"]*"/@radix-ui\/react-separator"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/class-variance-authority@[^"]*"/class-variance-authority"/g' {} \;
find . -name "*.tsx" -exec sed -i '' 's/lucide-react@[^"]*"/lucide-react"/g' {} \;

# Fix Figma asset imports
find . -name "*.tsx" -exec sed -i '' 's/figma:asset\/[^"]*"/..\/src\/assets\/logo2.svg"/g' {} \;

cd ..
```

### **Step 3: Fix CSS Configuration**
```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Backup current CSS
cp src/styles/globals.css src/styles/globals.css.backup

# Create proper Tailwind configuration
cat > src/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF

cd ..
```

### **Step 4: Install Dependencies**
```bash
# Install frontend dependencies
cd mymoolah-wallet-frontend
npm install
cd ..

# Install backend dependencies
npm install
```

### **Step 5: Initialize Database**
```bash
# Initialize database
npm run init-db
```

### **Step 6: Start Servers**
```bash
# Start backend server
npm start &
sleep 5

# Start frontend server
cd mymoolah-wallet-frontend
npm run dev &
cd ..
```

### **Step 7: Test Servers**
```bash
# Test backend
curl http://localhost:5050/health

# Test frontend
curl http://localhost:3000
```

## 🔧 **Troubleshooting Commands**

### **Check Server Status**
```bash
# Check if servers are running
ps aux | grep -E "(vite|node server.js|npm)"

# Check ports in use
lsof -i :3000
lsof -i :3001
lsof -i :3002
lsof -i :5050
```

### **Kill All Servers**
```bash
# Kill all related processes
pkill -f "vite"
pkill -f "node server.js"
pkill -f "npm run dev"
pkill -f "npm start"
```

### **Check for Import Issues**
```bash
# Find files with version numbers in imports
find components/ui -name "*.tsx" -exec grep -l "@[0-9]" {} \;

# Find Figma asset imports
find . -name "*.tsx" -exec grep -l "figma:asset" {} \;
```

### **Database Operations**
```bash
# Check database
sqlite3 data/mymoolah.db ".tables"

# Check users
sqlite3 data/mymoolah.db "SELECT * FROM users;"
```

## 📊 **Integration Checklist**

### **Pre-Integration**
- [ ] Backup current working state
- [ ] Stop all running servers
- [ ] Clean up temporary files
- [ ] Check available disk space

### **During Integration**
- [ ] Copy new Figma files to appropriate directories
- [ ] Run automated integration script
- [ ] Check for import errors
- [ ] Verify CSS configuration
- [ ] Test component rendering

### **Post-Integration**
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Test all pages
- [ ] Verify logo display
- [ ] Check console for errors
- [ ] Test API endpoints
- [ ] Update documentation

## 🎯 **Best Practices**

### **1. Always Use the Automated Script**
```bash
./scripts/figma-integration.sh
```

### **2. Run Commands from Correct Directory**
```bash
# Backend commands from mymoolah directory
cd /Users/andremacbookpro/mymoolah

# Frontend commands from mymoolah-wallet-frontend directory
cd /Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend
```

### **3. Check Server Status Before Starting**
```bash
# Kill existing processes first
pkill -f "vite"
pkill -f "node server.js"
sleep 3
```

### **4. Test Incrementally**
```bash
# Test backend first
curl http://localhost:5050/health

# Then test frontend
curl http://localhost:3000
```

### **5. Keep Logs for Debugging**
```bash
# Save server logs
npm start > backend.log 2>&1 &
npm run dev > frontend.log 2>&1 &
```

## 🚨 **Emergency Recovery**

### **If Everything Fails**
```bash
# Complete reset
cd /Users/andremacbookpro/mymoolah

# Kill all processes
pkill -f "vite"
pkill -f "node"
pkill -f "npm"

# Clean install
rm -rf node_modules
rm -rf mymoolah-wallet-frontend/node_modules
npm install
cd mymoolah-wallet-frontend && npm install && cd ..

# Run integration script
./scripts/figma-integration.sh
```

## 📞 **Support Information**

### **Quick Reference**
- **Backend Server:** http://localhost:5050
- **Frontend Server:** http://localhost:3000 (or 3001/3002)
- **Database:** data/mymoolah.db
- **Integration Script:** scripts/figma-integration.sh

### **Common Error Messages**
- `ENOENT: Could not read package.json` → Wrong directory
- `Port 3000 is in use` → Kill existing processes
- `Failed to resolve import` → Fix import statements
- `@tailwind directives not found` → Fix CSS configuration

---

## 🤖 Figma AI Agent API Wiring

- Always refer to `FIGMA_API_WIRING.md` for the latest page-to-endpoint mapping and wiring instructions.
- Use only the documented endpoints for each page.
- If an endpoint is missing, request it from the backend team.

---

**Last Updated: July 31, 2025
**Status:** ✅ **ACTIVE**  
**Next Review:** July 27, 2025 