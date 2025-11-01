# Start Services in Codespaces - Step by Step

## 🚀 **STEP 1: START BACKEND (Port 3001)**

### **Open Terminal 1:**

1. Click the **"TERMINAL"** tab at the bottom
2. Or press: `Ctrl + ~` (or `Cmd + ~` on Mac)

### **Run these commands:**

```bash
# Navigate to project root
cd /workspaces/mymoolah-platform

# Start backend server
npm start
```

**What you'll see:**
- The server will start and show: `🚀 MyMoolah Treasury Platform HTTP Server running on port 3001`
- Port **3001** will automatically appear in the PORTS tab

---

## 🎨 **STEP 2: START FRONTEND (Port 3000)**

### **Open Terminal 2:**

1. In the terminal panel, click the **"+"** button (or split terminal icon)
2. This creates a new terminal tab

### **Run these commands:**

```bash
# Navigate to frontend directory
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend

# Start frontend server
npm run dev
```

**What you'll see:**
- Frontend will start and show: `VITE ready on port 3000`
- Port **3000** will automatically appear in the PORTS tab

---

## ✅ **STEP 3: CHECK PORTS TAB**

After both services start:

1. Click the **"PORTS"** tab (at the bottom)
2. You should now see:
   - **Port 3001** (backend) - Status: "Forwarded"
   - **Port 3000** (frontend) - Status: "Forwarded"

---

## 🌐 **STEP 4: MAKE PORTS PUBLIC**

For each port:

1. **Right-click** on port **3001** → **"Port Visibility"** → **"Public"**
2. **Right-click** on port **3000** → **"Port Visibility"** → **"Public"**

After making them public, you'll see:
- A **globe icon** 🌐 next to each port
- A **public URL** appears (e.g., `https://3001-xxx.app.github.dev`)

---

## 📋 **TROUBLESHOOTING**

### **If ports don't appear:**

1. **Check if services are running:**
   ```bash
   # Check backend
   lsof -i :3001
   
   # Check frontend
   lsof -i :3000
   ```

2. **If nothing shows, restart services:**
   - Press `Ctrl + C` in each terminal to stop
   - Run `npm start` (backend) and `npm run dev` (frontend) again

3. **Check for errors:**
   - Look for error messages in the terminal
   - Make sure dependencies are installed: `npm install`

### **If you see "port already in use":**

```bash
# Find what's using the port
lsof -i :3001
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID
```

---

## 🎯 **QUICK START COMMANDS**

**Copy and paste these in order:**

**Terminal 1:**
```bash
cd /workspaces/mymoolah-platform && npm start
```

**Terminal 2 (new terminal):**
```bash
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend && npm run dev
```

---

**Once both are running, go back to PORTS tab and you'll see them!** 🎉

