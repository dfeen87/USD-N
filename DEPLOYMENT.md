# USD-N Production Deployment Checklist

## Pre-Deployment

- [ ] Review all code changes
- [ ] Run tests: `npm test`
- [ ] Build project: `npm run build`
- [ ] Test production server locally: `npm run start:prod`
- [ ] Test all API endpoints
- [ ] Review security settings
- [ ] Update version number if needed
- [ ] Review and update documentation

## Environment Configuration

- [ ] Copy `.env.example` to `.env`
- [ ] Set `USDN_ENV=production`
- [ ] Set `USDN_LOG_LEVEL=info` (or `warn` for less verbose logging)
- [ ] Generate and set `USDN_JWT_SECRET` (if authentication needed):
  ```bash
  openssl rand -base64 32
  ```
- [ ] Set unique `USDN_NODE_ID` for this deployment
- [ ] Configure `PORT` if not using default 8080

## Docker Deployment

### Build Docker Image
```bash
docker build -t usd-n-api:latest .
```

### Test Docker Image Locally
```bash
docker run -p 8080:8080 \
  -e USDN_ENV=production \
  -e USDN_LOG_LEVEL=info \
  usd-n-api:latest
```

### Verify Health Check
```bash
curl http://localhost:8080/api/health
```

## Railway Deployment

### Initial Setup
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Environment Variables
```bash
railway variables set USDN_ENV=production
railway variables set USDN_LOG_LEVEL=info
railway variables set USDN_NODE_ID=railway-prod-1

# Optional: Enable authentication
railway variables set USDN_JWT_SECRET=your-secret-here
```

### Verify Deployment
```bash
# View logs
railway logs

# Get deployment URL
railway status

# Test health endpoint
curl https://your-app.railway.app/api/health
```

## Post-Deployment Verification

- [ ] Health check returns 200 OK
- [ ] Status endpoint shows correct version
- [ ] All API endpoints respond correctly
- [ ] Rate limiting is working (test with rapid requests)
- [ ] CORS headers are present
- [ ] Error responses don't leak sensitive information
- [ ] Logs are being generated correctly
- [ ] Authentication works (if enabled)

### Test Commands
```bash
# Set your deployment URL
export API_URL=https://your-app.railway.app

# Health check
curl $API_URL/api/health

# Status check
curl $API_URL/api/status

# Test read endpoint
curl $API_URL/api/ledger/state

# Test FIDES score
curl $API_URL/api/fides/score

# Test BTC backing
curl $API_URL/api/btc/backing

# Test write endpoint (with auth if enabled)
curl -X POST $API_URL/api/ledger/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": "100000", "memo": "Test"}'
```

## Monitoring

- [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- [ ] Configure alerts for downtime
- [ ] Monitor rate limiting logs
- [ ] Monitor error rates
- [ ] Track API response times
- [ ] Review logs regularly

### Railway Monitoring
```bash
# View live logs
railway logs --follow

# Check deployment status
railway status

# View environment variables
railway variables
```

## Security Checklist

- [ ] JWT authentication enabled for production (recommended)
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Secrets not committed to repository
- [ ] Rate limiting configured appropriately
- [ ] CORS settings reviewed
- [ ] Input validation working on all endpoints
- [ ] Error messages don't expose sensitive data
- [ ] Dependencies up to date
- [ ] CodeQL security scan passed

## Scaling Considerations

For high-traffic deployments:

- [ ] Deploy multiple instances behind load balancer
- [ ] Consider adding Redis for rate limiting across instances
- [ ] Add database persistence for ledger state
- [ ] Implement proper session management
- [ ] Add request logging and analytics
- [ ] Configure auto-scaling rules
- [ ] Set up CDN for static assets

## Rollback Plan

If issues are detected:

### Railway
```bash
# Rollback to previous deployment
railway rollback

# Or redeploy specific version
railway up --detach
```

### Docker
```bash
# Stop current container
docker stop <container-id>

# Run previous version
docker run -p 8080:8080 usd-n-api:previous-tag
```

## Documentation Updates

- [ ] Update README.md with deployment URL
- [ ] Update API_PRODUCTION.md if endpoints changed
- [ ] Update OpenAPI spec if needed
- [ ] Document any custom configuration
- [ ] Update CHANGELOG.md

## Support

For issues or questions:
- Review API documentation: `API_PRODUCTION.md`
- Check Railway logs: `railway logs`
- Review Docker logs: `docker logs <container-id>`
- Run local tests: `npm test`
- Test API: `node examples/production_api_test.js`

---

**Remember:** Always test thoroughly before deploying to production!
