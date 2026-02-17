# MyMoolah API URLs - Official Reference

**Last Updated**: 2026-02-16  
**Status**: Production Reference  
**Classification**: Internal - API Configuration

---

## Overview

This document provides the official API base URLs for all MyMoolah Treasury Platform environments. These URLs are used for:
- EasyPay API integration
- Partner API integrations
- Frontend API configuration
- Testing and development

---

## Environment URLs

### Staging Environment

**Base URL**: `https://staging.mymoolah.africa`  
**API Base**: `https://staging.mymoolah.africa/api/v1`  
**Wallet UI**: `https://stagingwallet.mymoolah.africa`  
**Status**: ✅ Active  
**Purpose**: Pre-production testing and UAT  
**TLS**: TLS 1.3 enforced  
**Load Balancer**: Google Cloud HTTPS Load Balancer

**EasyPay Settlement Endpoints**:
- Top-up: `POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/topup/settlement`
- Cash-out: `POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/cashout/settlement`

---

### Production Environment

**Base URL**: `https://api-mm.mymoolah.africa`  
**API Base**: `https://api-mm.mymoolah.africa/api/v1`  
**Wallet UI**: `https://wallet.mymoolah.africa`  
**Status**: ✅ Active  
**Purpose**: Live production traffic  
**TLS**: TLS 1.3 enforced (cert-production-v4)  
**Load Balancer**: Google Cloud HTTPS Load Balancer

**Note**: Production uses `api-mm` (Afrihost 5-char subdomain requirement). Wallet uses `wallet.mymoolah.africa`.

**EasyPay Settlement Endpoints**:
- Top-up: `POST https://api-mm.mymoolah.africa/api/v1/vouchers/easypay/topup/settlement`
- Cash-out: `POST https://api-mm.mymoolah.africa/api/v1/vouchers/easypay/cashout/settlement`

---

### UAT Environment

**Base URL**: `https://staging.mymoolah.africa` (same as Staging)  
**API Base**: `https://staging.mymoolah.africa/api/v1`  
**Status**: ✅ Active  
**Purpose**: User Acceptance Testing  
**Note**: UAT and Staging currently share the same infrastructure

**EasyPay Settlement Endpoints**:
- Top-up: `POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/topup/settlement`
- Cash-out: `POST https://staging.mymoolah.africa/api/v1/vouchers/easypay/cashout/settlement`

---

### Development Environment (Local)

**Base URL**: `http://localhost:3001`  
**API Base**: `http://localhost:3001/api/v1`  
**Status**: ✅ Active (local development only)  
**Purpose**: Local development and testing  
**TLS**: Disabled (local only)

**EasyPay Settlement Endpoints**:
- Top-up: `POST http://localhost:3001/api/v1/vouchers/easypay/topup/settlement`
- Cash-out: `POST http://localhost:3001/api/v1/vouchers/easypay/cashout/settlement`

---

### Development Environment (Codespaces)

**Base URL**: `https://<your-codespace-url>-3001.app.github.dev`  
**API Base**: `https://<your-codespace-url>-3001.app.github.dev/api/v1`  
**Status**: ✅ Active (per Codespace)  
**Purpose**: Cloud-based development and testing  
**TLS**: Managed by GitHub Codespaces

**EasyPay Settlement Endpoints**:
- Top-up: `POST https://<your-codespace-url>-3001.app.github.dev/api/v1/vouchers/easypay/topup/settlement`
- Cash-out: `POST https://<your-codespace-url>-3001.app.github.dev/api/v1/vouchers/easypay/cashout/settlement`

---

## Environment Configuration

### Environment Variables

For EasyPay integration, configure the following environment variables:

```bash
# Staging/UAT
EASYPAY_API_BASE_URL=https://staging.mymoolah.africa/api/v1

# Production
EASYPAY_API_BASE_URL=https://api-mm.mymoolah.africa/api/v1

# Local Development
EASYPAY_API_BASE_URL=http://localhost:3001/api/v1
```

---

## DNS and Infrastructure

### Staging Infrastructure

- **Load Balancer**: Google Cloud HTTPS Load Balancer
- **Backend Service**: Cloud Run (staging service)
- **Frontend Service**: Cloud Run (staging-wallet service)
- **TLS Certificates**: Google-managed certificates
- **DNS**: Managed via Google Cloud DNS

### Production Infrastructure (Planned)

- **Load Balancer**: Google Cloud HTTPS Load Balancer
- **Backend Service**: Cloud Run (production service)
- **Frontend Service**: Cloud Run (production-wallet service)
- **TLS Certificates**: Google-managed certificates
- **DNS**: Managed via Google Cloud DNS

---

## Health Check Endpoints

All environments provide a health check endpoint:

- **Staging**: `GET https://staging.mymoolah.africa/health`
- **Production**: `GET https://api-mm.mymoolah.africa/health`
- **Local**: `GET http://localhost:3001/health`

---

## API Documentation

- **OpenAPI Spec**: Available at `/api/v1/docs` (when deployed)
- **API Documentation**: See `docs/API_DOCUMENTATION.md`
- **EasyPay Integration Guide**: See `docs/integrations/EasyPay_API_Integration_Guide.md`

---

## Support

For questions about API URLs or environment configuration:
- **Email**: support@mymoolah.africa
- **Technical Contact**: andre@mymoolah.africa

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial API URLs documentation created | MyMoolah Development Team |

---

**MyMoolah Treasury Platform**  
*Banking-Grade Financial Services Infrastructure*
