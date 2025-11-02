'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { Breadcrumb } from '@/components/breadcrumb';
import { UserMenu } from '@/components/user-menu';
import { TimePicker } from '@/components/time-picker';
import { Toast } from '@/components/toast';

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
    sms?: boolean;
    phoneNumber?: string;
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
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [venuePreferences, setVenuePreferences] = useState<string[]>([]);
  const [defaultAvailability, setDefaultAvailability] = useState<
    Record<string, boolean>
  >({
    '0': true, // Sunday
    '1': true, // Monday
    '2': true, // Tuesday
    '3': true, // Wednesday
    '4': true, // Thursday
    '5': true, // Friday
    '6': true, // Saturday
  });
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
        // Normalize day job cutoff to hourly (remove minutes)
        const dayJobTime = profileData.dayJobCutoff || '';
        let normalizedDayJobTime = '';
        if (dayJobTime) {
          const [hours] = dayJobTime.split(':');
          normalizedDayJobTime = `${hours}:00`;
        }
        setDayJobCutoff(normalizedDayJobTime);
        setAutoSubmitAvailability(profileData.autoSubmitAvailability);

        // Set default availability if exists
        if (profileData.defaultAvailability) {
          setDefaultAvailability(
            profileData.defaultAvailability as Record<string, boolean>
          );
        }

        if (profileData.notificationPrefs) {
          setEmailNotifications(profileData.notificationPrefs.email ?? true);
          setPushNotifications(false); // Always disabled - coming soon
          setSmsNotifications(profileData.notificationPrefs.sms ?? true);
          setPhoneNumber(profileData.notificationPrefs.phoneNumber ?? '');
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
        hasDayJob,
        dayJobCutoff: hasDayJob && dayJobCutoff ? dayJobCutoff : null,
        preferredVenuesOrder: venuePreferences,
        defaultAvailability,
        autoSubmitAvailability,
        notificationPrefs: {
          email: emailNotifications,
          push: false, // Disabled - coming soon
          sms: smsNotifications,
          // Don't update phoneNumber - it's locked by manager
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </PremiumLayout>
    );
  }

  if (!profile) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-destructive">Failed to load profile</p>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Profile Settings
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-400 mt-1">
                  Manage your personal information and preferences
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb />
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Main Content Grid - Above the Fold */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:items-stretch">
              {/* Basic Information */}
              <PremiumCard className="flex flex-col">
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Basic Information
                  </h2>
                  <div className="space-y-2.5">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide"
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={profile.email}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="name"
                        className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide"
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phoneNumber"
                        className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide"
                      >
                        Cell Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={phoneNumber}
                        disabled
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm cursor-not-allowed"
                      />
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
                        If you want to change this, contact your manager
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                        Role
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {profile.role.replace('_', ' ')}
                        </span>
                        {profile.isLead && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                            Lead
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumCard>

              {/* Work Preferences */}
              <PremiumCard className="flex flex-col">
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Work Preferences
                  </h2>
                  <div className="flex-1 flex flex-col space-y-2.5">
                    {/* Day Job Settings */}
                    {profile.role !== 'SUPER_ADMIN' &&
                      profile.role !== 'MANAGER' &&
                      profile.role !== 'GENERAL_MANAGER' && (
                        <>
                          <div className="flex items-center justify-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <input
                              type="checkbox"
                              id="hasDayJob"
                              checked={hasDayJob}
                              onChange={(e) => setHasDayJob(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                            />
                            <label
                              htmlFor="hasDayJob"
                              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                            >
                              I have a day job
                            </label>
                          </div>

                          <div
                            className={`flex-1 flex flex-col ${hasDayJob ? '' : 'justify-center'}`}
                          >
                            {hasDayJob ? (
                              <TimePicker
                                id="dayJobCutoff"
                                label="Earliest Available Time"
                                value={dayJobCutoff}
                                onChange={setDayJobCutoff}
                                required={hasDayJob}
                              />
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                  Enable day job to set availability time
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                    {/* Notification Preferences */}
                    <div className="space-y-2 pt-2 mt-auto">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="emailNotif"
                          checked={emailNotifications}
                          onChange={(e) =>
                            setEmailNotifications(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <label
                          htmlFor="emailNotif"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                        >
                          Email notifications
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pushNotif"
                          checked={pushNotifications}
                          onChange={(e) =>
                            setPushNotifications(e.target.checked)
                          }
                          disabled
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-not-allowed opacity-50"
                        />
                        <label
                          htmlFor="pushNotif"
                          className="text-sm font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        >
                          Push notifications
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 italic">
                            (Coming soon)
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="smsNotif"
                          checked={smsNotifications}
                          onChange={(e) =>
                            setSmsNotifications(e.target.checked)
                          }
                          disabled={!phoneNumber.trim()}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <label
                          htmlFor="smsNotif"
                          className={`text-sm font-medium ${!phoneNumber.trim() ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}
                        >
                          SMS notifications
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumCard>
              {/* Venue Preferences */}
              {profile.role !== 'SUPER_ADMIN' &&
                profile.role !== 'MANAGER' &&
                profile.role !== 'GENERAL_MANAGER' &&
                venues.length > 0 && (
                  <PremiumCard className="flex flex-col">
                    <div className="p-4 flex-1 flex flex-col h-full">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Venue Preferences
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">
                        Drag and drop to order venues by preference (most
                        preferred at top)
                      </p>
                      <div className="space-y-1.5 flex-1 overflow-y-auto min-h-0 -mx-1 px-1">
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
                            flex items-center gap-2 p-2 rounded-lg border border-gray-700 dark:border-gray-600
                            bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-move transition-colors
                            ${draggedIndex === index ? 'opacity-50' : ''}
                          `}
                            >
                              <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                                <svg
                                  className="w-4 h-4"
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
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground dark:text-gray-200 truncate">
                                  {venue.name}
                                </p>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                #{index + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </PremiumCard>
                )}
            </div>

            {/* Default Availability Pattern */}
            {profile.role !== 'SUPER_ADMIN' &&
              profile.role !== 'MANAGER' &&
              profile.role !== 'GENERAL_MANAGER' && (
                <PremiumCard>
                  <div className="p-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                      Default Availability Pattern
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Set your typical weekly availability. This will be used as
                      the default when you open a new month.
                    </p>
                    <div className="grid grid-cols-7 gap-1.5 mb-3">
                      {[
                        'Sunday',
                        'Monday',
                        'Tuesday',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                        'Saturday',
                      ].map((day, index) => (
                        <label
                          key={day}
                          htmlFor={`default-${day}`}
                          className={`
                        flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          (defaultAvailability[index.toString()] ?? true)
                            ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300'
                            : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400'
                        }
                        hover:border-purple-400 dark:hover:border-purple-500
                      `}
                        >
                          <input
                            type="checkbox"
                            id={`default-${day}`}
                            checked={
                              defaultAvailability[index.toString()] ?? true
                            }
                            onChange={(e) => {
                              setDefaultAvailability({
                                ...defaultAvailability,
                                [index.toString()]: e.target.checked,
                              });
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-[10px] font-medium leading-tight">
                            {day.slice(0, 3)}
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoSubmit"
                          checked={autoSubmitAvailability}
                          onChange={(e) =>
                            setAutoSubmitAvailability(e.target.checked)
                          }
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <label
                          htmlFor="autoSubmit"
                          className="text-xs font-medium text-foreground dark:text-gray-300 cursor-pointer"
                        >
                          Auto-submit availability on deadline
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground dark:text-gray-400 mt-1.5">
                        If enabled, your default availability pattern will
                        automatically be submitted when the deadline passes.
                      </p>
                    </div>
                  </div>
                </PremiumCard>
              )}

            {/* Messages */}
            {error && (
              <PremiumCard className="border-red-500/30 bg-gradient-to-br from-red-900/20 to-gray-900/50">
                <div className="p-4 text-red-400">{error}</div>
              </PremiumCard>
            )}

            {success && (
              <Toast
                message={success}
                type="success"
                onClose={() => setSuccess('')}
                duration={3000}
              />
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 mt-6 pb-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </PremiumLayout>
  );
}
