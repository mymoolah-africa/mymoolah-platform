# GitHub Codespaces Cost Optimization Guide

**Last Updated**: 2025-01-20  
**Purpose**: Reduce GitHub/Codespaces costs by identifying and removing unnecessary files

---

## 💰 **How GitHub/Codespaces Pricing Works**

### **Main Cost Drivers** (in order of impact):
1. **Compute Hours** (CPU/Memory usage) - **PRIMARY COST**
   - Charged per hour while Codespaces is running
   - Different machine types have different rates
   - **Tip**: Stop Codespaces when not in use (auto-stop after inactivity)

2. **Storage** (GB-month)
   - Charged per GB of storage used per month
   - Includes repository size + any stored data
   - **Tip**: Reduce repository size to save on storage costs

3. **Network Egress** (data transfer out)
   - Usually minimal unless transferring large amounts of data

### **Cost Optimization Strategy**:
- ✅ **Stop Codespaces when not in use** (biggest savings)
- ✅ **Reduce repository size** (remove large files from git history)
- ✅ **Use smaller machine types** when possible
- ✅ **Clean up old branches and commits**

---

## 🔍 **Commands to Find Large Files in Git**

Run these commands in your Codespaces terminal to identify optimization opportunities:

### **1. Check Current Repository Size**
```bash
# Show total repository size
du -sh .git

# Show detailed git repository statistics
git count-objects -vH

# Show repository size breakdown
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | awk '/^blob/ {print substr($0,6)}' | sort --numeric-sort --key=2 | tail -20
```

### **2. Find Largest Files in Git History**
```bash
# Find top 20 largest files in git history (most useful)
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --numeric-sort --key=2 | \
  tail -20

# Alternative: Find large files with file paths
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  sed -n 's/^blob //p' | \
  sort --numeric-sort --key=2 | \
  tail -20
```

### **3. Find Large Files in Working Directory** (not in .gitignore)
```bash
# Find files larger than 10MB in working directory
find . -type f -size +10M -not -path './.git/*' -not -path './node_modules/*' -not -path './backups/*' | sort -h

# Find files larger than 5MB
find . -type f -size +5M -not -path './.git/*' -not -path './node_modules/*' -not -path './backups/*' | sort -h

# Show file sizes in human-readable format
find . -type f -size +1M -not -path './.git/*' -not -path './node_modules/*' -not -path './backups/*' -exec ls -lh {} \; | awk '{print $5, $9}' | sort -h
```

### **4. Check for Large Binary Files**
```bash
# Find common binary file types that might be large
find . -type f \( -name "*.tar.gz" -o -name "*.zip" -o -name "*.pdf" -o -name "*.docx" -o -name "*.xlsx" -o -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -not -path './.git/*' -not -path './node_modules/*' -exec ls -lh {} \; | awk '{print $5, $9}' | sort -h
```

### **5. Check Git History for Large Commits**
```bash
# Show commits with largest changes
git log --all --pretty=format: --name-only --diff-filter=A | \
  sort | uniq -c | sort -rn | head -20

# Show largest commits by size
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --numeric-sort --key=2 --reverse | \
  head -20
```

### **6. Check for Duplicate Files in Git**
```bash
# Find duplicate files in git history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --key=3 --numeric-sort | \
  uniq -f 1 -d | \
  sort --key=2 --numeric-sort --reverse
```

### **7. Check Directory Sizes**
```bash
# Show directory sizes (excluding .git and node_modules)
du -sh */ 2>/dev/null | sort -h

# Show directory sizes including hidden directories
du -sh .[^.]* */ 2>/dev/null | sort -h
```

---

## 🧹 **Commands to Clean Up Repository**

### **⚠️ WARNING: These commands modify git history. Only run after reviewing what will be removed!**

### **1. Clean Up Git Repository (Safe)**
```bash
# Remove unreachable objects and optimize repository
git gc --aggressive --prune=now

# Show repository size after cleanup
git count-objects -vH
```

