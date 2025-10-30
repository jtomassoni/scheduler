'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Venue {
  id: string;
  name: string;
}

export default function NewShiftPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('02:00');
  const [bartendersRequired, setBartendersRequired] = useState(1);
  const [barbacksRequired, setBarbacksRequired] = useState(0);
  const [leadsRequired, setLeadsRequired] = useState(0);

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
    async function fetchVenues() {
      try {
        const response = await fetch('/api/venues');
        if (response.ok) {
          const data = await response.json();
          setVenues(data);
          if (data.length > 0) {
            setVenueId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      }
    }

    if (status === 'authenticated') {
      fetchVenues();
    }
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venueId,
          date: new Date(date).toISOString(),
          startTime,
          endTime,
          bartendersRequired,
          barbacksRequired,
          leadsRequired,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create shift');
      }

      const newShift = await response.json();
      // Redirect to shift detail page to assign staff
      router.push(`/shifts/${newShift.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shift');
      setSaving(false);
    }
  }

  if (status === 'loading') {
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
              <h1 className="text-2xl font-bold">Create Shift</h1>
              <p className="text-sm text-muted-foreground">
                Add a new shift to the schedule
              </p>
            </div>
            <button
              onClick={() => router.push('/shifts')}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Shift Details</h2>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label htmlFor="venue" className="form-label">
                  Venue <span className="text-destructive">*</span>
                </label>
                <select
                  id="venue"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  required
                  className="input w-full"
                >
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="date" className="form-label">
                  Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="form-label">
                    Start Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="input w-full"
                  />
                </div>

                <div>
                  <label htmlFor="endTime" className="form-label">
                    End Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Staffing Requirements */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Staffing Requirements</h2>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label htmlFor="bartenders" className="form-label">
                  Bartenders Required
                </label>
                <input
                  type="number"
                  id="bartenders"
                  value={bartendersRequired}
                  onChange={(e) =>
                    setBartendersRequired(parseInt(e.target.value))
                  }
                  min="0"
                  required
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="barbacks" className="form-label">
                  Barbacks Required
                </label>
                <input
                  type="number"
                  id="barbacks"
                  value={barbacksRequired}
                  onChange={(e) =>
                    setBarbacksRequired(parseInt(e.target.value))
                  }
                  min="0"
                  required
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="leads" className="form-label">
                  Leads Required
                </label>
                <input
                  type="number"
                  id="leads"
                  value={leadsRequired}
                  onChange={(e) => setLeadsRequired(parseInt(e.target.value))}
                  min="0"
                  required
                  className="input w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leads must be staff members designated as lead-capable
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/shifts')}
              className="btn btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Shift'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
