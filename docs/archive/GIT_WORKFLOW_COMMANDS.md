# Git Workflow Commands - MyMoolah Platform

**Repository**: mymoolah-platform  
**Codespace**: bug-free doodle  
**Date**: January 13, 2025

---

## 📋 **STANDARD WORKFLOW: COMMIT + PUSH (Single Command)**

```bash
cd /Users/andremacbookpro/mymoolah && \
git add . && \
git commit -m "YOUR_COMMIT_MESSAGE_HERE" && \
git push origin main
```

---

## 📋 **PULL IN CODESPACES (After Push)**

### **Option 1: Via Codespaces Terminal**
```bash
# In Codespaces terminal (you're already in /workspaces/mymoolah-platform):
git pull origin main
```

**Or if you need to change directory first:**
```bash
cd /workspaces/mymoolah-platform && \
git pull origin main
```

### **Option 2: Via GitHub Codespaces Web Interface**
1. Open Codespaces: https://github.com/mymoolah-africa/mymoolah-platform
2. Open terminal in Codespaces
3. Run:
```bash
git pull origin main
```

---

## 📋 **COMPLETE WORKFLOW (Local → GitHub → Codespaces)**

### **Step 1: Commit and Push (Local)**
```bash
cd /Users/andremacbookpro/mymoolah && \
git add . && \
git commit -m "YOUR_COMMIT_MESSAGE_HERE" && \
git push origin main
```

### **Step 2: Pull in Codespaces**
```bash
# In Codespaces terminal (you're already in /workspaces/mymoolah-platform):
git pull origin main
```

**Or if you need to change directory first:**
```bash
cd /workspaces/mymoolah-platform && \
git pull origin main
```

---

## 📋 **TEMPLATE FOR FUTURE COMMITS**

Replace `YOUR_COMMIT_MESSAGE_HERE` with your actual commit message:

```bash
cd /Users/andremacbookpro/mymoolah && \
git add . && \
git commit -m "YOUR_COMMIT_MESSAGE_HERE" && \
git push origin main
```

---

**Status**: ✅ **READY TO USE**

