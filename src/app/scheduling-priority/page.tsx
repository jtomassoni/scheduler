'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { Toast } from '@/components/toast';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isLead: boolean;
  preferredVenuesOrder?: string[];
  venueRankings?: Record<string, number> | null;
}

interface Venue {
  id: string;
  name: string;
}

export default function SchedulingPriorityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<{
    section: string;
    index: number;
  } | null>(null);

  const userRole = session?.user?.role as string | undefined;
  const isManager =
    userRole === 'MANAGER' ||
    userRole === 'GENERAL_MANAGER' ||
    userRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (!isManager) {
      router.push('/dashboard');
    }
  }, [isManager, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [staffResponse, venuesResponse] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/venues'),
        ]);

        if (!staffResponse.ok || !venuesResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const staffData = await staffResponse.json();
        const venuesData = await venuesResponse.json();

        // Filter to only active staff (bartenders and barbacks)
        const activeStaff = staffData.filter(
          (s: StaffMember) =>
            (s.role === 'BARTENDER' || s.role === 'BARBACK') &&
            s.status === 'ACTIVE'
        );

        setStaff(activeStaff);
        setVenues(venuesData);

        // Set first venue as default if available
        if (venuesData.length > 0 && !selectedVenueId) {
          setSelectedVenueId(venuesData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated' && isManager) {
      fetchData();
    }
  }, [status, isManager, selectedVenueId]);

  // Get staff filtered by venue and sorted by current rankings
  function getStaffForVenue(venueId: string) {
    return staff
      .filter((s) => s.preferredVenuesOrder?.includes(venueId))
      .sort((a, b) => {
        const aRankings = (a.venueRankings as Record<string, number>) || {};
        const bRankings = (b.venueRankings as Record<string, number>) || {};
        const aRanking = aRankings[venueId];
        const bRanking = bRankings[venueId];

        // If both have rankings, sort by ranking
        if (aRanking !== undefined && bRanking !== undefined) {
          return aRanking - bRanking;
        }
        // If only one has ranking, prioritize it
        if (aRanking !== undefined) return -1;
        if (bRanking !== undefined) return 1;

        // Default: leads first, then by name
        if (a.isLead && !b.isLead) return -1;
        if (!a.isLead && b.isLead) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  // Separate staff into sections
  function getStaffSections(venueId: string) {
    const venueStaff = getStaffForVenue(venueId);

    // Leads (only bartenders who are leads and scheduled as leads)
    const leads = venueStaff.filter((s) => s.isLead && s.role === 'BARTENDER');

    // Bartenders: includes both non-lead bartenders AND leads who aren't scheduled as leads
    // But we'll show leads at the top of bartenders list
    const allBartenders = venueStaff.filter((s) => s.role === 'BARTENDER');
    const bartendersLeads = allBartenders.filter(
      (s) => s.isLead && !leads.includes(s)
    );
    const bartendersNonLeads = allBartenders.filter(
      (s) => !s.isLead && !leads.includes(s)
    );

    // Combine: leads first in bartenders list, then non-leads
    const bartenders = [...bartendersLeads, ...bartendersNonLeads];

    // Barbacks
    const barbacks = venueStaff.filter((s) => s.role === 'BARBACK');

    return { leads, bartenders, barbacks };
  }

  // Handle drag and drop
  function handleDragStart(section: string, index: number) {
    setDraggedIndex({ section, index });
  }

  function handleDragOver(e: React.DragEvent, section: string, index: number) {
    e.preventDefault();
    if (
      !draggedIndex ||
      draggedIndex.section !== section ||
      draggedIndex.index === index
    ) {
      return;
    }

    const sections = getStaffSections(selectedVenueId);
    const sectionList = sections[
      section as keyof typeof sections
    ] as StaffMember[];

    const newList = [...sectionList];
    const draggedItem = newList[draggedIndex.index];
    newList.splice(draggedIndex.index, 1);
    newList.splice(index, 0, draggedItem);

    // Calculate rank offsets
    const leadsCount = sections.leads.length;
    const bartendersCount =
      section === 'bartenders' ? newList.length : sections.bartenders.length;
    const barbacksCount =
      section === 'barbacks' ? newList.length : sections.barbacks.length;

    // Update rankings for the reordered section
    const updatedStaff = staff.map((member) => {
      const rankings = {
        ...((member.venueRankings as Record<string, number>) || {}),
      };

      if (!member.preferredVenuesOrder?.includes(selectedVenueId)) {
        return member;
      }

      // Check if member is in the reordered section
      const newIndex = newList.findIndex((m) => m.id === member.id);

      if (newIndex >= 0) {
        // Member is in the reordered section - assign new rank
        if (section === 'leads') {
          rankings[selectedVenueId] = newIndex + 1;
        } else if (section === 'bartenders') {
          rankings[selectedVenueId] = leadsCount + 1 + newIndex;
        } else if (section === 'barbacks') {
          rankings[selectedVenueId] =
            leadsCount + bartendersCount + 1 + newIndex;
        }
      } else {
        // Member is not in reordered section - preserve their existing ranking or recalculate based on their section
        const isLead = sections.leads.some((l) => l.id === member.id);
        const isBartender = sections.bartenders.some((b) => b.id === member.id);
        const isBarback = sections.barbacks.some((b) => b.id === member.id);

        if (isLead) {
          const leadIndex = sections.leads.findIndex((l) => l.id === member.id);
          rankings[selectedVenueId] = leadIndex + 1;
        } else if (isBartender) {
          const bartenderIndex = sections.bartenders.findIndex(
            (b) => b.id === member.id
          );
          rankings[selectedVenueId] = leadsCount + 1 + bartenderIndex;
        } else if (isBarback) {
          const barbackIndex = sections.barbacks.findIndex(
            (b) => b.id === member.id
          );
          rankings[selectedVenueId] =
            leadsCount + bartendersCount + 1 + barbackIndex;
        }
      }

      return { ...member, venueRankings: rankings };
    });

    setStaff(updatedStaff);
    setDraggedIndex({ section, index });
  }

  // Save rankings (called automatically after drag ends)
  async function saveRankings() {
    if (!selectedVenueId) {
      return; // Can't save without a venue selected
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Update all staff members with their new rankings
      const updatePromises = staff
        .filter((s) => s.preferredVenuesOrder?.includes(selectedVenueId))
        .map(async (member) => {
          const rankings = member.venueRankings || {};

          // Only update if ranking exists for this venue
          if (rankings[selectedVenueId] !== undefined) {
            const response = await fetch(`/api/users/${member.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                venueRankings: rankings,
              }),
            });

            if (!response.ok) {
              throw new Error(`Failed to update ${member.name}`);
            }
          }
        });

      await Promise.all(updatePromises);
      setSuccess('Priority updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save priority');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDragEnd() {
    setDraggedIndex(null);
    // Auto-save after drag ends
    if (selectedVenueId) {
      await saveRankings();
    }
  }

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </PremiumLayout>
    );
  }

  const sections = selectedVenueId
    ? getStaffSections(selectedVenueId)
    : { leads: [], bartenders: [], barbacks: [] };

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Scheduling Priority
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Drag and drop to set staff scheduling priority by venue
                  (auto-saves)
                </p>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumb
            items={[{ label: 'Dashboard', href: '/dashboard' }]}
            currentLabel="Scheduling Priority"
          />

          {error && (
            <Toast message={error} type="error" onClose={() => setError('')} />
          )}
          {success && (
            <Toast
              message={success}
              type="success"
              onClose={() => setSuccess('')}
            />
          )}

          <PremiumCard className="mb-6">
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              >
                <option value="">Select a venue...</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
          </PremiumCard>

          {selectedVenueId && (
            <>
              {/* Leads Section */}
              <PremiumCard className="mb-4">
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Leads
                  </h2>
                  <div className="space-y-2">
                    {sections.leads.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No leads assigned to this venue
                      </p>
                    ) : (
                      sections.leads.map((member, index) => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={() => handleDragStart('leads', index)}
                          onDragOver={(e) => handleDragOver(e, 'leads', index)}
                          onDragEnd={handleDragEnd}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-gray-700
                            bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-move transition-all
                            ${draggedIndex?.section === 'leads' && draggedIndex.index === index ? 'opacity-50' : ''}
                          `}
                        >
                          <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {member.email}
                            </p>
                          </div>
                          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                            #
                            {((member.venueRankings as Record<
                              string,
                              number
                            >) || {})[selectedVenueId] || index + 1}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </PremiumCard>

              {/* Bartenders Section */}
              <PremiumCard className="mb-4">
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Bartenders
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Leads who aren&apos;t scheduled as leads appear at the top
                  </p>
                  <div className="space-y-2">
                    {sections.bartenders.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No bartenders assigned to this venue
                      </p>
                    ) : (
                      sections.bartenders.map((member, index) => {
                        const isLeadButNotLeadRole =
                          member.isLead && member.role === 'BARTENDER';
                        const baseRank = sections.leads.length + 1;
                        return (
                          <div
                            key={member.id}
                            draggable
                            onDragStart={() =>
                              handleDragStart('bartenders', index)
                            }
                            onDragOver={(e) =>
                              handleDragOver(e, 'bartenders', index)
                            }
                            onDragEnd={handleDragEnd}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border
                              ${
                                isLeadButNotLeadRole
                                  ? 'border-yellow-500/50 bg-yellow-500/10 dark:bg-yellow-500/10'
                                  : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30'
                              }
                              hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-move transition-all
                              ${draggedIndex?.section === 'bartenders' && draggedIndex.index === index ? 'opacity-50' : ''}
                            `}
                          >
                            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
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
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                  {member.name}
                                </p>
                                {isLeadButNotLeadRole && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                                    Lead
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {member.email}
                              </p>
                            </div>
                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              #
                              {((member.venueRankings as Record<
                                string,
                                number
                              >) || {})[selectedVenueId] || baseRank + index}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </PremiumCard>

              {/* Barbacks Section */}
              <PremiumCard className="mb-6">
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Barbacks
                  </h2>
                  <div className="space-y-2">
                    {sections.barbacks.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        No barbacks assigned to this venue
                      </p>
                    ) : (
                      sections.barbacks.map((member, index) => {
                        const baseRank =
                          sections.leads.length +
                          sections.bartenders.length +
                          1;
                        return (
                          <div
                            key={member.id}
                            draggable
                            onDragStart={() =>
                              handleDragStart('barbacks', index)
                            }
                            onDragOver={(e) =>
                              handleDragOver(e, 'barbacks', index)
                            }
                            onDragEnd={handleDragEnd}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-gray-700
                              bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-move transition-all
                              ${draggedIndex?.section === 'barbacks' && draggedIndex.index === index ? 'opacity-50' : ''}
                            `}
                          >
                            <div className="flex-shrink-0 text-gray-500 dark:text-gray-400">
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                {member.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {member.email}
                              </p>
                            </div>
                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              #
                              {((member.venueRankings as Record<
                                string,
                                number
                              >) || {})[selectedVenueId] || baseRank + index}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </PremiumCard>

              {saving && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  <span>Saving...</span>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}
