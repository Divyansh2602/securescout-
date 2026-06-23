# SecureScout — Architecture & Design

## System Overview

SecureScout is a three-tier security scanning platform:

1. **Presentation tier** — Next.js dashboard (Vercel)
2. **Application tier** — Express REST API (Render)
3. **Data tier** — PostgreSQL + Redis (Neon + Upstash)

The Python scanner runs as a subprocess invoked by the API.

## Request Flow

```
User → Next.js (web) → Express API → Scanner subprocess
                            ↓
                     PostgreSQL (findings, scans, audit)
                            ↓
                     Redis (sessions, rate limits, queue)
```

## Scan Lifecycle

```
1. User submits scan (POST /scans)        → status: QUEUED
2. API spawns Python scanner async         → status: RUNNING
3. Scanner emits JSON                       → API parses
4. Findings persisted to PostgreSQL         → status: COMPLETED
5. Risk score computed (10·C + 4·H + 1·M)
6. Frontend polls every 3s until COMPLETED
```

## Security Architecture

### Authentication
- Access token (15 min) + refresh token (7 days)
- Tokens signed HS256 with separate secrets
- Sessions persisted; logout invalidates server-side
- bcrypt with 12 rounds for password storage
- Account lockout after 5 failed attempts (15 min)

### Authorization (RBAC)
Role hierarchy (ascending privilege):
```
VIEWER < DEVELOPER < SECURITY_LEAD < ORG_ADMIN < SUPER_ADMIN
```
Each route guarded by `authorize(...roles)` middleware checking hierarchy level.

### Multi-tenancy
Every query scoped by `orgId` from the JWT. Users cannot access other organizations' data — enforced at the service layer.

### Defense in Depth
- Helmet security headers (CSP, HSTS, frame options)
- Rate limiting at three tiers (global/auth/scan)
- Zod input validation on all endpoints
- Prisma parameterized queries (no raw SQL injection surface)
- SameSite=strict cookies (CSRF mitigation)
- Audit logging for all sensitive operations

## Scaling to 10M Users

| Concern | Approach |
|---|---|
| Database reads | Indexed columns (email, orgId, status, severity, createdAt) |
| Connection pooling | Prisma singleton + PgBouncer in production |
| Session storage | Redis (not in-process) — horizontally scalable |
| Scan queue | BullMQ on Redis — workers scale independently |
| Stateless API | JWT auth means any API node handles any request |
| Pagination | All list endpoints paginated (max 100/page) |

## Database Schema

Core entities: Organization → Users → Scans → Findings, plus Sessions, ApiKeys, AuditLogs. See `apps/api/prisma/schema.prisma`.

All foreign keys cascade on org/scan deletion. Audit logs use `SetNull` to preserve the trail even after user deletion.
