'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  hasDayJob: boolean;
  dayJobCutoff: string | null;
  isLead: boolean;
  preferredVenuesOrder: string[];
  defaultAvailability: Record<string, unknown> | null;
  autoSubmitAvailability: boolean;
  notificationPrefs: {
    email?: boolean;
    push?: boolean;
    quietHours?: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
  } | null;
}

interface Venue {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [hasDayJob, setHasDayJob] = useState(false);
  const [dayJobCutoff, setDayJobCutoff] = useState('');
  const [autoSubmitAvailability, setAutoSubmitAvailability] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  const [venuePreferences, setVenuePreferences] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch profile
        const profileRes = await fetch('/api/profile');
        if (!profileRes.ok) {
          throw new Error('Failed to fetch profile');
        }
        const profileData = await profileRes.json();
        setProfile(profileData);

        // Set form values
        setName(profileData.name);
        setHasDayJob(profileData.hasDayJob);
        setDayJobCutoff(profileData.dayJobCutoff || '');
        setAutoSubmitAvailability(profileData.autoSubmitAvailability);

        if (profileData.notificationPrefs) {
          setEmailNotifications(profileData.notificationPrefs.email ?? true);
          setPushNotifications(profileData.notificationPrefs.push ?? true);
          if (profileData.notificationPrefs.quietHours) {
            setQuietHoursEnabled(
              profileData.notificationPrefs.quietHours.enabled
            );
            setQuietHoursStart(
              profileData.notificationPrefs.quietHours.startTime
            );
            setQuietHoursEnd(profileData.notificationPrefs.quietHours.endTime);
          }
        }

        // Fetch venues
        const venuesRes = await fetch('/api/venues');
        if (venuesRes.ok) {
          const venuesData = await venuesRes.json();
          setVenues(venuesData);

          // Initialize venue preferences from profile or set all venues
          if (
            profileData.preferredVenuesOrder &&
            profileData.preferredVenuesOrder.length > 0
          ) {
            setVenuePreferences(profileData.preferredVenuesOrder);
          } else {
            // If no preferences set, initialize with all venue IDs
            setVenuePreferences(venuesData.map((v: Venue) => v.id));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  // Drag and drop handlers for venue ordering
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPreferences = [...venuePreferences];
    const draggedItem = newPreferences[draggedIndex];
    newPreferences.splice(draggedIndex, 1);
    newPreferences.splice(index, 0, draggedItem);

    setVenuePreferences(newPreferences);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        name,
        hasDayJob,
        dayJobCutoff: hasDayJob && dayJobCutoff ? dayJobCutoff : null,
        preferredVenuesOrder: venuePreferences,
        autoSubmitAvailability,
        notificationPrefs: {
          email: emailNotifications,
          push: pushNotifications,
          quietHours: quietHoursEnabled
            ? {
                enabled: true,
                startTime: quietHoursStart,
                endTime: quietHoursEnd,
              }
            : { enabled: false, startTime: '22:00', endTime: '08:00' },
        },
      };

      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccess('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Profile Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage your personal information and preferences
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Basic Information</h2>
            </div>
            <div className="card-content space-y-4">
              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={profile.email}
                  disabled
                  className="input w-full bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label htmlFor="name" className="form-label">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input w-full"
                />
              </div>

              <div>
                <label className="form-label">Role</label>
                <div className="flex items-center gap-2">
                  <span className="badge badge-info">{profile.role}</span>
                  {profile.isLead && (
                    <span className="badge badge-success">Lead</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Role is assigned by administrators
                </p>
              </div>
            </div>
          </div>

          {/* Day Job Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Day Job Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set your earliest available time for evening shifts
              </p>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasDayJob"
                  checked={hasDayJob}
                  onChange={(e) => setHasDayJob(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="hasDayJob" className="cursor-pointer">
                  I have a day job
                </label>
              </div>

              {hasDayJob && (
                <div>
                  <label htmlFor="dayJobCutoff" className="form-label">
                    Earliest Available Time
                  </label>
                  <input
                    type="time"
                    id="dayJobCutoff"
                    value={dayJobCutoff}
                    onChange={(e) => setDayJobCutoff(e.target.value)}
                    required={hasDayJob}
                    className="input w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You won&apos;t be scheduled for shifts starting before this
                    time
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Venue Preferences */}
          {venues.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Venue Preferences</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag and drop to order venues by preference (most preferred at
                  top)
                </p>
              </div>
              <div className="card-content">
                <div className="space-y-2">
                  {venuePreferences.map((venueId, index) => {
                    const venue = venues.find((v) => v.id === venueId);
                    if (!venue) return null;

                    return (
                      <div
                        key={venueId}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg border border-border
                          bg-card hover:bg-accent cursor-move transition-colors
                          ${draggedIndex === index ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="flex-shrink-0 text-muted-foreground">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{venue.name}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          #{index + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {venuePreferences.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No venues available
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Availability Settings */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Availability Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure how your availability is managed
              </p>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoSubmit"
                  checked={autoSubmitAvailability}
                  onChange={(e) => setAutoSubmitAvailability(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="autoSubmit" className="cursor-pointer">
                  Auto-submit availability on deadline
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                If enabled, your availability will automatically be submitted
                when the deadline passes. Otherwise, you must manually submit.
              </p>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                Notification Preferences
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you want to be notified
              </p>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="emailNotif"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="emailNotif" className="cursor-pointer">
                  Email notifications
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pushNotif"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="pushNotif" className="cursor-pointer">
                  Push notifications
                </label>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="quietHours"
                    checked={quietHoursEnabled}
                    onChange={(e) => setQuietHoursEnabled(e.target.checked)}
                    className="checkbox"
                  />
                  <label htmlFor="quietHours" className="cursor-pointer">
                    Enable quiet hours
                  </label>
                </div>

                {quietHoursEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label htmlFor="quietStart" className="form-label">
                        Start Time
                      </label>
                      <input
                        type="time"
                        id="quietStart"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        required={quietHoursEnabled}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="quietEnd" className="form-label">
                        End Time
                      </label>
                      <input
                        type="time"
                        id="quietEnd"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        required={quietHoursEnabled}
                        className="input w-full"
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  During quiet hours, push notifications will be silenced and
                  sent via email instead
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="btn btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
