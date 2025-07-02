# Git Sync Workflow: Codespaces & Local Development

This guide ensures your Codespaces (cloud) and local development environments stay perfectly in sync using Git.

---

## Codespaces (CS) Sync Process

**Whenever you start working in Codespaces:**

```sh
# 1. Go to your project directory
cd ~/workspaces/mymoolah-platform

# 2. Pull the latest changes from GitHub
git pull origin main

# 3. Do your work: create/edit files, etc.

# 4. Check the status of your changes
git status

# 5. Stage all changes
git add .

# 6. Commit your changes with a descriptive message
git commit -m "Describe your changes"

# 7. Push your changes to GitHub
git push origin main
```

---

## Local Drive Sync Process

**Whenever you start working on your local machine:**

```sh
# 1. Go to your project directory
cd ~/mymoolah

# 2. Pull the latest changes from GitHub
git pull origin main

# 3. Do your work: create/edit files, etc.

# 4. Check the status of your changes
git status

# 5. Stage all changes
git add .

# 6. Commit your changes with a descriptive message
git commit -m "Describe your changes"

# 7. Push your changes to GitHub
git push origin main
```

---

## Key Reminders
- **Always run `git pull origin main` before starting work in either environment.**
- **Always run `git push origin main` after you finish your work.**
- If you see a merge conflict, resolve it, then repeat the add/commit/push steps.
- Only files tracked by git (not in `.gitignore`) will sync.

---

## Summary Table

| Step                | Codespaces Command Example                | Local Command Example         |
|---------------------|-------------------------------------------|------------------------------|
| Go to project dir   | `cd ~/workspaces/mymoolah-platform`       | `cd ~/mymoolah`              |
| Pull latest         | `git pull origin main`                    | `git pull origin main`       |
| Work                | (edit/create files)                       | (edit/create files)          |
| Check status        | `git status`                              | `git status`                 |
| Stage changes       | `git add .`                               | `git add .`                  |
| Commit              | `git commit -m "Your message"`            | `git commit -m "Your message"`|
| Push                | `git push origin main`                    | `git push origin main`       |

---

**Keep this file handy for reference and share with your team!** 