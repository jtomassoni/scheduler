'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface HistoricSchedule {
  id: string;
  periodName: string | null;
  periodStart: string;
  periodEnd: string;
  venue: { id: string; name: string } | null;
  uploadedBy: { name: string };
  createdAt: string;
  notes: string | null;
}

export default function HistoricSchedulesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [schedules, setSchedules] = useState<HistoricSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload form state
  const [csvData, setCsvData] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<{
    totalAssignments: number;
    matched: number;
    unmatched: number;
    unmatchedNames: string[];
  } | null>(null);

  const isManager =
    session?.user?.role === 'MANAGER' || session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && !isManager) {
      router.push('/dashboard');
    }
  }, [status, isManager, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch venues
        const venuesRes = await fetch('/api/venues');
        if (venuesRes.ok) {
          const venuesData = await venuesRes.json();
          setVenues(venuesData);
        }

        // Fetch historic schedules
        const schedulesRes = await fetch('/api/historic-schedules');
        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          setSchedules(schedulesData);
        }
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated' && isManager) {
      fetchData();
    }
  }, [status, isManager]);

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      setError('');
      setPreview(null);
    };
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!csvData.trim()) {
      setError('Please upload or paste CSV data');
      return;
    }

    if (!periodStart || !periodEnd) {
      setError('Please set period start and end dates');
      return;
    }

    setUploading(true);
    setError('');
    setPreview(null);

    try {
      const response = await fetch('/api/historic-schedules/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: csvData,
          format: 'csv',
          venueId: venueId || undefined,
          periodName: periodName || undefined,
          periodStart,
          periodEnd,
          notes: notes || undefined,
          preview: true, // Just preview, don't save
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview');
      }

      setPreview({
        totalAssignments: data.totalAssignments,
        matched: data.matchedAssignments,
        unmatched: data.unmatchedAssignments,
        unmatchedNames: data.unmatchedNames || [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to preview schedule'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload() {
    if (!csvData.trim()) {
      setError('Please upload or paste CSV data');
      return;
    }

    if (!periodStart || !periodEnd) {
      setError('Please set period start and end dates');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/historic-schedules/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: csvData,
          format: 'csv',
          venueId: venueId || undefined,
          periodName: periodName || undefined,
          periodStart,
          periodEnd,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload schedule');
      }

      setSuccess(
        `Successfully uploaded historic schedule: ${data.matchedAssignments}/${data.totalAssignments} assignments matched`
      );

      // Clear form
      setCsvData('');
      setPeriodName('');
      setPeriodStart('');
      setPeriodEnd('');
      setNotes('');
      setPreview(null);

      // Refresh schedules list
      const schedulesRes = await fetch('/api/historic-schedules');
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData);
      }

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to upload schedule'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm('Are you sure you want to delete this historic schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/historic-schedules?id=${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      setSchedules(schedules.filter((s) => s.id !== scheduleId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete schedule');
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
              <h1 className="text-2xl font-bold">Historic Schedules</h1>
              <p className="text-sm text-muted-foreground">
                Upload past schedules to establish equity baselines
              </p>
            </div>
            <button
              onClick={() => router.push('/reports')}
              className="btn btn-outline"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="alert alert-error mb-4">{error}</div>}
        {success && <div className="alert alert-success mb-4">{success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Form */}
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">
                  Upload Historic Schedule
                </h2>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <label htmlFor="fileUpload" className="form-label">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    id="fileUpload"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="input w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Expected format: Mission Bar schedule format with dates in
                    first row
                  </p>
                </div>

                <div>
                  <label htmlFor="csvData" className="form-label">
                    Or Paste CSV Data
                  </label>
                  <textarea
                    id="csvData"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={8}
                    className="input w-full font-mono text-sm"
                    placeholder="Paste CSV schedule data here..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="periodStart" className="form-label">
                      Period Start
                    </label>
                    <input
                      id="periodStart"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="periodEnd" className="form-label">
                      Period End
                    </label>
                    <input
                      id="periodEnd"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="periodName" className="form-label">
                    Period Name (optional)
                  </label>
                  <input
                    id="periodName"
                    type="text"
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                    className="input w-full"
                    placeholder="e.g., September 2025"
                  />
                </div>

                <div>
                  <label htmlFor="venueId" className="form-label">
                    Venue (optional)
                  </label>
                  <select
                    id="venueId"
                    value={venueId}
                    onChange={(e) => setVenueId(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">All Venues</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="notes" className="form-label">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="input w-full"
                    placeholder="Any additional notes about this schedule..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePreview}
                    className="btn btn-outline flex-1"
                    disabled={!csvData.trim() || uploading}
                  >
                    Preview
                  </button>
                  <button
                    onClick={handleUpload}
                    className="btn btn-primary flex-1"
                    disabled={!csvData.trim() || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold">Preview</h3>
                </div>
                <div className="card-content">
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Total Assignments:</strong>{' '}
                      {preview.totalAssignments}
                    </div>
                    <div>
                      <strong>Matched Users:</strong> {preview.matched}
                    </div>
                    <div>
                      <strong>Unmatched:</strong> {preview.unmatched}
                    </div>
                    {preview.unmatchedNames.length > 0 && (
                      <div>
                        <strong>Unmatched Names:</strong>
                        <ul className="list-disc list-inside mt-1 text-xs text-muted-foreground">
                          {preview.unmatchedNames
                            .slice(0, 10)
                            .map((name, idx) => (
                              <li key={idx}>{name}</li>
                            ))}
                          {preview.unmatchedNames.length > 10 && (
                            <li>
                              ...and {preview.unmatchedNames.length - 10} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Existing Schedules */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">
                  Historic Schedules ({schedules.length})
                </h2>
              </div>
              <div className="card-content">
                {schedules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No historic schedules uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="p-4 rounded-lg border border-border hover:bg-muted"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold mb-1">
                              {schedule.periodName ||
                                `${new Date(schedule.periodStart).toLocaleDateString()} - ${new Date(schedule.periodEnd).toLocaleDateString()}`}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {schedule.venue && (
                                <div>Venue: {schedule.venue.name}</div>
                              )}
                              <div>
                                Uploaded by {schedule.uploadedBy.name} on{' '}
                                {new Date(
                                  schedule.createdAt
                                ).toLocaleDateString()}
                              </div>
                              {schedule.notes && (
                                <div className="text-xs italic">
                                  {schedule.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground text-sm"
                          >
                            Delete
                          </button>
                        </div>
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