### **2. Remove Large Files from Git History (Advanced)**
```bash
# ⚠️ DANGEROUS: This rewrites git history
# Only use if you're sure you want to remove files from history
# This requires force push and will affect all collaborators

# Install git-filter-repo (if not available)
# pip install git-filter-repo

# Remove specific file from entire git history
# git filter-repo --path path/to/large/file --invert-paths

# Remove directory from entire git history
# git filter-repo --path backups/ --invert-paths
```

### **3. Clean Up Old Branches**
```bash
# List all branches
git branch -a

# Delete merged branches (safe)
git branch --merged | grep -v "\*\|main\|master" | xargs -n 1 git branch -d

# Delete remote branches that no longer exist
git remote prune origin
```

### **4. Clean Up Working Directory (Safe)**
```bash
# Remove files that should be in .gitignore but were committed
# First, check what would be removed:
git ls-files | grep -E "(node_modules|\.env|backups/|\.DS_Store)"

# Remove from git (but keep local files)
# git rm --cached -r node_modules/
# git rm --cached .env
# git rm --cached -r backups/
```

---

## 📊 **Quick Analysis Script**

Run this script to get a comprehensive overview:

```bash
#!/bin/bash
# Save as: analyze-repo-size.sh

echo "=== Repository Size Analysis ==="
echo ""
echo "1. Git Repository Size:"
du -sh .git
echo ""
echo "2. Git Object Statistics:"
git count-objects -vH
echo ""
echo "3. Top 10 Largest Files in Git History:"
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --numeric-sort --key=2 | \
  tail -10
echo ""
echo "4. Large Files in Working Directory (>5MB):"
find . -type f -size +5M -not -path './.git/*' -not -path './node_modules/*' -not -path './backups/*' -exec ls -lh {} \; 2>/dev/null | awk '{print $5, $9}' | sort -h
echo ""
echo "5. Directory Sizes:"
du -sh */ 2>/dev/null | sort -h | tail -10
echo ""
echo "=== Analysis Complete ==="
```

**To run the script:**
```bash
chmod +x analyze-repo-size.sh
./analyze-repo-size.sh
```

---

## 🎯 **Common Issues to Look For**

### **1. Backup Files in Git History**
- Check if `backups/` directory was ever committed
- Large `.tar.gz` files in git history
- Old backup archives

### **2. Binary Files**
- Large PDFs, images, or documents
- Compiled binaries
- Docker images or large archives

### **3. Dependencies**
- `node_modules/` accidentally committed
- Large package files
- Lock files (usually OK, but check size)

### **4. Old Branches**
- Merged branches that can be deleted
- Feature branches no longer needed

### **5. Large Documentation Files**
- Large markdown files with embedded images
- Documentation PDFs
- Old documentation versions

---

## ✅ **Recommended Actions**

### **Immediate (Safe to Run):**
1. ✅ Run repository analysis commands to identify large files
2. ✅ Run `git gc --aggressive --prune=now` to clean up loose objects
3. ✅ Delete old merged branches
4. ✅ Check if `backups/` directory is in git (should be in .gitignore)

### **After Review (Requires Care):**
1. ⚠️ Remove large files from git history (if found)
2. ⚠️ Update .gitignore to prevent future large file commits
3. ⚠️ Consider using Git LFS for necessary large files

---

## 📝 **Best Practices Going Forward**

1. **Always check .gitignore** before committing
2. **Never commit**:
   - `node_modules/`
   - `backups/`
   - `.env` files
   - Large binary files
   - System files (`.DS_Store`, etc.)

3. **Use Git LFS** for necessary large files (if needed)
4. **Stop Codespaces** when not in use (biggest cost savings)
5. **Use smaller machine types** when possible

---

## 🔗 **Additional Resources**

- [GitHub Codespaces Pricing](https://github.com/features/codespaces/pricing)
- [Git Large File Storage (LFS)](https://git-lfs.github.com/)
- [Git Best Practices](https://git-scm.com/book/en/v2)

---

## 📞 **Need Help?**

If you find large files that need to be removed from git history, I can help you:
1. Review the files to ensure they're safe to remove
2. Create a plan to remove them safely
3. Update .gitignore to prevent future issues
4. Document the cleanup process

