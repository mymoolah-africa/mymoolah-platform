# MobileMart High-Volume Load Testing Guide

**Last Updated:** November 10, 2025  
**Status:** ✅ **Load Testing Script Ready**

---

## 🎯 **Overview**

The MobileMart load testing script (`scripts/test-mobilemart-load.js`) simulates high-volume transactions to test the performance and reliability of MobileMart purchase endpoints under various load conditions.

**Supported Purchase Types:**
- ✅ Airtime Pinless
- ✅ Airtime Pinned
- ✅ Data Pinless
- ✅ Data Pinned
- ✅ Voucher
- ✅ Utility

---

## 📋 **Usage**

### **Basic Usage**

```bash
# Test with 100 TPS for 60 seconds (mixed purchase types)
node scripts/test-mobilemart-load.js --tps 100 --duration 60 --type mixed

# Test with 500 TPS for 30 seconds (all purchase types)
node scripts/test-mobilemart-load.js --tps 500 --duration 30 --type all

# Test with 1000 TPS for 10 seconds (airtime pinless only)
node scripts/test-mobilemart-load.js --tps 1000 --duration 10 --type airtime-pinless
```

### **Command Line Options**

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--tps` | Transactions per second | 100 | `--tps 500` |
| `--duration` | Test duration in seconds | 60 | `--duration 30` |
| `--type` | Purchase type | `mixed` | `--type airtime-pinless` |
| `--max-transactions` | Maximum transactions (safety limit) | 10000 | `--max-transactions 5000` |
| `--warmup` | Warmup period in seconds | 5 | `--warmup 10` |

### **Purchase Types**

- `mixed` - Random selection of all 6 working purchase types (default)
- `all` - Test all 6 purchase types sequentially
- `airtime-pinless` - Airtime Pinless only
- `airtime-pinned` - Airtime Pinned only
- `data-pinless` - Data Pinless only
- `data-pinned` - Data Pinned only
- `voucher` - Voucher only
- `utility` - Utility only

---

## 🧪 **Test Scenarios**

### **Scenario 1: Low Volume (100 TPS)**
```bash
node scripts/test-mobilemart-load.js --tps 100 --duration 60 --type mixed
```
**Purpose:** Baseline performance testing  
**Expected:** Stable performance, low error rate

### **Scenario 2: Medium Volume (500 TPS)**
```bash
node scripts/test-mobilemart-load.js --tps 500 --duration 30 --type mixed
```
**Purpose:** Moderate load testing  
**Expected:** Slight latency increase, minimal errors

### **Scenario 3: High Volume (1000 TPS)**
```bash
node scripts/test-mobilemart-load.js --tps 1000 --duration 10 --type mixed
```
**Purpose:** Peak load testing  
**Expected:** Higher latency, potential rate limiting

### **Scenario 4: Single Type High Volume**
```bash
# Test airtime pinless at 1000 TPS
node scripts/test-mobilemart-load.js --tps 1000 --duration 10 --type airtime-pinless
```
**Purpose:** Single endpoint stress testing  
**Expected:** Endpoint-specific performance metrics

---

## 📊 **Metrics Reported**

### **Overall Statistics**
- Total transactions
- Successful transactions (count and percentage)
- Failed transactions (count and percentage)
- Actual TPS achieved
- Test duration

### **Latency Statistics**
- Minimum latency
- Maximum latency
- Average latency
- P50 (median) latency
- P95 latency
- P99 latency

### **Statistics by Purchase Type**
- Transaction count per type
- Success rate per type
- Average latency per type
- P95 latency per type
- P99 latency per type

### **Error Summary**
- Error types and counts
- Affected purchase types
- Error distribution

---

## ⚠️ **Important Notes**

### **1. UAT Environment Limitations** ⚠️ **CRITICAL**
- **UAT has strict rate limits that prevent load testing**
- **Rate limits trigger immediately at 100+ TPS**
- **Load testing in UAT is not feasible**
- **Recommendation: Perform load testing in production environment only**

### **2. Production Environment** ✅ **RECOMMENDED**
- **Load testing should be performed in production**
- **Production environment should have higher rate limits**
- **Coordinate with MobileMart before production load testing**
- **Use production credentials and test accounts**

### **2. Rate Limiting** ⚠️ **UAT LIMITATION**
- **UAT has strict rate limits that prevent load testing**
- **Rate limits trigger immediately at 100+ TPS**
- **Production environment should have higher rate limits**
- **Contact MobileMart support for production rate limit information**
- **See `UAT_RATE_LIMITING.md` for details**

### **3. Test Data**
- Uses valid UAT test mobile numbers:
  - Vodacom: `0720012345`
  - MTN: `0830012300`
  - CellC: `0840012300`
  - Telkom: `0850012345`
- Uses test utility meter: `12345678901`
- Uses test accounts for bill payment

### **4. Safety Limits**
- Default maximum transactions: 10,000
- Use `--max-transactions` to adjust
- Script includes warmup period (default 5 seconds)
- Graceful shutdown on Ctrl+C

### **5. Resource Usage**
- High TPS tests require significant network bandwidth
- Monitor system resources (CPU, memory, network)
- Consider running tests from multiple machines for very high TPS
- Allow time for pending transactions to complete

---

## 📈 **Performance Targets**

### **Expected Performance (UAT)**
- **Latency:** < 500ms (P95)
- **Success Rate:** > 95%
- **Error Rate:** < 5%
- **Throughput:** Should achieve target TPS

### **Performance Targets (Production)**
- **Latency:** < 200ms (P95)
- **Success Rate:** > 99%
- **Error Rate:** < 1%
- **Throughput:** 1000+ TPS capacity

---

## 🔍 **Troubleshooting**

### **High Error Rate**
- **Check rate limits:** Reduce TPS or contact MobileMart
- **Check network:** Verify stable network connection
- **Check authentication:** Verify credentials are valid
- **Check products:** Verify test products are available

### **Low Actual TPS**
- **Network latency:** Check network connection speed
- **API response time:** Monitor API response times
- **System resources:** Check CPU and memory usage
- **Rate limiting:** MobileMart may be rate limiting

### **High Latency**
- **Network issues:** Check network connection
- **API performance:** Monitor API response times
- **System resources:** Check system resource usage
- **Concurrent connections:** Reduce concurrent connections

### **Script Hangs**
- **Pending transactions:** Wait for pending transactions to complete
- **Network timeout:** Check network connectivity
- **API timeout:** Check API response times
- **System resources:** Check system resource usage

---

## 📝 **Example Output**

```
================================================================================
MOBILEMART HIGH-VOLUME LOAD TEST
================================================================================

