# MyMoolah Quick Fixes - Figma Integration

## 🚨 **Immediate Solutions**

### **Problem: Can't start servers**
```bash
# Kill all processes first
pkill -f "vite"
pkill -f "node server.js"
pkill -f "npm run dev"
pkill -f "npm start"
sleep 3

# Then start from correct directories
cd /Users/andremacbookpro/mymoolah
npm start &

cd mymoolah-wallet-frontend
npm run dev &
```

### **Problem: Import errors with version numbers**
```bash
cd mymoolah-wallet-frontend
find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*//g' {} \;
```

### **Problem: CSS Tailwind directives missing**
```bash
cd mymoolah-wallet-frontend
echo "@tailwind base;" > src/styles/globals.css
echo "@tailwind components;" >> src/styles/globals.css
echo "@tailwind utilities;" >> src/styles/globals.css
```

### **Problem: Figma asset imports failing**
```bash
cd mymoolah-wallet-frontend
find . -name "*.tsx" -exec sed -i '' 's/figma:asset\/[^"]*"/..\/src\/assets\/logo2.svg"/g' {} \;
```

## 🚀 **One-Command Solution**

**Use the automated script for all fixes:**
```bash
cd /Users/andremacbookpro/mymoolah
./scripts/figma-integration.sh
```

## 📍 **Directory Reference**

- **Backend commands:** `/Users/andremacbookpro/mymoolah`
- **Frontend commands:** `/Users/andremacbookpro/mymoolah/mymoolah-wallet-frontend`
- **Integration script:** `/Users/andremacbookpro/mymoolah/scripts/figma-integration.sh`

## 🔧 **Quick Commands**

```bash
# Check server status
curl http://localhost:5050/health
curl http://localhost:3000

# Kill all servers
pkill -f "vite" && pkill -f "node"

# Check for import issues
find components/ui -name "*.tsx" -exec grep -l "@[0-9]" {} \;

# Test database
sqlite3 data/mymoolah.db ".tables"
```

## 🎯 **Success Indicators**

✅ Backend responds: `curl http://localhost:5050/health`  
✅ Frontend loads: `curl http://localhost:3000`  
✅ No import errors in console  
✅ Logo displays on login page  
✅ All UI components render properly  

---

**Last Updated:** July 20, 2025  
**Emergency Contact:** Run `./scripts/figma-integration.sh` 