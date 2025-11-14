#!/bin/bash

# Run Tier Fee System Migrations
# Execute this script in Codespaces where DATABASE_URL is configured in .env
# Sequelize CLI will automatically load .env file via dotenv

echo "🔄 Running Tier Fee System Migrations..."
echo "Note: DATABASE_URL will be loaded from .env file automatically"
echo ""

# Run migrations in order
echo "📦 Migration 1: Creating supplier_tier_fees table..."
npx sequelize-cli db:migrate --name 20251114_create_supplier_tier_fees

if [ $? -eq 0 ]; then
  echo "✅ Migration 1 complete"
else
  echo "❌ Migration 1 failed"
  exit 1
fi

echo ""
echo "📦 Migration 2: Creating tier_criteria table..."
npx sequelize-cli db:migrate --name 20251114_create_tier_criteria

if [ $? -eq 0 ]; then
  echo "✅ Migration 2 complete"
else
  echo "❌ Migration 2 failed"
  exit 1
fi

echo ""
echo "📦 Migration 3: Creating user_tier_history table..."
npx sequelize-cli db:migrate --name 20251114_create_user_tier_history

if [ $? -eq 0 ]; then
  echo "✅ Migration 3 complete"
else
  echo "❌ Migration 3 failed"
  exit 1
fi

echo ""
echo "📦 Migration 4: Adding tier fields to users table..."
npx sequelize-cli db:migrate --name 20251114_add_tier_to_users

if [ $? -eq 0 ]; then
  echo "✅ Migration 4 complete"
else
  echo "❌ Migration 4 failed"
  exit 1
fi

echo ""
echo "🎉 All Tier Fee System migrations completed successfully!"
echo ""
echo "📊 Summary:"
echo "  ✅ supplier_tier_fees table created (with Zapper, Flash, EasyPay fees)"
echo "  ✅ tier_criteria table created (Bronze/Silver/Gold/Platinum thresholds)"
echo "  ✅ user_tier_history table created (audit trail)"
echo "  ✅ users table enhanced (tier_level, tier_effective_from, tier_last_reviewed_at)"
echo "  ✅ All existing users set to Bronze tier"
echo ""
echo "🚀 Next steps:"
echo "  1. Restart backend: ./scripts/one-click-restart-and-start.sh"
echo "  2. Test Zapper payment to verify tier fees"
echo "  3. Check logs for: 'Monthly tier review scheduler started'"

