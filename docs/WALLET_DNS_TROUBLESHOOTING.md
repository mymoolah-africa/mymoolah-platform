# wallet.mymoolah.africa Not Loading - Troubleshooting

## Root Cause
- **wallet.mymoolah.africa** was resolving to `102.222.124.11` (old server with expired SSL cert)
- **Correct IP**: `34.128.163.17` (Google Cloud Load Balancer)

## Fixes in Afrihost

### 1. Ensure wallet record is saved
- Edit Record for `wallet.mymoolah.africa` → IP: `34.128.163.17`
- Click **Update** to save

### 2. Wildcard conflict
- `*.mymoolah.africa` → `102.222.124.11` can override specific records
- **Option A**: Delete the wildcard `*.mymoolah.africa` if not needed
- **Option B**: Ensure `wallet` and `api-mm` A records exist and are saved (specific records override wildcard)

### 3. Lower TTL for faster propagation
- Change TTL from 28800 to 300 (5 min) temporarily
- After propagation, set back to 28800

## Verify DNS (after update)
```bash
dig wallet.mymoolah.africa +short
# Should show: 34.128.163.17
```

## Flush local DNS cache (macOS)
```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

## Test
- Try https://wallet.mymoolah.africa in incognito or different device
- Or: `curl -I https://wallet.mymoolah.africa` (should return 200, not SSL error)
