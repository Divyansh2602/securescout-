'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AppShell } from '@/components/layout/AppShell';
import { Scan, Loader2, FolderOpen, Upload, FileArchive, X } from 'lucide-react';

type Mode = 'upload' | 'path';

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<Mode>('upload');
  const [name, setName]         = useState('');
  const [target, setTarget]     = useState('');
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.zip')) { setError('Only .zip files are supported'); return; }
    setFile(f);
    if (!name) setName(f.name.replace('.zip', ''));
    setError('');
  };

  const submit = async () => {
    if (!name.trim()) { setError('Scan name is required'); return; }
    if (mode === 'upload' && !file) { setError('Please select a zip file'); return; }
    if (mode === 'path' && !target.trim()) { setError('Target path is required'); return; }
    setError(''); setLoading(true);

    try {
      let data;
      if (mode === 'upload') {
        const form = new FormData();
        form.append('file', file!);
        form.append('name', name.trim());
        const res = await api.post('/scans/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        data = res.data;
      } else {
        const res = await api.post('/scans', { name: name.trim(), target: target.trim() });
        data = res.data;
      }
      router.push(`/reports/${data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to start scan');
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">New Security Scan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Scan a Python project for vulnerabilities, secrets, and misconfigurations
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mt-6 bg-card border border-border rounded-lg p-1 w-fit">
          {(['upload', 'path'] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {m === 'upload' ? 'Upload ZIP' : 'Server Path'}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mt-3 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Scan name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Scan Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Q1 Banking API Audit" />
          </div>

          {/* Upload mode */}
          {mode === 'upload' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project ZIP File</label>
              <input ref={fileRef} type="file" accept=".zip" className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {!file ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drop your ZIP here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Max 50 MB · .zip only</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 border border-border rounded-lg px-4 py-3 bg-background">
                  <FileArchive className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Path mode */}
          {mode === 'path' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Target Path</label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={target} onChange={e => setTarget(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="/path/to/project" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Absolute path to the project folder on the server
              </p>
            </div>
          )}

          <button onClick={submit} disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
            {loading ? 'Starting scan...' : 'Start Scan'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'CVE Detection',   desc: 'Known vulnerable dependencies' },
            { label: 'Secret Scanning', desc: 'Hardcoded keys & passwords' },
            { label: 'Code Analysis',   desc: 'Injection, XSS, weak crypto' },
          ].map(c => (
            <div key={c.label} className="bg-card/50 border border-border rounded-lg p-3">
              <div className="text-sm font-medium">{c.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
