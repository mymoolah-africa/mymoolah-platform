#!/bin/bash

# Diagnose Bolt Gift Card Issue
# Check detailed status of Bolt Gift Card in both databases

echo ""
echo "🔍 BOLT GIFT CARD DIAGNOSTIC"
echo "================================================"
echo ""

# Get Staging password
export STAGING_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db)

echo "📊 UAT Database - Bolt Gift Card Details:"
echo "================================================"
PGPASSWORD='B0t3s@Mymoolah' psql -h 127.0.0.1 -p 6543 -U mymoolah_app -d mymoolah -c "
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.type,
  p.status as product_status,
  COUNT(pv.id) as variant_count
FROM products p
JOIN suppliers s ON p.\"supplierId\" = s.id
LEFT JOIN product_variants pv ON pv.\"productId\" = p.id AND pv.\"supplierId\" = s.id
WHERE s.code = 'FLASH' AND p.name LIKE '%Bolt%'
GROUP BY p.id, p.name, p.type, p.status
ORDER BY p.name;
"

echo ""
echo "📊 Staging Database - Bolt Gift Card Details:"
echo "================================================"
PGPASSWORD=$STAGING_PASSWORD psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.type,
  p.status as product_status,
  COUNT(pv.id) as variant_count
FROM products p
JOIN suppliers s ON p.\"supplierId\" = s.id
LEFT JOIN product_variants pv ON pv.\"productId\" = p.id AND pv.\"supplierId\" = s.id
WHERE s.code = 'FLASH' AND p.name LIKE '%Bolt%'
GROUP BY p.id, p.name, p.type, p.status
ORDER BY p.name;
"

echo ""
echo "🔍 Check for Duplicate ProductVariants in Staging:"
echo "================================================"
PGPASSWORD=$STAGING_PASSWORD psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "
SELECT 
  pv.\"productId\",
  p.name,
  pv.\"supplierId\",
  pv.provider,
  COUNT(*) as duplicate_count
FROM product_variants pv
JOIN products p ON pv.\"productId\" = p.id
JOIN suppliers s ON pv.\"supplierId\" = s.id
WHERE s.code = 'FLASH' AND p.name LIKE '%Bolt%'
GROUP BY pv.\"productId\", p.name, pv.\"supplierId\", pv.provider
HAVING COUNT(*) > 1;
"

echo ""
echo "================================================"
echo "✅ Diagnostic complete"
echo ""
