import { spawn } from 'child_process';
import { prisma } from '../config/database';
import { AuditService } from './audit.service';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

interface CreateScanInput {
  name:         string;
  target:       string;
  orgId:        string;
  userId:       string;
  cleanupPath?: string; // temp dir to delete after scan completes
}

export class ScanService {
  private static readonly SCANNER_PATH = path.join(__dirname, '../../../../securescout');
  private static readonly UPLOAD_DIR   = path.join(__dirname, '../../../uploads');
  // `python3` is the alias on macOS/Linux; on Windows it usually only resolves
  // to `python` (the `python3` name hits the MS Store shim). Allow an override.
  private static readonly PYTHON = process.env.SCANNER_PYTHON
    || (process.platform === 'win32' ? 'python' : 'python3');

  static async create(input: CreateScanInput) {
    const scan = await prisma.scan.create({
      data: {
        name:        input.name,
        target:      input.target,
        orgId:       input.orgId,
        createdById: input.userId,
        status:      'QUEUED',
      },
    });

    await AuditService.log({
      action: 'SCAN_CREATED', userId: input.userId,
      orgId: input.orgId, resourceId: scan.id, resourceType: 'Scan',
    });

    // Run scan asynchronously
    this.runScan(scan.id, input.target, input.cleanupPath).catch((err) =>
      logger.error(`Scan ${scan.id} failed:`, err)
    );

    return scan;
  }

  static async runScan(scanId: string, targetPath: string, cleanupPath?: string): Promise<void> {
    await prisma.scan.update({ where: { id: scanId }, data: { status: 'RUNNING' } });

    const jsonOutput = path.join(this.UPLOAD_DIR, `scan-${scanId}.json`);
    await fs.mkdir(this.UPLOAD_DIR, { recursive: true });

    return new Promise((resolve, reject) => {
      const proc = spawn(this.PYTHON, [
        path.join(this.SCANNER_PATH, 'cli', 'scan.py'),
        targetPath,
        '--output', 'json',
        '--json-out', jsonOutput,
      ], { timeout: 300000 }); // 5 min timeout

      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', async (code) => {
        try {
          if (code !== 0 && code !== 1) {
            // code 1 = found criticals (expected), anything else = error
            await prisma.scan.update({
              where: { id: scanId },
              data: { status: 'FAILED', errorMessage: stderr.slice(0, 500) },
            });
            return reject(new Error(`Scanner exited with code ${code}`));
          }

          const raw  = await fs.readFile(jsonOutput, 'utf-8');
          const data = JSON.parse(raw);

          // Persist findings
          const findings = data.findings || [];
          if (findings.length > 0) {
            await prisma.finding.createMany({
              data: findings.map((f: any) => ({
                scanId,
                type:        f.type,
                severity:    f.severity,
                title:       f.title,
                description: f.description,
                file:        f.file,
                line:        f.line,
                evidence:    f.evidence,
                fix:         f.fix,
                cveId:       f.cve_id || null,
                cvssScore:   f.cvss_score || null,
                references:  f.references || [],
              })),
            });
          }

          const riskScore = Math.min(100,
            (data.critical || 0) * 10 + (data.high || 0) * 4 + (data.medium || 0)
          );

          await prisma.scan.update({
            where: { id: scanId },
            data: {
              status:        'COMPLETED',
              totalFindings: data.total_findings || 0,
              critical:      data.critical || 0,
              high:          data.high     || 0,
              medium:        data.medium   || 0,
              low:           data.low      || 0,
              info:          data.info     || 0,
              riskScore,
              passed:        data.passed   || false,
              scanTime:      data.scan_time || 0,
              completedAt:   new Date(),
            },
          });

          await fs.unlink(jsonOutput).catch(() => {});
          // Build the downloadable remediation bundle while the source still
          // exists (uploads are deleted just below).
          await this.runRemediation(scanId, targetPath);
          // Remove uploaded temp directory if this was a zip upload
          if (cleanupPath) await fs.rm(cleanupPath, { recursive: true, force: true }).catch(() => {});
          resolve();
        } catch (err) {
          await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'FAILED', errorMessage: String(err) },
          });
          reject(err);
        }
      });

      proc.on('error', async (err) => {
        await prisma.scan.update({
          where: { id: scanId },
          data: { status: 'FAILED', errorMessage: err.message },
        });
        reject(err);
      });
    });
  }

  // Paths for a scan's remediation artifacts.
  static remediationZip(scanId: string)  { return path.join(this.UPLOAD_DIR, `remediation-${scanId}.zip`); }
  static remediationJson(scanId: string) { return path.join(this.UPLOAD_DIR, `remediation-${scanId}.json`); }

  /** Best-effort: spawn the Python bundler, persist its JSON summary. Never throws. */
  private static runRemediation(scanId: string, targetPath: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = spawn(this.PYTHON, [
        path.join(this.SCANNER_PATH, 'cli', 'remediate.py'),
        targetPath, '--out', this.remediationZip(scanId),
      ], { timeout: 300000 });

      let out = '', err = '';
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.stderr.on('data', (d) => { err += d.toString(); });
      proc.on('close', async (code) => {
        try {
          if (code === 0 && out.trim()) {
            await fs.writeFile(this.remediationJson(scanId), out.trim(), 'utf-8');
          } else {
            logger.warn(`Remediation for ${scanId} produced no summary (code ${code}): ${err.slice(0, 200)}`);
          }
        } catch (e) {
          logger.warn(`Remediation save failed for ${scanId}: ${e}`);
        }
        resolve();
      });
      proc.on('error', (e) => { logger.warn(`Remediation spawn failed: ${e.message}`); resolve(); });
    });
  }

  static async list(orgId: string, page = 1, limit = 20) {
    const [scans, total] = await prisma.$transaction([
      prisma.scan.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, target: true, status: true,
          totalFindings: true, critical: true, high: true,
          medium: true, riskScore: true, passed: true,
          createdAt: true, completedAt: true,
          createdBy: { select: { name: true, email: true } },
        },
      }),
      prisma.scan.count({ where: { orgId } }),
    ]);
    return { scans, total, page, limit, pages: Math.ceil(total / limit) };
  }

  static async getById(id: string, orgId: string) {
    const scan = await prisma.scan.findFirst({
      where: { id, orgId },
      include: {
        findings: { orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] },
        createdBy: { select: { name: true, email: true } },
      },
    });
    if (!scan) throw new AppError('Scan not found', 404);
    return scan;
  }

  static async delete(id: string, orgId: string, userId: string) {
    // deleteMany with both id+orgId is atomic — no TOCTOU window
    const { count } = await prisma.scan.deleteMany({ where: { id, orgId } });
    if (count === 0) throw new AppError('Scan not found', 404);
    await AuditService.log({
      action: 'SCAN_DELETED', userId, orgId, resourceId: id, resourceType: 'Scan',
    });
  }

  static async getDashboardStats(orgId: string) {
    const [totalScans, recentScans, severityCounts, trend] = await prisma.$transaction([
      prisma.scan.count({ where: { orgId } }),
      prisma.scan.findMany({
        where: { orgId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, riskScore: true, createdAt: true, passed: true },
      }),
      prisma.finding.groupBy({
        by: ['severity'],
        where: { scan: { orgId } },
        orderBy: { severity: 'asc' },
        _count: true,
      }),
      prisma.scan.findMany({
        where: { orgId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { createdAt: true, riskScore: true, totalFindings: true },
      }),
    ]);

    return { totalScans, recentScans, severityCounts, trend };
  }
}
