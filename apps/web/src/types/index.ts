export type Severity    = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type FindingType = 'CVE' | 'SECRET' | 'WEAK_CRYPTO' | 'INJECTION' | 'MISCONFIG';
export type ScanStatus  = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Finding {
  id: string; scanId: string; type: FindingType; severity: Severity;
  title: string; description: string; file: string; line: number;
  evidence: string; fix: string; cveId?: string; cvssScore?: number;
  references: string[]; isResolved: boolean; createdAt: string;
}

export interface Scan {
  id: string; name: string; target: string; status: ScanStatus;
  totalFindings: number; critical: number; high: number; medium: number;
  low: number; info: number; riskScore: number; passed: boolean;
  scanTime?: number; createdAt: string; completedAt?: string;
  findings?: Finding[];
  createdBy?: { name: string; email: string };
}

export interface DashboardStats {
  totalScans:     number;
  recentScans:    Scan[];
  severityCounts: { severity: string; _count: number }[];
  trend:          { createdAt: string; riskScore: number; totalFindings: number }[];
}
