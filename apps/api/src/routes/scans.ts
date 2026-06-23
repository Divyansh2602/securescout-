import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import unzipper from 'unzipper';
import { v4 as uuidv4 } from 'uuid';
import { ScanService } from '../services/scan.service';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate, createScanSchema, paginationSchema } from '../middleware/validate';
import { AppError } from '../utils/errors';

const UPLOAD_TMP = path.join(__dirname, '../../../uploads/tmp');

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(UPLOAD_TMP, { recursive: true });
    cb(null, UPLOAD_TMP);
  },
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.zip')) cb(null, true);
    else cb(new AppError('Only .zip files are allowed', 400) as any, false);
  },
});

export const scanRouter = Router();

scanRouter.use(authenticate);

scanRouter.get('/', validate(paginationSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as any;
    const result = await ScanService.list(req.user!.orgId, page, limit);
    res.json({ data: result });
  } catch (err) { next(err); }
});

scanRouter.post('/', authorize('DEVELOPER', 'SECURITY_LEAD', 'ORG_ADMIN', 'SUPER_ADMIN'), validate(createScanSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scan = await ScanService.create({
      name:   req.body.name,
      target: req.body.target,
      orgId:  req.user!.orgId,
      userId: req.user!.userId,
    });
    res.status(202).json({ message: 'Scan queued', data: scan });
  } catch (err) { next(err); }
});

scanRouter.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await ScanService.getDashboardStats(req.user!.orgId);
    res.json({ data: stats });
  } catch (err) { next(err); }
});

scanRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scan = await ScanService.getById(req.params.id, req.user!.orgId);
    res.json({ data: scan });
  } catch (err) { next(err); }
});

// Remediation summary (counts + manual-review list) for the report UI.
scanRouter.get('/:id/remediation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await ScanService.getById(req.params.id, req.user!.orgId); // ownership check (404 if not in org)
    try {
      const raw = await fs.readFile(ScanService.remediationJson(req.params.id), 'utf-8');
      res.json({ data: JSON.parse(raw) });
    } catch {
      res.json({ data: { available: false } });
    }
  } catch (err) { next(err); }
});

// Download the remediation bundle (.zip of fixed files) for a scan.
scanRouter.get('/:id/remediation/download', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scan = await ScanService.getById(req.params.id, req.user!.orgId);
    const zip = ScanService.remediationZip(req.params.id);
    try { await fs.access(zip); }
    catch { throw new AppError('No remediation bundle available for this scan', 404); }
    const safe = (scan.name || 'scan').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.download(zip, `securescout-remediation-${safe}.zip`);
  } catch (err) { next(err); }
});

scanRouter.delete('/:id', authorize('SECURITY_LEAD', 'ORG_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await ScanService.delete(req.params.id, req.user!.orgId, req.user!.userId);
    res.json({ message: 'Scan deleted' });
  } catch (err) { next(err); }
});

// ── Upload & Scan (zip file) ──────────────────────────────────────────────────
scanRouter.post(
  '/upload',
  authorize('DEVELOPER', 'SECURITY_LEAD', 'ORG_ADMIN', 'SUPER_ADMIN'),
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const zipPath = req.file?.path;
    let extractDir: string | null = null;
    try {
      if (!zipPath) throw new AppError('No file uploaded', 400);
      const { name } = req.body;
      if (!name?.trim()) throw new AppError('Scan name is required', 400);

      // Extract zip to a unique temp directory
      extractDir = path.join(UPLOAD_TMP, uuidv4());
      await fs.mkdir(extractDir, { recursive: true });
      await new Promise<void>((resolve, reject) => {
        require('fs').createReadStream(zipPath)
          .pipe(unzipper.Extract({ path: extractDir! }))
          .on('close', resolve)
          .on('error', reject);
      });

      // Remove the zip now that it's extracted
      await fs.unlink(zipPath).catch(() => {});

      const scan = await ScanService.create({
        name: name.trim(),
        target: extractDir,
        orgId: req.user!.orgId,
        userId: req.user!.userId,
        cleanupPath: extractDir,
      });

      res.status(202).json({ message: 'Scan queued', data: scan });
    } catch (err) {
      // Clean up on error
      if (zipPath) await fs.unlink(zipPath).catch(() => {});
      if (extractDir) await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
      next(err);
    }
  }
);
