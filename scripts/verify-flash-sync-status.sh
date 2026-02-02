#!/bin/bash

# Verify Flash Product Sync Status
# Checks Flash products and variants in both UAT and Staging

echo ""
echo "🔍 FLASH PRODUCT SYNC STATUS"
echo "================================================"
echo ""

# Get Staging password
export STAGING_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db)

echo "📊 UAT Database (Port 6543):"
echo "================================================"

# UAT Products
PGPASSWORD='B0t3s@Mymoolah' psql -h 127.0.0.1 -p 6543 -U mymoolah_app -d mymoolah -t -c "
SELECT 
  COUNT(*) as count,
  'Flash Products' as metric
FROM products p
JOIN suppliers s ON p.\"supplierId\" = s.id
WHERE s.code = 'FLASH'
UNION ALL
SELECT 
  COUNT(*) as count,
  'Flash ProductVariants' as metric
FROM product_variants pv
JOIN suppliers s ON pv.\"supplierId\" = s.id
WHERE s.code = 'FLASH';
" | grep -v "^$"

echo ""
echo "📊 Staging Database (Port 6544):"
echo "================================================"

# Staging Products
PGPASSWORD=$STAGING_PASSWORD psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -t -c "
SELECT 
  COUNT(*) as count,
  'Flash Products' as metric
FROM products p
JOIN suppliers s ON p.\"supplierId\" = s.id
WHERE s.code = 'FLASH'
UNION ALL
SELECT 
  COUNT(*) as count,
  'Flash ProductVariants' as metric  
FROM product_variants pv
JOIN suppliers s ON pv.\"supplierId\" = s.id
WHERE s.code = 'FLASH';
" | grep -v "^$"

echo ""
echo "================================================"
echo "✅ Verification complete"
echo ""
