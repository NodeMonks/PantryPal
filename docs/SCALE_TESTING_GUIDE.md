# 📊 PantryPal - Scale Testing & Load Testing Guide

**Production Domain**: https://nodemonks-pantrypal.onrender.com  
**Last Updated**: January 4, 2026  
**Status**: Ready for Scale Testing

---

## 🎯 Performance Targets

### Response Times
- **p50 (median)**: < 100ms
- **p95**: < 200ms
- **p99**: < 500ms
- **p99.9**: < 1000ms

### Throughput
- **Concurrent Users**: 1000+
- **Requests/Second**: 100+
- **Database Connections**: 20 max (pooled)

### Reliability
- **Uptime**: > 99.9%
- **Error Rate**: < 0.1%
- **Zero Data Loss**: 100%

---

## 🧪 Load Testing Scenarios

### 1. User Registration Flow (Payment → Org Creation)

**Scenario**: New users subscribing and creating organizations

```javascript
// Load test with k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  // 1. Create subscription
  const subscriptionRes = http.post(
    'https://nodemonks-pantrypal.onrender.com/api/payments/create-subscription',
    JSON.stringify({ plan: 'starter-monthly' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(subscriptionRes, {
    'subscription created': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
  
  // 2. Register organization (with valid token)
  // ... additional steps
}
```

### 2. Product Management (CRUD Operations)

**Test**: Bulk product creation, updates, and queries

```bash
# Artillery test
artillery quick --count 100 --num 1000 \
  https://nodemonks-pantrypal.onrender.com/api/products
```

**Expected Results**:
- p95 < 200ms
- Success rate > 99%
- No database connection errors

### 3. Billing Workflow (High Volume)

**Scenario**: Multiple stores creating bills simultaneously

```javascript
// Concurrent bill creation
for (let i = 0; i < 100; i++) {
  const billRes = http.post(
    `${BASE_URL}/api/bills`,
    JSON.stringify({
      customerId: randomCustomer(),
      items: randomItems(5),
      paymentMethod: 'cash'
    }),
    { headers: authHeaders }
  );
  
  check(billRes, {
    'bill created': (r) => r.status === 201,
    'response time < 300ms': (r) => r.timings.duration < 300,
  });
}
```

### 4. Multi-Tenant Isolation Test

**Test**: Verify org-scoped data isolation under load

```javascript
// Create 50 organizations
// Each org creates 100 products
// Query products for each org
// Verify: No data leakage between orgs

export default function () {
  const orgId = getRandomOrg();
  const products = http.get(
    `${BASE_URL}/api/products?org_id=${orgId}`,
    { headers: authHeaders }
  );
  
  check(products, {
    'only org products returned': (r) => {
      const data = JSON.parse(r.body);
      return data.every(p => p.org_id === orgId);
    },
  });
}
```

---

## 🔥 Stress Testing

### Database Connection Pool Stress

**Test**: Exhaust connection pool and verify graceful handling

```bash
# Simulate 100 concurrent users with 20 connection limit
k6 run --vus 100 --duration 5m stress-test.js
```

**Expected Behavior**:
- Requests queue when pool is full
- No crashed connections
- Graceful error messages (503 Service Unavailable)
- Recovery when load decreases

### Memory Leak Test

**Test**: Long-running server (24 hours) under moderate load

```bash
# Monitor memory usage over time
node --expose-gc --max-old-space-size=512 dist/index.js

# Monitor with:
watch -n 5 'ps aux | grep node'
```

**Success Criteria**:
- Memory stays < 512MB
- No continuous memory growth
- Garbage collection working

### Rate Limiting Test

**Test**: Verify rate limits protect against abuse

```bash
# Send 100 requests in 10 seconds (exceeds 50/15min limit)
for i in {1..100}; do
  curl -X POST https://nodemonks-pantrypal.onrender.com/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  sleep 0.1
done
```

**Expected**: 429 Too Many Requests after 50 requests

---

## 📊 Monitoring During Load Tests

### Key Metrics to Track

#### Application Metrics
```bash
# Response time distribution
p50, p95, p99, p99.9

# Error rates
4xx errors, 5xx errors

# Throughput
requests per second

# Concurrent connections
active connections to database
```

#### Database Metrics (Neon Dashboard)
```bash
# Connection pool
active connections / max connections

# Query performance
slow queries (> 300ms)
query throughput

# Resource usage
CPU usage
RAM usage
```

#### System Metrics
```bash
# Server resources
CPU: < 70%
Memory: < 512MB
Network I/O: < 100Mbps
```

### Monitoring Tools

#### Real-Time Monitoring
```bash
# Application logs
tail -f logs/production.log | grep ERROR

# Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Memory usage
watch -n 2 'free -m'
```

#### Neon Dashboard
- Navigate to: https://console.neon.tech/
- Monitor:
  - Query latency
  - Connection count
  - Autoscaling events
  - Storage usage

---

## 🎬 Load Testing Tools

### 1. k6 (Recommended)

**Installation**:
```bash
# Windows (Chocolatey)
choco install k6

# Or download from: https://k6.io/
```

