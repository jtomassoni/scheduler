'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Manager {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function NewVenuePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [isNetworked, setIsNetworked] = useState(true);
  const [priority, setPriority] = useState(0);
  const [availabilityDeadlineDay, setAvailabilityDeadlineDay] = useState(10);
  const [tipPoolEnabled, setTipPoolEnabled] = useState(false);
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    // Check if user is Super Admin
    if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/venues');
    }
  }, [status, session, router]);

  useEffect(() => {
    async function fetchManagers() {
      try {
        // Fetch all users with MANAGER role
        const response = await fetch('/api/users?role=MANAGER');
        if (response.ok) {
          const data = await response.json();
          setManagers(data);
        }
      } catch (err) {
        console.error('Failed to fetch managers:', err);
      }
    }

    if (status === 'authenticated') {
      fetchManagers();
    }
  }, [status]);

  function toggleManager(managerId: string) {
    setSelectedManagerIds((prev) =>
      prev.includes(managerId)
        ? prev.filter((id) => id !== managerId)
        : [...prev, managerId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isNetworked,
          priority,
          availabilityDeadlineDay,
          tipPoolEnabled,
          managerIds: selectedManagerIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create venue');
      }

      // Redirect to venues list
      router.push('/venues');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venue');
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
              <h1 className="text-2xl font-bold">Create Venue</h1>
              <p className="text-sm text-muted-foreground">
                Add a new venue location
              </p>
            </div>
            <button
              onClick={() => router.push('/venues')}
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
              <h2 className="text-xl font-semibold">Basic Information</h2>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label htmlFor="name" className="form-label">
                  Venue Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input w-full"
                  placeholder="e.g., Downtown Bar"
                />
              </div>

              <div>
                <label htmlFor="priority" className="form-label">
                  Priority
                </label>
                <input
                  type="number"
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  min="0"
                  className="input w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher priority venues appear first in lists
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isNetworked"
                  checked={isNetworked}
                  onChange={(e) => setIsNetworked(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="isNetworked" className="cursor-pointer">
                  Networked venue
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Networked venues share staff across the network
              </p>
            </div>
          </div>

          {/* Availability Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Availability Settings</h2>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label htmlFor="deadlineDay" className="form-label">
                  Availability Deadline (Day of Month)
                </label>
                <input
                  type="number"
                  id="deadlineDay"
                  value={availabilityDeadlineDay}
                  onChange={(e) =>
                    setAvailabilityDeadlineDay(parseInt(e.target.value))
                  }
                  min="1"
                  max="28"
                  required
                  className="input w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Staff must submit availability by this day of the month (1-28)
                </p>
              </div>
            </div>
          </div>

          {/* Tip Pool Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Tip Pool Settings</h2>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tipPool"
                  checked={tipPoolEnabled}
                  onChange={(e) => setTipPoolEnabled(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="tipPool" className="cursor-pointer">
                  Enable tip pool
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, managers can track and distribute tips for this
                venue
              </p>
            </div>
          </div>

          {/* Manager Assignment */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Assign Managers</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select managers who can schedule shifts at this venue
              </p>
            </div>
            <div className="card-content">
              {managers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No managers available
                </p>
              ) : (
                <div className="space-y-2">
                  {managers.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        id={`manager-${manager.id}`}
                        checked={selectedManagerIds.includes(manager.id)}
                        onChange={() => toggleManager(manager.id)}
                        className="checkbox"
                      />
                      <label
                        htmlFor={`manager-${manager.id}`}
                        className="cursor-pointer flex-1"
                      >
                        <div className="font-medium">{manager.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {manager.email}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
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
              onClick={() => router.push('/venues')}
              className="btn btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Venue'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