⚠️  WARNING: This will generate 6000 transactions!
⚠️  Target TPS: 100, Duration: 60s, Type: mixed
ℹ️  Press Ctrl+C to stop early

================================================================================
Authentication
================================================================================

✅ Authentication successful! Token: eyJhbGciOiJSU0EtT0FF...

================================================================================
Fetching Test Products
================================================================================

✅ Found 7 airtime products
✅ Found 45 data products
✅ Found 8 voucher products
✅ Found 1 utility products

ℹ️  Warmup period: 5s
ℹ️  Warming up...
✅ Warmup complete

ℹ️  Starting load test at 2025-11-10T14:01:08.000Z
ℹ️  Target: 100 TPS for 60s

ℹ️  Starting 1 scheduler(s): 10ms interval, 1 transaction(s) per tick
ℹ️  Progress: 500 transactions | TPS: 98.5 | Success: 97.2% | Avg Latency: 245.3ms
ℹ️  Progress: 1000 transactions | TPS: 99.2 | Success: 96.8% | Avg Latency: 248.7ms
...

ℹ️  Waiting for pending transactions to complete...
ℹ️  Load test completed at 2025-11-10T14:02:08.000Z
ℹ️  Total transactions: 5942

================================================================================
LOAD TEST RESULTS
================================================================================

ℹ️  Test Configuration:
  Target TPS: 100
  Duration: 60s
  Type: mixed
  Max Transactions: 10000

--------------------------------------------------------------------------------
ℹ️  Overall Statistics:
  Total Transactions: 5942
  Successful: 5760 (96.94%)
  Failed: 182 (3.06%)
  Actual TPS: 99.03
  Duration: 60.00s

--------------------------------------------------------------------------------
ℹ️  Latency Statistics (ms):
  Min: 120.45ms
  Max: 1250.30ms
  Avg: 245.32ms
  P50: 230.15ms
  P95: 450.20ms
  P99: 680.50ms

--------------------------------------------------------------------------------
ℹ️  Statistics by Purchase Type:

  airtime-pinless:
    Total: 990
    Successful: 965 (97.47%)
    Failed: 25
    Avg Latency: 235.20ms
    P95 Latency: 420.15ms
    P99 Latency: 650.30ms

  data-pinless:
    Total: 988
    Successful: 960 (97.17%)
    Failed: 28
    Avg Latency: 240.50ms
    P95 Latency: 435.20ms
    P99 Latency: 665.40ms

...

================================================================================
```

---

## 🎯 **Next Steps**

1. **Baseline Testing:** Run 100 TPS test to establish baseline
2. **Scale Testing:** Gradually increase TPS (100 → 500 → 1000)
3. **Type Testing:** Test each purchase type individually
4. **Production Testing:** Run tests in production environment (when available)
5. **Performance Tuning:** Optimize based on test results

---

## 📚 **Related Documentation**

- `MOBILEMART_UAT_TEST_SUCCESS.md` - UAT test results
- `MOBILEMART_UAT_STATUS.md` - UAT integration status
- `test-mobilemart-purchases.js` - Single transaction test script

---

**Last Updated:** November 10, 2025  
**Status:** ✅ **Load Testing Script Ready for Production Use**  
**Note:** ⚠️ **UAT rate limits prevent load testing - use production environment**

