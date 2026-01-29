# Git Sync Workflow: Codespaces & Local Development

This guide ensures your Codespaces (cloud) and local development environments stay perfectly in sync using Git.

---

## 🔄 **OFFICIAL SYNC WORKFLOW**

To maintain consistency and avoid "stale file" issues, always follow this sequence:

### **1. Local Development (Mac)**
**Whenever you start working on your local machine:**

```sh
# 1. Go to your project directory
cd ~/mymoolah

# 2. Check for uncommitted changes
git status

# 3. Pull the latest changes from GitHub
git pull origin main

# 4. Do your work: create/edit files, etc.

# 5. Commit your changes
git add .
git commit -m "feat: your descriptive message"

# 6. Push to GitHub
git push origin main
```

### **2. Codespaces (CS) Sync**
**Switch to Codespaces for testing and deployment:**

```sh
# 1. Go to your project directory
cd /workspaces/mymoolah-platform

# 2. Pull the latest changes from local push
git pull origin main

# 3. Run Tests (MANDATORY)
npm test

# 4. Deploy to Staging (if tests pass)
# (Follow deployment guide)
```

---

## ⚠️ **KEY REMINDERS**

- **GitHub is Source of Truth**: Always push from Local and pull in Codespaces.
- **Never Pull with Dirty Tree**: Always commit or stash your local changes before running `git pull`.
- **Test in CS Only**: Local environment setup may differ; Codespaces is the definitive testing environment.
- **No Worktrees**: Work only in the main repository path to avoid agent confusion.

---

## 📋 **SUMMARY TABLE**

| Step | Action | Command |
| :--- | :--- | :--- |
| **1** | Start Work (Local) | `git pull origin main` |
| **2** | Develop (Local) | (edit files) |
| **3** | Save Work (Local) | `git add . && git commit -m "..."` |
| **4** | Sync to Cloud | `git push origin main` |
| **5** | Switch to CS | `git pull origin main` |
| **6** | Verify (CS) | `npm test` |

---

**Keep this workflow consistent to ensure banking-grade reliability.**
