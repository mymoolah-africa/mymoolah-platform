# How to Update Secret Manager Password - Step by Step

## ✅ Correct Way to Update Secret Manager

After resetting the password in Cloud Console UI, follow these steps:

### Step 1: Set Password as Variable (Recommended)

```bash
# Set your password as a variable (replace with actual password from Cloud Console)
NEW_PASSWORD="paste-your-password-here"

# Update Secret Manager using the variable
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-
```

**Example with real password:**

```bash
# If your password is: FwjzW2w8TgxWQgw6HEttOStkf5e6OSjEBBUwFQlvIfJmgV1F1r4proUqDmZ0to
NEW_PASSWORD="FwjzW2w8TgxWQgw6HEttOStkf5e6OSjEBBUwFQlvIfJmgV1F1r4proUqDmZ0to"

echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-
```

### Step 2: Direct Method (Alternative)

If your password doesn't have special characters, you can use it directly:

```bash
# Replace the password inside the quotes with your actual password
echo -n "FwjzW2w8TgxWQgw6HEttOStkf5e6OSjEBBUwFQlvIfJmgV1F1r4proUqDmZ0to" | \
  gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-
```

## 📝 Important Points

1. **YES, replace the placeholder** - Use your actual password from Cloud Console
2. **YES, keep the quotes** when setting a variable: `NEW_PASSWORD="your-password"`
3. **YES, keep the quotes** in direct method: `echo -n "your-password"`
4. **NO quotes needed** around the variable name: Use `$NEW_PASSWORD` not `"$NEW_PASSWORD"` when piping

## ⚠️ Password with Special Characters

If your password contains special characters like `$`, `` ` ``, `\`, `"`, etc., always use the variable method:

```bash
NEW_PASSWORD='your-password-with-$pecial-chars'
echo -n "$NEW_PASSWORD" | gcloud secrets versions add db-mmtp-pg-staging-password \
  --project=mymoolah-db \
  --data-file=-
```

## 🔍 Verify the Update

After updating, verify the password was saved correctly:

```bash
# Check password length matches
gcloud secrets versions access latest \
  --secret="db-mmtp-pg-staging-password" \
  --project="mymoolah-db" | wc -c
```

The character count should match your password length (plus 1 for newline, which is why we use `echo -n` to prevent it).
