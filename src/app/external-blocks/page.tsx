'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ExternalBlock {
  id: string;
  startTime: string;
  endTime: string;
  source: string;
  description: string | null;
}

interface PreviewEntry {
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export default function ExternalBlocksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [blocks, setBlocks] = useState<ExternalBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Import state
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importData, setImportData] = useState('');
  const [previewEntries, setPreviewEntries] = useState<PreviewEntry[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchBlocks() {
      try {
        const response = await fetch('/api/external-blocks');
        if (!response.ok) {
          throw new Error('Failed to fetch external blocks');
        }
        const data = await response.json();
        setBlocks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load blocks');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchBlocks();
    }
  }, [status]);

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);

      // Auto-detect format based on file extension
      if (file.name.endsWith('.json')) {
        setImportFormat('json');
      } else if (file.name.endsWith('.csv')) {
        setImportFormat('csv');
      }
    };
    reader.readAsText(file);
  }

  function parsePreview() {
    setPreviewEntries([]);
    setImportErrors([]);
    setError('');

    if (!importData.trim()) {
      setError('Please provide data to import');
      return;
    }

    try {
      if (importFormat === 'csv') {
        const lines = importData.trim().split('\n');
        const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
        const entries: PreviewEntry[] = [];
        const errors: string[] = [];

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(',').map((p) => p.trim());

          if (parts.length < 3) {
            errors.push(`Line ${i + 1}: Invalid format`);
            continue;
          }

          entries.push({
            date: parts[0],
            startTime: parts[1],
            endTime: parts[2],
            description: parts[3] || undefined,
          });
        }

        setPreviewEntries(entries);
        setImportErrors(errors);
      } else {
        const jsonData = JSON.parse(importData);
        if (!Array.isArray(jsonData)) {
          setError('JSON must be an array of entries');
          return;
        }
        setPreviewEntries(jsonData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse data');
    }
  }

  async function handleImport() {
    if (previewEntries.length === 0) {
      setError('No entries to import. Click "Preview" first.');
      return;
    }

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/external-blocks/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: importData,
          format: importFormat,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import');
      }

      const result = await response.json();
      setSuccess(`Successfully imported ${result.imported} external blocks`);

      // Clear form
      setImportData('');
      setPreviewEntries([]);
      setImportErrors([]);

      // Refresh blocks list
      const refreshResponse = await fetch('/api/external-blocks');
      const refreshedData = await refreshResponse.json();
      setBlocks(refreshedData);

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import');
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(blockId: string) {
    if (!confirm('Are you sure you want to delete this external block?')) {
      return;
    }

    try {
      const response = await fetch(`/api/external-blocks?id=${blockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete block');
      }

      setBlocks(blocks.filter((b) => b.id !== blockId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete block');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">External Schedule</h1>
              <p className="text-sm text-muted-foreground">
                Import your day job schedule or other commitments
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-outline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import Section */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Import Schedule</h2>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <label className="form-label">Format</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={importFormat === 'csv'}
                        onChange={() => setImportFormat('csv')}
                        className="radio"
                      />
                      CSV
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={importFormat === 'json'}
                        onChange={() => setImportFormat('json')}
                        className="radio"
                      />
                      JSON
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="fileUpload" className="form-label">
                    Upload File
                  </label>
                  <input
                    type="file"
                    id="fileUpload"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label htmlFor="importData" className="form-label">
                    Or Paste Data
                  </label>
                  <textarea
                    id="importData"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={8}
                    className="input w-full font-mono text-sm"
                    placeholder={
                      importFormat === 'csv'
                        ? 'date,start_time,end_time,description\n2025-11-01,09:00,17:00,Day Job\n2025-11-02,09:00,17:00,Day Job'
                        : '[\n  {\n    "date": "2025-11-01",\n    "startTime": "09:00",\n    "endTime": "17:00",\n    "description": "Day Job"\n  }\n]'
                    }
                  />
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold">Format Requirements:</p>
                  {importFormat === 'csv' ? (
                    <>
                      <p>• CSV: date,start_time,end_time,description</p>
                      <p>• Date: YYYY-MM-DD</p>
                      <p>• Time: HH:MM (24-hour format)</p>
                      <p>• First line can be a header (will be skipped)</p>
                    </>
                  ) : (
                    <>
                      <p>• JSON: Array of objects</p>
                      <p>
                        • Fields: date (YYYY-MM-DD), startTime (HH:MM), endTime
                        (HH:MM), description (optional)
                      </p>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={parsePreview}
                    className="btn btn-outline flex-1"
                    disabled={!importData.trim()}
                  >
                    Preview
                  </button>
                  <button
                    onClick={handleImport}
                    className="btn btn-primary flex-1"
                    disabled={previewEntries.length === 0 || importing}
                  >
                    {importing ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {previewEntries.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold">
                    Preview ({previewEntries.length} entries)
                  </h3>
                </div>
                <div className="card-content">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Time</th>
                          <th className="text-left py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewEntries.map((entry, idx) => (
                          <tr key={idx} className="border-b border-border">
                            <td className="py-2">{entry.date}</td>
                            <td className="py-2">
                              {entry.startTime} - {entry.endTime}
                            </td>
                            <td className="py-2">{entry.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="alert alert-warning">
                <p className="font-semibold">Import Warnings:</p>
                <ul className="list-disc list-inside">
                  {importErrors.map((err, idx) => (
                    <li key={idx} className="text-sm">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Existing Blocks */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">
                  Your External Schedule ({blocks.length})
                </h2>
              </div>
              <div className="card-content">
                {error && <div className="alert alert-error mb-4">{error}</div>}
                {success && (
                  <div className="alert alert-success mb-4">{success}</div>
                )}

                {blocks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No external blocks yet. Import your schedule to get started.
                  </p>
                ) : (
                  <div className="max-h-[600px] overflow-y-auto space-y-2">
                    {blocks.map((block) => (
                      <div
                        key={block.id}
                        className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-accent"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {new Date(block.startTime).toLocaleDateString(
                              'default',
                              {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(block.startTime).toLocaleTimeString(
                              'default',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}{' '}
                            -{' '}
                            {new Date(block.endTime).toLocaleTimeString(
                              'default',
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </div>
                          {block.description && (
                            <div className="text-sm mt-1">
                              {block.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Source: {block.source}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(block.id)}
                          className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
