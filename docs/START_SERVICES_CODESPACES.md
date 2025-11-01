# Start Services in Codespaces

Backend (auto-starts on open via postStart). Manual fallback:
```
cd /workspaces/mymoolah-platform
npm run start:cs-ip
```

Frontend:
```
cd /workspaces/mymoolah-platform/mymoolah-wallet-frontend
npm run dev  # port 3000
```

Set `CORS_ORIGINS` in backend `.env` to your 3000 forwarded URL.
Set `VITE_API_BASE_URL` in frontend `.env.local` to your backend forwarded host.