**Basic Test**:
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 50,        // 50 virtual users
  duration: '5m', // Run for 5 minutes
};

export default function () {
  const res = http.get('https://nodemonks-pantrypal.onrender.com/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

**Run**:
```bash
k6 run load-test.js
```

### 2. Artillery

**Installation**:
```bash
npm install -g artillery
```

**Quick Test**:
```bash
artillery quick --count 100 --num 1000 \
  https://nodemonks-pantrypal.onrender.com/api/products
```

### 3. Apache Bench (ab)

**Simple Load Test**:
```bash
ab -n 1000 -c 50 https://nodemonks-pantrypal.onrender.com/health
```
- `-n 1000`: Total 1000 requests
- `-c 50`: 50 concurrent requests

### 4. Postman Runner

**GUI-based testing**:
1. Create collection with API requests
2. Use Collection Runner
3. Set iterations and delay
4. Export results

---

## 📈 Optimization Tips

### If Response Times Are Slow

#### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE n_distinct > 100 AND correlation < 0.1;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_name ON table(column);
```

#### Application Optimization
```typescript
// Use connection pooling
const pool = new Pool({ max: 20 });

// Cache frequently accessed data
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 });

// Implement pagination
const products = await db.query()
  .limit(50)
  .offset(page * 50);
```

### If Database Connections Exhausted

```typescript
// Increase pool size (if needed)
const pool = new Pool({
  max: 30, // Increase from 20
  idleTimeoutMillis: 20_000, // Reduce idle time
});

// Implement connection retry
async function queryWithRetry(query, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await db.query(query);
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}
```

### If Memory Usage High

```bash
# Enable garbage collection monitoring
node --expose-gc --trace-gc dist/index.js

# Optimize memory usage
- Avoid storing large objects in memory
- Use streams for large files
- Clear caches periodically
- Close database connections properly
```

---

## 🚨 Failure Scenarios

### Test Failure Handling

#### 1. Database Unavailable
```typescript
// Expected behavior:
- Health check fails: /health returns 503
- Requests return 500 with "Database unavailable"
- Application logs errors but doesn't crash
- Automatic reconnection when DB is back
```

#### 2. Payment Gateway Down
```typescript
// Expected behavior:
- Razorpay errors are caught
- Users see "Payment service unavailable"
- No partial registrations created
- Retry logic implemented
```

#### 3. High Load (DDoS Simulation)
```bash
# Test with 1000 concurrent requests
k6 run --vus 1000 --duration 1m stress-test.js

# Expected behavior:
- Rate limiting kicks in (429 responses)
- Server stays responsive
- No crashes
- Recovery after load decreases
```

---

## ✅ Scale Testing Checklist

### Pre-Testing
- [ ] Production environment configured
- [ ] Database migrations applied
- [ ] Monitoring tools set up
- [ ] Baseline metrics recorded
- [ ] Backup plan ready

### During Testing
- [ ] Monitor CPU usage
- [ ] Monitor memory usage
- [ ] Track database connections
- [ ] Log slow queries
- [ ] Record error rates

### Post-Testing
- [ ] Analyze results
- [ ] Identify bottlenecks
- [ ] Document optimizations
- [ ] Re-test after changes
- [ ] Update capacity plan

---

## 📊 Expected Results (Baseline)

### Current Configuration
- **Instance**: Render Starter Plan
- **Database**: Neon Serverless (Free Tier)
- **Connection Pool**: 20 connections
- **Rate Limit**: 50 req/15min

### Performance Benchmarks
```
Scenario              | Target | Current | Status
-------------------------------------------------
Health Check (p95)    | 50ms   | TBD     | ⏳
Login Flow (p95)      | 200ms  | TBD     | ⏳
Product List (p95)    | 150ms  | TBD     | ⏳
Bill Creation (p95)   | 300ms  | TBD     | ⏳
Concurrent Users      | 100    | TBD     | ⏳
Database Connections  | 20     | TBD     | ⏳
Error Rate            | <0.1%  | TBD     | ⏳
```

---

## 🎯 Next Steps

1. **Run Initial Load Test**:
   ```bash
   k6 run --vus 10 --duration 2m load-test.js
   ```

2. **Analyze Results**:
   - Check response times
   - Identify slow endpoints
   - Review error logs

3. **Optimize Bottlenecks**:
   - Add missing indexes
   - Optimize queries
   - Increase pool size (if needed)

4. **Re-Test**:
   - Increase load gradually
   - Verify improvements
   - Document results

5. **Scale Up** (if needed):
   - Upgrade Render plan
   - Increase Neon tier
   - Add caching layer (Redis)

---

## 📚 Additional Resources

- **k6 Documentation**: https://k6.io/docs/
- **Artillery Guide**: https://artillery.io/docs/
- **Neon Performance**: https://neon.tech/docs/introduction/performance
- **PostgreSQL Optimization**: https://www.postgresql.org/docs/current/performance-tips.html

---

**Status**: Ready for scale testing  
**Next Action**: Run initial load tests  
**Owner**: DevOps / Engineering Team

---

*Updated: January 4, 2026*  
*Version: 1.0.0*
