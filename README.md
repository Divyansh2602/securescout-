# 🛡️ SecureScout Enterprise

**Static Application Security Scanner for Banking & Financial Systems**
PSB Hackathon 2026 · UCO Bank × IIT Kharagpur · Problem Statement 3

A production-grade security platform that detects vulnerable dependencies, hardcoded secrets, weak cryptography, injection flaws, and insecure configurations in Python projects — with a full web dashboard, RBAC, audit logging, and CI/CD integration.

---

## Architecture

```
securescout-enterprise/
├── apps/
│   ├── web/                  Next.js 14 + TypeScript + Tailwind dashboard
│   │   └── src/
│   │       ├── app/          App router pages (dashboard, scan, reports, auth)
│   │       ├── components/   UI, layout, charts, findings
│   │       ├── lib/          API client, auth store, utils
│   │       └── types/        Shared TypeScript types
│   └── api/                  Express + TypeScript REST API
│       ├── src/
│       │   ├── routes/       Auth, scans, reports, users, health
│       │   ├── services/     Business logic (auth, scan, jwt, audit)
│       │   ├── middleware/   Auth/RBAC, validation, error handling
│       │   ├── config/       Env validation, database
│       │   └── utils/        Logger, errors
│       └── prisma/           PostgreSQL schema
├── scanner/                  Python static analysis engine
│   ├── engine.py             Core orchestrator
│   ├── detectors/            5 detectors (CVE, secret, crypto, injection, config)
│   └── cli/scan.py           CLI entrypoint
├── tests/                    Unit + integration tests
├── infra/scripts/            Local dev startup
├── .github/workflows/        CI/CD pipeline
└── vulnerable_bank_app/      Intentionally vulnerable test target
```

---

## Security Standards Implemented

| Standard | Implementation |
|---|---|
| **OWASP Top 10** | Input validation, parameterized queries, secure headers, access control |
| **OWASP ASVS** | Password policy (12+ chars), session management, crypto storage |
| **OWASP API Security Top 10** | Rate limiting, JWT auth, RBAC, mass-assignment protection |
| **NIST CSF** | Identify (scanning), Protect (RBAC/auth), Detect (audit logs) |
| **Authentication** | JWT access + refresh tokens, bcrypt (12 rounds), account lockout |
| **Authorization** | 5-tier RBAC (Viewer → Super Admin), per-route guards |
| **Audit Logging** | All sensitive actions logged immutably with IP/user agent |
| **Rate Limiting** | Global (1000/15min), auth (10/15min), scan (30/min) |
| **Headers** | Helmet: CSP, HSTS, X-Frame-Options, nosniff |
| **Validation** | Zod schemas on every endpoint |
| **CSRF/XSS/SQLi** | SameSite cookies, output encoding, Prisma parameterization |

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui patterns, Recharts, Zustand
- **Backend:** Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL (indexed for 10M-user scale)
- **Cache/Queue:** Redis (sessions, rate limiting, scan queue)
- **Scanner:** Python 3.11 static analysis engine
- **Auth:** JWT + bcrypt
- **CI/CD:** GitHub Actions

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 16 (local or cloud — Neon/Supabase free tier works)
- Redis (local or Upstash free tier) — optional for basic demo

### 1. One-command setup
```bash
bash infra/scripts/dev.sh
```

### 2. Configure environment
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/api/.env with your DATABASE_URL
```

### 3. Run (two terminals)
```bash
# Terminal 1 — API
cd apps/api && npm run dev      # → http://localhost:4000

# Terminal 2 — Web
cd apps/web && npm run dev      # → http://localhost:3000
```

### 4. Standalone scanner (no DB needed)
```bash
# Install the CLI (also gives you the `securescout` command)
pip install -e .

securescout ./vulnerable_bank_app --output all          # scan + reports
securescout ./vulnerable_bank_app --autofix             # scan + auto-remediation
securescout ./vulnerable_bank_app --fail-on-critical    # CI gate (exit 1 on Critical)

# Or run without installing:
python securescout/cli/scan.py ./vulnerable_bank_app --output all
```

---

## Deployment (No Docker)

| Component | Platform | Notes |
|---|---|---|
| **Web** | Vercel | Connect GitHub repo, set root to `apps/web`, auto-deploys |
| **API** | Render | Uses `render.yaml` blueprint, free tier |
| **Database** | Neon / Supabase | Free managed PostgreSQL |
| **Redis** | Upstash | Free managed Redis |

Push to `main` → Vercel and Render auto-deploy. No containers required.

---

## API Endpoints

```
POST   /api/v1/auth/register      Create org + admin user
POST   /api/v1/auth/login         Authenticate (returns JWT pair)
POST   /api/v1/auth/refresh       Refresh access token
POST   /api/v1/auth/logout        Invalidate session
GET    /api/v1/scans              List scans (paginated)
POST   /api/v1/scans              Start a new scan
GET    /api/v1/scans/stats        Dashboard statistics
GET    /api/v1/scans/:id          Scan detail + findings
DELETE /api/v1/scans/:id          Delete scan (Security Lead+)
GET    /api/v1/reports/scan/:id/json   Export JSON report
GET    /api/v1/users              List org users (Admin)
GET    /api/v1/users/audit-logs   Audit trail (Admin)
GET    /health                    Health check
```

---

## Detection Capabilities

- **CVE Detection** — 14+ packages matched against curated CVE database
- **Secret Scanning** — AWS keys, passwords, API keys, JWT secrets
- **Weak Crypto** — MD5, SHA1, insecure random, pickle, yaml.load
- **Injection** — SQL injection, command injection, XSS, eval/exec
- **Misconfiguration** — SSL disabled, CORS wildcard, DES/ECB, debug mode

---

## Testing

```bash
npm test                  # All tests
cd apps/api && npm test   # API unit + integration
```

---

## Team
PSB Hackathon 2026 · VIT Vellore
