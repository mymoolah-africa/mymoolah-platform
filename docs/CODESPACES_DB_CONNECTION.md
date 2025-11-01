# Database Connection - Codespaces Setup

## ✅ **CONNECTION DETAILS**

**Database**: `mymoolah` (existing - for development)
**Public IP**: `34.35.84.201`
**Port**: `5432`
**Password**: `B0t3s@Mymoolah`

---

## 📋 **STEP 1: UPDATE .env FILE**

**In Codespaces**:

1. Open `.env` file (in main project folder)

2. Find the line:
   ```
   DATABASE_URL=postgres://mymoolah_app:AppPass_1755005621204_ChangeMe@127.0.0.1:5433/mymoolah
   ```

3. Replace it with:
   ```
   DATABASE_URL=postgres://mymoolah_app:B0t3s@Mymoolah@34.35.84.201:5432/mymoolah
   ```

**Important**: Make sure the password has no spaces and matches exactly: `B0t3s@Mymoolah`

---

## 📋 **STEP 2: CHECK DATABASE USER**

**Question**: Is the database user `mymoolah_app` correct?

If you're not sure, we can check or use a different user. For now, let's try with `mymoolah_app`.

---

## 📋 **STEP 3: SAVE AND RESTART**

After updating `.env`:

1. **Save the file** (`Ctrl + S` or `Cmd + S`)

2. **Restart backend server**:
   - Go to terminal where backend is running
   - Press `Ctrl + C` to stop
   - Run: `npm start`

3. **Watch for errors**:
   - Do you see database connection errors?
   - Or does it connect successfully?

---

## 📋 **STEP 4: TEST CONNECTION**

After restart, try logging in again in your browser.

**Tell me**:
- Does login work now?
- Or do you still see database errors?

---

**Once you update the .env file and restart, let me know what happens!** 🚀

