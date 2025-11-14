#!/bin/bash

# Run Tier Fee System Migrations
# Execute this script in Codespaces where DATABASE_URL is configured in .env

echo "🔄 Running Tier Fee System Migrations..."
echo ""

# Load .env file if it exists
if [ -f .env ]; then
  echo "📄 Loading .env file..."
  # Export variables from .env, ignoring comments, empty lines, and separator lines
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments, empty lines, and lines that don't contain '='
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] || [[ ! "$line" =~ = ]]; then
      continue
    fi
    # Export the variable
    export "$line"
  done < .env
  echo "✅ .env file loaded"
  
  # Check if Cloud SQL Auth Proxy is running (Codespaces)
  PROXY_PORT="6543"
  proxy_running=false
  
  # Check if proxy is running on port 6543
  if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 ${PROXY_PORT} 2>/dev/null; then
      proxy_running=true
    fi
  elif command -v pgrep >/dev/null 2>&1; then
    if pgrep -f "cloud-sql-proxy.*${PROXY_PORT}" >/dev/null 2>&1; then
      proxy_running=true
    fi
  fi
  
  # If proxy is running, update DATABASE_URL to use it
  if [ "$proxy_running" = true ] && [ -n "$DATABASE_URL" ]; then
    echo "🔗 Cloud SQL Auth Proxy detected on port ${PROXY_PORT}"
    # Update DATABASE_URL to use proxy (127.0.0.1:6543)
    export DATABASE_URL=$(node -e "
      const u = new URL(process.env.DATABASE_URL);
      u.hostname = '127.0.0.1';
      u.port = '${PROXY_PORT}';
      u.searchParams.set('sslmode', 'disable');
      console.log(u.toString());
    " 2>/dev/null || echo "$DATABASE_URL")
    echo "✅ Updated DATABASE_URL to use proxy connection"
  elif [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == *"34.35.84.201"* ]]; then
    echo "⚠️  Warning: Direct database connection detected"
    echo "   If in Codespaces, start Cloud SQL Auth Proxy first:"
    echo "   ./scripts/one-click-restart-and-start.sh"
  fi
  echo ""
else
  echo "⚠️  Warning: .env file not found"
  echo ""
fi

# Run all pending migrations (Sequelize will only run what's needed)
echo "📦 Running all pending migrations..."
echo ""

npx sequelize-cli db:migrate

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ All migrations completed successfully"
else
  echo ""
  echo "❌ Migration failed"
  echo ""
  echo "💡 If you see permission errors, you may need to run the manual SQL script:"
  echo "   migrations/20251114_add_tier_to_users_manual.sql"
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

