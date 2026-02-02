#!/bin/bash

# Find Missing Flash Product in Staging
# Compares Flash products between UAT and Staging to identify the missing one

echo ""
echo "🔍 Finding Missing Flash Product in Staging"
echo "================================================"
echo ""

# Get Staging password
export STAGING_PASSWORD=$(gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db)

# Get UAT Flash products
echo "📊 Getting UAT Flash products..."
PGPASSWORD='B0t3s@Mymoolah' psql -h 127.0.0.1 -p 6543 -U mymoolah_app -d mymoolah -t -c "
SELECT p.name
FROM products p
JOIN suppliers s ON p.\"supplierId\" = s.id
WHERE s.code = 'FLASH'
ORDER BY p.name;
" > /tmp/uat_flash_products.txt

# Get Staging Flash products
echo "📊 Getting Staging Flash products..."
PGPASSWORD=$STAGING_PASSWORD psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -t -c "
SELECT p.name
FROM products p
JOIN suppliers s ON p.\"supplierId\" = s.id
WHERE s.code = 'FLASH'
ORDER BY p.name;
" > /tmp/staging_flash_products.txt

# Find differences
echo ""
echo "🔍 Products in UAT but NOT in Staging:"
echo "================================================"
comm -23 <(sort /tmp/uat_flash_products.txt) <(sort /tmp/staging_flash_products.txt) | sed 's/^[[:space:]]*//' | grep -v '^$'

echo ""
echo "🔍 Products in Staging but NOT in UAT:"
echo "================================================"
comm -13 <(sort /tmp/uat_flash_products.txt) <(sort /tmp/staging_flash_products.txt) | sed 's/^[[:space:]]*//' | grep -v '^$'

# Clean up
rm /tmp/uat_flash_products.txt /tmp/staging_flash_products.txt

echo ""
echo "================================================"
echo "✅ Comparison complete"
echo ""
