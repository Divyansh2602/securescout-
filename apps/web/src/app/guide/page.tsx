'use client';

import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';
import {
  Scan, FileText, Wrench, KeyRound, AlertTriangle, CheckCircle2,
  ShieldCheck, GitBranch, ArrowRight, Search, ListChecks, Download,
} from 'lucide-react';

const STEPS = [
  {
    icon: Scan, title: 'Start a scan',
    body: 'Go to New Scan and either upload your project as a .zip or point to a server path. SecureScout supports Python projects with their dependency, code, and configuration files.',
    cta: { href: '/scan', label: 'Open New Scan' },
  },
  {
    icon: Search, title: 'We analyze code + dependencies',
    body: 'Five detectors run automatically: known CVEs in dependencies, hardcoded secrets, weak cryptography, injection flaws (SQLi, command, eval), and insecure default configurations (debug mode, disabled TLS, weak ciphers).',
  },
  {
    icon: FileText, title: 'Read the report',
    body: 'Each scan produces a risk score (0–100), a PASS/FAIL verdict, and a full list of findings — each with its file, line, evidence, and a recommended fix. The "Why this score?" panel explains exactly how the number was derived.',
    cta: { href: '/reports', label: 'View Reports' },
  },
  {
    icon: Download, title: 'Download the fixes',
    body: 'On any completed report, click "Download fixes (.zip)". The bundle contains your corrected files at their original paths plus a remediation summary. Unzip it over your repository to apply — or hand it to your developers to open a pull request.',
  },
  {
    icon: ListChecks, title: 'Handle manual items & re-scan',
    body: 'A few issues (SQL injection, eval/exec, insecure deserialization, XSS) are not auto-rewritten because that could break your app — they come with clear fix instructions. Apply those, then re-scan to confirm your score drops.',
  },
];

const REMEDIATION = [
  { icon: CheckCircle2, color: 'text-green-400', title: 'Auto-fixed',
    body: 'Logic-preserving fixes applied for you: vulnerable dependency upgrades, yaml.load → safe_load, MD5/SHA-1 → SHA-256, ECB → GCM, debug/TLS/SSL toggles, weak key sizes, and more.' },
  { icon: KeyRound, color: 'text-blue-400', title: 'Secrets externalized',
    body: 'Hardcoded passwords, API keys, and tokens are moved out of source into environment variables (e.g. password: ${DB_PASSWORD}). You then set those values securely at runtime.' },
  { icon: AlertTriangle, color: 'text-orange-400', title: 'Manual review',
    body: 'Issues that can\'t be safely rewritten automatically (SQL injection, eval/exec, pickle, XSS) are flagged with a recommended fix so your team can apply them with full context.' },
];

export default function GuidePage() {
  return (
    <AppShell>
      <div className="space-y-8 max-w-4xl">
        {/* Intro */}
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-mono font-semibold mb-2">
            <ShieldCheck className="w-4 h-4" /> GETTING STARTED
          </div>
          <h1 className="text-2xl font-bold tracking-tight">How SecureScout works</h1>
          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
            SecureScout is a static analysis tool for banking and financial applications. It scans your
            code <span className="text-foreground">and</span> open-source dependencies to find known CVEs
            <span className="text-foreground"> and</span> insecure configurations — hardcoded passwords,
            weak cipher suites, disabled TLS — then gives you clear reports and one-click auto-remediation,
            so vulnerabilities are caught and fixed before release.
          </p>
        </div>

        {/* Steps */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Step by step</h2>
          <div className="space-y-3">
            {STEPS.map((s, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                    <s.icon className="w-4.5 h-4.5" />
                  </div>
                  {i < STEPS.length - 1 && <div className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Step {i + 1}</span>
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
                  {s.cta && (
                    <Link href={s.cta.href}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 font-medium">
                      {s.cta.label} <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Understanding the score */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Understanding the risk score
          </h2>
          <div className="bg-background border border-border rounded-lg px-4 py-3 font-mono text-sm mb-3">
            <span className="text-red-400">Critical×10</span> + <span className="text-orange-400">High×4</span> + <span className="text-yellow-400">Medium×1</span>
            <span className="text-muted-foreground"> = risk score (capped at 100)</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• <span className="text-green-400 font-medium">PASS</span> — no Critical or High findings. A CI build with <code className="text-foreground">--fail-on-critical</code> would succeed.</li>
            <li>• <span className="text-red-400 font-medium">FAIL</span> — at least one Critical or High finding. The build gate blocks the release.</li>
            <li>• A lower number is better. <span className="text-foreground">0/100</span> means a clean, secure project.</li>
          </ul>
        </section>

        {/* Remediation categories */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4" /> How auto-remediation works
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {REMEDIATION.map((r) => (
              <div key={r.title} className="bg-card border border-border rounded-xl p-4">
                <r.icon className={cn('w-5 h-5 mb-2', r.color)} />
                <h3 className="text-sm font-semibold mb-1">{r.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CI/CD */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" /> Integrating into CI/CD
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SecureScout runs in your pipeline (e.g. GitHub Actions) and fails the build when Critical issues
            are found — so vulnerable code never reaches production. Security becomes a gate, not an
            afterthought, without slowing down delivery.
          </p>
          <div className="bg-background border border-border rounded-lg px-4 py-2.5 font-mono text-xs mt-3">
            <span className="text-green-400">$ securescout ./app --fail-on-critical</span>
            <span className="text-muted-foreground"> → build fails if any Critical finding exists</span>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold">Ready to secure your project?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Run your first scan in under a minute.</p>
          </div>
          <Link href="/scan"
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
            <Scan className="w-4 h-4" /> Start a scan
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
