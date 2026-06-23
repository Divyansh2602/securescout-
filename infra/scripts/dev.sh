#!/usr/bin/env bash
# SecureScout — Local Development Startup
set -e

echo "🛡️  SecureScout — Starting local environment"
echo "─────────────────────────────────────────────"

# 1. Check Postgres
if ! pg_isready -q 2>/dev/null; then
  echo "⚠️  PostgreSQL not running. Start it first:"
  echo "    macOS:  brew services start postgresql"
  echo "    Linux:  sudo systemctl start postgresql"
  echo "    Or use a free cloud DB (Neon/Supabase) in apps/api/.env"
fi

# 2. API
echo "→ Installing API dependencies..."
cd apps/api && npm install
echo "→ Generating Prisma client..."
npx prisma generate
echo "→ Running migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push
cd ../..

# 3. Web
echo "→ Installing Web dependencies..."
cd apps/web && npm install && cd ../..

# 4. Scanner
echo "→ Installing scanner dependency..."
pip install packaging --quiet 2>/dev/null || pip3 install packaging --quiet

echo ""
echo "✅ Setup complete. Now run in two terminals:"
echo "   Terminal 1:  cd apps/api && npm run dev"
echo "   Terminal 2:  cd apps/web && npm run dev"
echo ""
echo "   API → http://localhost:4000"
echo "   Web → http://localhost:3000"
