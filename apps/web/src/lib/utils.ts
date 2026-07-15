import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function calcRiskScore(c: number, h: number, m: number) { return Math.min(100, c*10 + h*4 + m); }
/** Friendly label for a scan target. Uploaded ZIPs are extracted to an internal
 *  temp dir on the server — never surface that raw path in the UI. */
export function displayTarget(target?: string | null) {
  if (!target) return '—';
  if (/[\\/]uploads[\\/]tmp[\\/]/.test(target)) return 'Uploaded project (ZIP)';
  return target;
}
export function riskMeta(score: number) {
  if (score >= 80) return { label:'CRITICAL RISK', color:'text-red-400',    bg:'bg-red-950/30',    border:'border-red-800/40'    };
  if (score >= 55) return { label:'HIGH RISK',     color:'text-orange-400', bg:'bg-orange-950/30', border:'border-orange-800/40' };
  if (score >= 30) return { label:'MEDIUM RISK',   color:'text-yellow-400', bg:'bg-yellow-950/30', border:'border-yellow-800/40' };
  return               { label:'LOW RISK',      color:'text-green-400',  bg:'bg-green-950/30',  border:'border-green-800/40'  };
}
