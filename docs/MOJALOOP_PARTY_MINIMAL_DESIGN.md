# Mojaloop Party (FSPIOP) - Minimal Readiness Design

Last Updated: 2025-12-02

## Objectives
- Provide Party Information Service compatibility for MSISDN lookups in E.164.
- Prepare for interop by standardizing identifiers and headers.

## Data Model (Minimal)
`party_information` (new)
- id SERIAL PK
- partyIdType TEXT NOT NULL CHECK (partyIdType IN ('MSISDN'))
- partyIdValue TEXT NOT NULL -- E.164 (+27XXXXXXXXX), unique
- fspId TEXT NOT NULL DEFAULT 'mymoolah'
- currency TEXT NOT NULL DEFAULT 'ZAR'
- userId INTEGER REFERENCES users(id) ON DELETE SET NULL
- createdAt, updatedAt

Unique index: (partyIdType, partyIdValue)

## Endpoints (Minimal)
GET /parties/{Type}/{ID}
- Type: MSISDN
- ID: URL-encoded E.164 (e.g. +27825571234)
- Headers: FSPIOP-Source, FSPIOP-Destination, Date, Content-Type
- Response: 200 with party info or 404 with error body

PUT /parties/{Type}/{ID}
- Update party info (internal shadow)

GET /parties/{Type}/{ID}/error
- Standard error callback shape

## Validation
- Accept only E.164 for MSISDN (normalize incoming query)
- Return consistent error codes and bodies per FSPIOP

## Mapping
- partyIdValue (+27...) ↔ users.phoneNumber (E.164)
- partyIdValue (+27...) ↔ beneficiaries.msisdn (E.164)

## Next Steps
1. Create model & migration for `party_information`
2. Implement routes under `/fspiop/parties`
3. Add FSPIOP header middleware and signature stub
4. Integration tests (lookup success, not found, invalid format)

