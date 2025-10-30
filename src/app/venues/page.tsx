'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Venue {
  id: string;
  name: string;
  isNetworked: boolean;
  priority: number;
  availabilityDeadlineDay: number;
  tipPoolEnabled: boolean;
  managers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export default function VenuesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const isManager =
    session?.user?.role === 'MANAGER' || session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const response = await fetch('/api/venues');
        if (!response.ok) {
          throw new Error('Failed to fetch venues');
        }
        const data = await response.json();
        setVenues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load venues');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchVenues();
    }
  }, [status]);

  async function handleDelete(venueId: string, venueName: string) {
    if (
      !confirm(
        `Are you sure you want to delete "${venueName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/venues/${venueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete venue');
      }

      // Remove from list
      setVenues(venues.filter((v) => v.id !== venueId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete venue');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading venues...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Venues</h1>
              <p className="text-sm text-muted-foreground">
                Manage venue locations and settings
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isSuperAdmin && (
                <button
                  onClick={() => router.push('/venues/new')}
                  className="btn btn-primary"
                >
                  Create Venue
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="btn btn-outline"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {venues.length === 0 ? (
          <div className="card">
            <div className="card-content text-center py-12">
              <p className="text-muted-foreground mb-4">No venues found</p>
              {isSuperAdmin && (
                <button
                  onClick={() => router.push('/venues/new')}
                  className="btn btn-primary"
                >
                  Create Your First Venue
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <div key={venue.id} className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold">{venue.name}</h3>
                  <div className="flex gap-2 mt-2">
                    {venue.isNetworked && (
                      <span className="badge badge-info text-xs">
                        Networked
                      </span>
                    )}
                    {venue.tipPoolEnabled && (
                      <span className="badge badge-success text-xs">
                        Tip Pool
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-content space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Priority:</span>{' '}
                    <span className="font-medium">{venue.priority}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Availability Deadline:
                    </span>{' '}
                    <span className="font-medium">
                      Day {venue.availabilityDeadlineDay} of month
                    </span>
                  </div>
                  {venue.managers && venue.managers.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Managers:</span>
                      <ul className="mt-1 space-y-1">
                        {venue.managers.map((manager) => (
                          <li key={manager.id} className="text-xs">
                            {manager.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="card-footer flex gap-2">
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => router.push(`/venues/${venue.id}/edit`)}
                        className="btn btn-outline flex-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(venue.id, venue.name)}
                        className="btn btn-outline text-destructive hover:bg-destructive hover:text-destructive-foreground flex-1"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {!isSuperAdmin && isManager && (
                    <button
                      onClick={() => router.push(`/venues/${venue.id}`)}
                      className="btn btn-outline w-full"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
