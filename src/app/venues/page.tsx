'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { formatName } from '@/lib/utils';

interface Venue {
  id: string;
  name: string;
  isNetworked: boolean;
  availabilityDeadlineDay: number;
  tipPoolEnabled: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  managers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

type SortField =
  | 'name'
  | 'createdAt'
  | 'availabilityDeadlineDay'
  | 'isNetworked'
  | 'tipPoolEnabled';
type SortDirection = 'asc' | 'desc';

interface Manager {
  id: string;
  name: string;
  email: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  preferredVenuesOrder?: string[];
}

export default function VenuesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [venueStaff, setVenueStaff] = useState<StaffMember[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [assignedStaffIds, setAssignedStaffIds] = useState<Set<string>>(
    new Set()
  );
  const [unassignedStaffIds, setUnassignedStaffIds] = useState<Set<string>>(
    new Set()
  );
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // Staff filtering/sorting/grouping state (for add staff section)
  const [staffFilterRole, setStaffFilterRole] = useState<
    'all' | 'BARTENDER' | 'BARBACK' | 'MANAGER' | 'GENERAL_MANAGER'
  >('all');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffSortField, setStaffSortField] = useState<
    'name' | 'email' | 'role'
  >('name');
  const [staffSortDirection, setStaffSortDirection] = useState<'asc' | 'desc'>(
    'asc'
  );
  const [staffGroupByRole, setStaffGroupByRole] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [isNetworked, setIsNetworked] = useState(true);
  const [availabilityDeadlineDay, setAvailabilityDeadlineDay] = useState(10);
  const [tipPoolEnabled, setTipPoolEnabled] = useState(false);
  const [venueStatus, setVenueStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    'ACTIVE'
  );
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);

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

  useEffect(() => {
    async function fetchManagers() {
      if (!showCreateModal && !showEditModal) return;
      try {
        const response = await fetch('/api/users?role=MANAGER');
        if (response.ok) {
          const data = await response.json();
          setManagers(data);
        }
      } catch (err) {
        console.error('Failed to fetch managers:', err);
      }
    }

    if (status === 'authenticated' && (showCreateModal || showEditModal)) {
      fetchManagers();
    }
  }, [status, showCreateModal, showEditModal]);

  useEffect(() => {
    async function fetchAllStaff() {
      if (!showEditModal || !editingVenue) return;

      setLoadingStaff(true);
      try {
        // Fetch fresh staff data (cache-bust to ensure we get latest assignments)
        const response = await fetch(`/api/users?t=${Date.now()}`);
        if (response.ok) {
          const staffData = await response.json();
          setAllStaff(staffData);

          // Find staff who have this venue in their preferredVenuesOrder
          const venueId = editingVenue.id;
          const staffAtVenue = staffData.filter((staff: StaffMember) => {
            const hasVenue =
              staff.preferredVenuesOrder?.includes(venueId) || false;
            return hasVenue;
          });

          setVenueStaff(staffAtVenue);

          // Set assigned staff IDs
          const assignedIds = new Set<string>(
            staffAtVenue.map((staff: StaffMember) => staff.id)
          );
          setAssignedStaffIds(assignedIds);
          setUnassignedStaffIds(new Set<string>());

          // Debug log
          console.log('Venue ID:', venueId);
          console.log('Assigned staff count:', assignedIds.size);
          console.log('Assigned staff:', Array.from(assignedIds));
        }
      } catch (err) {
        console.error('Failed to fetch staff:', err);
      } finally {
        setLoadingStaff(false);
      }
    }

    if (status === 'authenticated' && showEditModal && editingVenue) {
      fetchAllStaff();
    }
  }, [status, showEditModal, editingVenue]);

  function toggleManager(managerId: string) {
    setSelectedManagerIds((prev) =>
      prev.includes(managerId)
        ? prev.filter((id) => id !== managerId)
        : [...prev, managerId]
    );
  }

  function resetForm() {
    setName('');
    setIsNetworked(true);
    setAvailabilityDeadlineDay(10);
    setTipPoolEnabled(false);
    setVenueStatus('ACTIVE');
    setSelectedManagerIds([]);
    setCreateError('');
    setShowSuccess(false);
  }

  function openEditModal(venue: Venue) {
    setEditingVenue(venue);
    setName(venue.name);
    setIsNetworked(venue.isNetworked);
    setAvailabilityDeadlineDay(venue.availabilityDeadlineDay);
    setTipPoolEnabled(venue.tipPoolEnabled);
    setVenueStatus(venue.status || 'ACTIVE');
    setSelectedManagerIds(venue.managers?.map((m) => m.id) || []);
    setVenueStaff([]);
    setAllStaff([]);
    setAssignedStaffIds(new Set());
    setUnassignedStaffIds(new Set());
    setShowAddStaff(false);
    // Reset staff filters
    setStaffFilterRole('all');
    setStaffSearchQuery('');
    setStaffSortField('name');
    setStaffSortDirection('asc');
    setStaffGroupByRole(false);
    setShowEditModal(true);
    setCreateError('');
    setShowSuccess(false);
  }

  function removeStaffFromVenue(staffId: string) {
    setAssignedStaffIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(staffId);
      return newSet;
    });
  }

  function addStaffToVenue(staffId: string) {
    setAssignedStaffIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(staffId);
      return newSet;
    });
    setUnassignedStaffIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(staffId);
      return newSet;
    });
  }

  function toggleUnassignedStaff(staffId: string) {
    setUnassignedStaffIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(staffId)) {
        newSet.delete(staffId);
      } else {
        newSet.add(staffId);
      }
      return newSet;
    });
  }

  function addSelectedUnassignedStaff() {
    unassignedStaffIds.forEach((staffId) => {
      addStaffToVenue(staffId);
    });
    setUnassignedStaffIds(new Set());
    setShowAddStaff(false);
  }

  function getRoleBadgeClasses(role: string): string {
    switch (role) {
      case 'BARTENDER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'BARBACK':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'MANAGER':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'GENERAL_MANAGER':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingVenue(null);
    resetForm();
  }

  async function handleCreateVenue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setCreateError('');

    try {
      const response = await fetch('/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isNetworked,
          availabilityDeadlineDay,
          tipPoolEnabled,
          status: venueStatus,
          managerIds: selectedManagerIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create venue');
      }

      const newVenue = await response.json();
      setVenues([...venues, newVenue]);
      setShowSuccess(true);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create venue'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVenue) return;

    setSaving(true);
    setCreateError('');

    try {
      // First, update the venue settings
      const response = await fetch(`/api/venues/${editingVenue.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isNetworked,
          availabilityDeadlineDay,
          tipPoolEnabled,
          status: venueStatus,
          managerIds: selectedManagerIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update venue');
      }

      // Then, update staff venue assignments
      const staffUpdates = await Promise.allSettled(
        allStaff.map(async (staff: StaffMember) => {
          const shouldHaveVenue = assignedStaffIds.has(staff.id);
          const currentlyHasVenue =
            staff.preferredVenuesOrder?.includes(editingVenue.id) || false;

          // Only update if the assignment state has changed
          if (shouldHaveVenue !== currentlyHasVenue) {
            const newVenues = shouldHaveVenue
              ? [...(staff.preferredVenuesOrder || []), editingVenue.id]
              : (staff.preferredVenuesOrder || []).filter(
                  (id) => id !== editingVenue.id
                );

            const updateResponse = await fetch(`/api/users/${staff.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                preferredVenuesOrder: newVenues,
              }),
            });

            if (!updateResponse.ok) {
              throw new Error(`Failed to update ${staff.name}`);
            }
          }
        })
      );

      // Check for any failures
      const failures = staffUpdates.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some staff updates failed:', failures);
        // Don't throw - venue was updated successfully, staff updates are secondary
      }

      const updatedVenue = await response.json();
      setVenues(
        venues.map((v) => (v.id === editingVenue.id ? updatedVenue : v))
      );

      // Refresh staff list to reflect changes
      const refreshResponse = await fetch(`/api/users?t=${Date.now()}`);
      if (refreshResponse.ok) {
        const refreshedStaff = await refreshResponse.json();
        const staffAtVenue = refreshedStaff.filter((staff: StaffMember) =>
          staff.preferredVenuesOrder?.includes(editingVenue.id)
        );
        setVenueStaff(staffAtVenue);
        setAllStaff(refreshedStaff);

        // Update assignedStaffIds based on refreshed data
        const assignedIds = new Set<string>(
          staffAtVenue.map((staff: StaffMember) => staff.id)
        );
        setAssignedStaffIds(assignedIds);
      }

      closeEditModal();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to update venue'
      );
    } finally {
      setSaving(false);
    }
  }

  const sortedVenues = useMemo(() => {
    const sorted = [...venues];
    sorted.sort((a, b) => {
      let aVal: string | number | boolean;
      let bVal: string | number | boolean;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'availabilityDeadlineDay':
          aVal = a.availabilityDeadlineDay;
          bVal = b.availabilityDeadlineDay;
          break;
        case 'isNetworked':
          aVal = a.isNetworked ? 1 : 0;
          bVal = b.isNetworked ? 1 : 0;
          break;
        case 'tipPoolEnabled':
          aVal = a.tipPoolEnabled ? 1 : 0;
          bVal = b.tipPoolEnabled ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [venues, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

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
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading venues...</p>
          </div>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Venues
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Manage venue locations and settings
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                  >
                    Create Venue
                  </button>
                )}
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-sm"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {venues.length === 0 ? (
            <PremiumCard>
              <div className="p-12 text-center">
                <p className="text-gray-400 mb-4">No venues found</p>
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                  >
                    Create Your First Venue
                  </button>
                )}
              </div>
            </PremiumCard>
          ) : (
            <PremiumCard>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-700">
                      <tr>
                        <th
                          className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Venue Name
                            {sortField === 'name' && (
                              <span className="text-purple-400">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                          onClick={() => handleSort('isNetworked')}
                        >
                          <div className="flex items-center gap-2">
                            Shared Staff
                            {sortField === 'isNetworked' && (
                              <span className="text-purple-400">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                          onClick={() => handleSort('tipPoolEnabled')}
                        >
                          <div className="flex items-center gap-2">
                            Track Tips
                            {sortField === 'tipPoolEnabled' && (
                              <span className="text-purple-400">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th
                          className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                          onClick={() => handleSort('availabilityDeadlineDay')}
                        >
                          <div className="flex items-center gap-2">
                            Availability Deadline
                            {sortField === 'availabilityDeadlineDay' && (
                              <span className="text-purple-400">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        {isSuperAdmin && (
                          <th className="text-left py-3 px-4 text-gray-300">
                            Managers
                          </th>
                        )}
                        <th
                          className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center gap-2">
                            Created
                            {sortField === 'createdAt' && (
                              <span className="text-purple-400">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="text-right py-3 px-4 text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedVenues.map((venue) => (
                        <tr
                          key={venue.id}
                          className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <button
                              onClick={() => openEditModal(venue)}
                              className="font-semibold text-gray-100 hover:text-purple-400 transition-colors text-left"
                            >
                              {venue.name}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            {venue.isNetworked ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Staff work across venues
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                Single venue only
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {venue.tipPoolEnabled ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                Tracking enabled
                              </span>
                            ) : (
                              <span className="text-gray-500 text-sm">
                                Not tracking
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-300 text-sm">
                            Day {venue.availabilityDeadlineDay} of month
                          </td>
                          {isSuperAdmin && (
                            <td className="py-4 px-4">
                              {venue.managers && venue.managers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {venue.managers.map((manager) => (
                                    <span
                                      key={manager.id}
                                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-800/50 text-gray-300 border border-gray-700/50"
                                    >
                                      {manager.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm">
                                  No managers
                                </span>
                              )}
                            </td>
                          )}
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {new Date(venue.createdAt).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {(isSuperAdmin ||
                                (isManager &&
                                  venue.managers?.some(
                                    (m) => m.id === session?.user?.id
                                  ))) && (
                                <>
                                  <button
                                    onClick={() => openEditModal(venue)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-sm"
                                  >
                                    Edit
                                  </button>
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() =>
                                        handleDelete(venue.id, venue.name)
                                      }
                                      className="px-3 py-1.5 rounded-lg border border-red-700/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-sm"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </PremiumCard>
          )}
        </main>

        {/* Create Venue Modal */}
        {showCreateModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-100">
                    Create Venue
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {showSuccess ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
                      <svg
                        className="w-8 h-8 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-100 mb-3">
                      Venue Created!
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Your venue has been successfully created and added to your
                      account.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          resetForm();
                        }}
                        className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateModal(false);
                          resetForm();
                          router.push('/dashboard');
                        }}
                        className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-gray-300 font-medium"
                      >
                        Want to play around in a demo dashboard?
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateVenue} className="space-y-6">
                    {createError && (
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {createError}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Venue Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        placeholder="e.g., Downtown Bar"
                        disabled={saving}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="isNetworked"
                        checked={isNetworked}
                        onChange={(e) => setIsNetworked(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                        disabled={saving}
                      />
                      <label
                        htmlFor="isNetworked"
                        className="cursor-pointer text-sm text-gray-300"
                      >
                        Allow staff to work at multiple venues
                      </label>
                    </div>

                    <div>
                      <label
                        htmlFor="deadlineDay"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Availability Deadline (Day of Month){' '}
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        id="deadlineDay"
                        value={availabilityDeadlineDay}
                        onChange={(e) =>
                          setAvailabilityDeadlineDay(
                            parseInt(e.target.value) || 10
                          )
                        }
                        min="1"
                        max="28"
                        required
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        disabled={saving}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Staff must submit availability by this day of the month
                        (1-28)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="tipPool"
                        checked={tipPoolEnabled}
                        onChange={(e) => setTipPoolEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                        disabled={saving}
                      />
                      <label
                        htmlFor="tipPool"
                        className="cursor-pointer text-sm text-gray-300"
                      >
                        Track tips for this venue
                      </label>
                    </div>

                    <div>
                      <label
                        htmlFor="status"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Status <span className="text-red-400">*</span>
                      </label>
                      <select
                        id="status"
                        value={venueStatus}
                        onChange={(e) =>
                          setVenueStatus(
                            e.target.value as 'ACTIVE' | 'INACTIVE'
                          )
                        }
                        required
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        disabled={saving}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Assign Managers
                      </label>
                      {managers.length === 0 ? (
                        <div className="p-4 rounded-lg border border-gray-800 bg-gray-800/30 text-center">
                          <p className="text-sm text-gray-400 mb-3">
                            No managers available
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateModal(false);
                              setShowEditModal(false);
                              resetForm();
                              // TODO: Navigate to user creation page or open user creation modal
                              router.push('/users?create=manager');
                            }}
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-500 hover:to-blue-500 transition-all text-sm"
                          >
                            Add Manager
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-800 rounded-lg p-3 bg-gray-800/30">
                          {managers.map((manager) => (
                            <div
                              key={manager.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50"
                            >
                              <input
                                type="checkbox"
                                id={`manager-${manager.id}`}
                                checked={selectedManagerIds.includes(
                                  manager.id
                                )}
                                onChange={() => toggleManager(manager.id)}
                                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                disabled={saving}
                              />
                              <label
                                htmlFor={`manager-${manager.id}`}
                                className="cursor-pointer flex-1 text-sm"
                              >
                                <div className="text-gray-200 font-medium">
                                  {manager.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {manager.email}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          resetForm();
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-sm"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving}
                      >
                        {saving ? 'Creating...' : 'Create Venue'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </>
        )}

        {/* Edit Venue Modal */}
        {showEditModal && editingVenue && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={closeEditModal}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-100">
                    Edit Venue
                  </h2>
                  <button
                    onClick={closeEditModal}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Venue Settings */}
                  <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleUpdateVenue} className="space-y-6">
                      {createError && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                          {createError}
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="edit-name"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Venue Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          id="edit-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          placeholder="e.g., Downtown Bar"
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-isNetworked"
                          checked={isNetworked}
                          onChange={(e) => setIsNetworked(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                          disabled={saving}
                        />
                        <label
                          htmlFor="edit-isNetworked"
                          className="cursor-pointer text-sm text-gray-300"
                        >
                          Allow staff to work at multiple venues
                        </label>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-deadlineDay"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Availability Deadline (Day of Month){' '}
                          <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          id="edit-deadlineDay"
                          value={availabilityDeadlineDay}
                          onChange={(e) =>
                            setAvailabilityDeadlineDay(
                              parseInt(e.target.value) || 10
                            )
                          }
                          min="1"
                          max="28"
                          required
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          disabled={saving}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Staff must submit availability by this day of the
                          month (1-28)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-tipPool"
                          checked={tipPoolEnabled}
                          onChange={(e) => setTipPoolEnabled(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                          disabled={saving}
                        />
                        <label
                          htmlFor="edit-tipPool"
                          className="cursor-pointer text-sm text-gray-300"
                        >
                          Track tips for this venue
                        </label>
                      </div>

                      <div>
                        <label
                          htmlFor="edit-status"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Status <span className="text-red-400">*</span>
                        </label>
                        <select
                          id="edit-status"
                          value={venueStatus}
                          onChange={(e) =>
                            setVenueStatus(
                              e.target.value as 'ACTIVE' | 'INACTIVE'
                            )
                          }
                          required
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          disabled={saving}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>

                      {isSuperAdmin && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Assign Managers
                          </label>
                          {managers.length === 0 ? (
                            <div className="p-4 rounded-lg border border-gray-800 bg-gray-800/30 text-center">
                              <p className="text-sm text-gray-400 mb-3">
                                No managers available
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-800 rounded-lg p-3 bg-gray-800/30">
                              {managers.map((manager) => (
                                <div
                                  key={manager.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-800/50"
                                >
                                  <input
                                    type="checkbox"
                                    id={`edit-manager-${manager.id}`}
                                    checked={selectedManagerIds.includes(
                                      manager.id
                                    )}
                                    onChange={() => toggleManager(manager.id)}
                                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                    disabled={saving}
                                  />
                                  <label
                                    htmlFor={`edit-manager-${manager.id}`}
                                    className="cursor-pointer flex-1 text-sm"
                                  >
                                    <div className="text-gray-200 font-medium">
                                      {manager.name}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {manager.email}
                                    </div>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                        {isSuperAdmin && editingVenue && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                confirm(
                                  `Are you sure you want to delete "${editingVenue.name}"? This cannot be undone.`
                                )
                              ) {
                                try {
                                  const response = await fetch(
                                    `/api/venues/${editingVenue.id}`,
                                    {
                                      method: 'DELETE',
                                    }
                                  );

                                  if (!response.ok) {
                                    const data = await response.json();
                                    throw new Error(
                                      data.error || 'Failed to delete venue'
                                    );
                                  }

                                  setVenues(
                                    venues.filter(
                                      (v) => v.id !== editingVenue.id
                                    )
                                  );
                                  closeEditModal();
                                } catch (err) {
                                  setCreateError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Failed to delete venue'
                                  );
                                }
                              }
                            }}
                            disabled={saving}
                            className="px-4 py-2 rounded-lg border border-red-700/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete Venue
                          </button>
                        )}
                        {!isSuperAdmin && <div />}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={closeEditModal}
                            className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-sm"
                            disabled={saving}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Right Column: Staff Assignment */}
                  <div className="lg:col-span-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                          Staff at This Venue
                        </h3>
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                          {assignedStaffIds.size} assigned
                        </span>
                      </div>

                      {/* Assigned Staff List */}
                      {loadingStaff ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-400">
                            Loading staff...
                          </p>
                        </div>
                      ) : (
                        (() => {
                          // Get assigned staff
                          const assignedStaff = allStaff.filter((staff) =>
                            assignedStaffIds.has(staff.id)
                          );

                          // Sort assigned staff
                          assignedStaff.sort((a, b) => {
                            const aName = formatName(a.name).toLowerCase();
                            const bName = formatName(b.name).toLowerCase();
                            return aName.localeCompare(bName);
                          });

                          return (
                            <div className="space-y-2">
                              {assignedStaff.length === 0 ? (
                                <div className="p-6 rounded-lg border border-gray-800 bg-gray-800/30 text-center">
                                  <p className="text-sm text-gray-400 mb-3">
                                    No staff assigned
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setShowAddStaff(true)}
                                    className="px-3 py-1.5 rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors text-xs"
                                  >
                                    Add Staff
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-800 rounded-lg p-3 bg-gray-800/30">
                                  {assignedStaff.map((staff) => (
                                    <div
                                      key={staff.id}
                                      className="flex items-center justify-between p-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-200 truncate">
                                          {formatName(staff.name)}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate mt-0.5">
                                          {staff.email}
                                        </div>
                                        <div className="mt-1.5">
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeClasses(staff.role)}`}
                                          >
                                            {staff.role}
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeStaffFromVenue(staff.id)
                                        }
                                        className="ml-2 px-2 py-1 text-xs rounded border border-red-700/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                        title="Remove from venue"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {assignedStaff.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAddStaff(!showAddStaff)}
                                  className="w-full px-3 py-2 rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-colors text-xs font-medium"
                                >
                                  {showAddStaff
                                    ? 'Cancel Adding Staff'
                                    : '+ Add Staff'}
                                </button>
                              )}
                            </div>
                          );
                        })()
                      )}

                      {/* Add Staff Section */}
                      {showAddStaff && (
                        <div className="space-y-3 pt-3 border-t border-gray-800">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                              Add Staff
                            </h4>
                            <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                              {unassignedStaffIds.size} selected
                            </span>
                          </div>

                          {/* Filter and Search Controls */}
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Search staff..."
                              value={staffSearchQuery}
                              onChange={(e) =>
                                setStaffSearchQuery(e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={staffFilterRole}
                                onChange={(e) =>
                                  setStaffFilterRole(e.target.value as any)
                                }
                                className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              >
                                <option value="all">All Roles</option>
                                <option value="BARTENDER">Bartenders</option>
                                <option value="BARBACK">Barbacks</option>
                                <option value="MANAGER">Managers</option>
                                <option value="GENERAL_MANAGER">
                                  General Managers
                                </option>
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  if (staffSortField === 'name') {
                                    setStaffSortField('role');
                                    setStaffSortDirection('asc');
                                  } else if (staffSortField === 'role') {
                                    setStaffSortField('name');
                                    setStaffSortDirection('asc');
                                  }
                                }}
                                onDoubleClick={() => {
                                  setStaffSortDirection((prev) =>
                                    prev === 'asc' ? 'desc' : 'asc'
                                  );
                                }}
                                className="px-2 py-1.5 text-xs rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 transition-colors"
                                title="Click to change field, double-click to reverse direction"
                              >
                                {staffSortField === 'name'
                                  ? 'Name'
                                  : staffSortField === 'email'
                                    ? 'Email'
                                    : 'Role'}{' '}
                                {staffSortDirection === 'asc' ? '↑' : '↓'}
                              </button>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={staffGroupByRole}
                                onChange={(e) =>
                                  setStaffGroupByRole(e.target.checked)
                                }
                                className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-xs text-gray-400">
                                Group by role
                              </span>
                            </label>
                          </div>

                          {/* Unassigned Staff List */}
                          {(() => {
                            // Get unassigned staff
                            const unassignedStaff = allStaff.filter(
                              (staff) => !assignedStaffIds.has(staff.id)
                            );

                            // Filter unassigned staff
                            const filteredStaff = unassignedStaff.filter(
                              (staff) => {
                                const matchesRole =
                                  staffFilterRole === 'all' ||
                                  staff.role === staffFilterRole;
                                const matchesSearch =
                                  staffSearchQuery === '' ||
                                  formatName(staff.name)
                                    .toLowerCase()
                                    .includes(staffSearchQuery.toLowerCase()) ||
                                  staff.email
                                    .toLowerCase()
                                    .includes(staffSearchQuery.toLowerCase());
                                return matchesRole && matchesSearch;
                              }
                            );

                            // Sort staff
                            filteredStaff.sort((a, b) => {
                              let aVal: string;
                              let bVal: string;

                              if (staffSortField === 'name') {
                                aVal = formatName(a.name).toLowerCase();
                                bVal = formatName(b.name).toLowerCase();
                              } else if (staffSortField === 'email') {
                                aVal = a.email.toLowerCase();
                                bVal = b.email.toLowerCase();
                              } else {
                                aVal = a.role;
                                bVal = b.role;
                              }

                              if (aVal < bVal)
                                return staffSortDirection === 'asc' ? -1 : 1;
                              if (aVal > bVal)
                                return staffSortDirection === 'asc' ? 1 : -1;
                              return 0;
                            });

                            if (filteredStaff.length === 0) {
                              return (
                                <div className="p-6 rounded-lg border border-gray-800 bg-gray-800/30 text-center">
                                  <p className="text-sm text-gray-400">
                                    No staff found
                                  </p>
                                </div>
                              );
                            }

                            // Group staff if enabled
                            if (staffGroupByRole) {
                              const grouped = filteredStaff.reduce(
                                (acc, staff) => {
                                  const role = staff.role;
                                  if (!acc[role]) acc[role] = [];
                                  acc[role].push(staff);
                                  return acc;
                                },
                                {} as Record<string, typeof filteredStaff>
                              );

                              const roleOrder = [
                                'BARTENDER',
                                'BARBACK',
                                'MANAGER',
                                'GENERAL_MANAGER',
                              ];

                              return (
                                <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-800 rounded-lg p-3 bg-gray-800/30">
                                  {roleOrder.map((role) => {
                                    const roleStaff = grouped[role] || [];
                                    if (roleStaff.length === 0) return null;

                                    return (
                                      <div key={role} className="space-y-2">
                                        <div className="sticky top-0 bg-gray-800/95 backdrop-blur-sm py-1.5 border-b border-gray-700 -mx-1 px-1">
                                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                            {role} ({roleStaff.length})
                                          </h4>
                                        </div>
                                        {roleStaff.map((staff) => {
                                          const isSelected =
                                            unassignedStaffIds.has(staff.id);
                                          return (
                                            <label
                                              key={staff.id}
                                              className="flex items-start gap-3 p-2 rounded-lg border transition-all cursor-pointer border-gray-700 bg-gray-800/50 hover:bg-gray-800/70"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() =>
                                                  toggleUnassignedStaff(
                                                    staff.id
                                                  )
                                                }
                                                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                              />
                                              <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-200 truncate">
                                                  {formatName(staff.name)}
                                                </div>
                                                <div className="text-xs text-gray-400 truncate mt-0.5">
                                                  {staff.email}
                                                </div>
                                                <div className="mt-1.5">
                                                  <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeClasses(staff.role)}`}
                                                  >
                                                    {staff.role}
                                                  </span>
                                                </div>
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }

                            // Non-grouped view
                            return (
                              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-800 rounded-lg p-3 bg-gray-800/30">
                                {filteredStaff.map((staff) => {
                                  const isSelected = unassignedStaffIds.has(
                                    staff.id
                                  );
                                  return (
                                    <label
                                      key={staff.id}
                                      className="flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer border-gray-700 bg-gray-800/50 hover:bg-gray-800/70"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                          toggleUnassignedStaff(staff.id)
                                        }
                                        className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-200 truncate">
                                          {formatName(staff.name)}
                                        </div>
                                        <div className="text-xs text-gray-400 truncate mt-0.5">
                                          {staff.email}
                                        </div>
                                        <div className="mt-1.5">
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleBadgeClasses(staff.role)}`}
                                          >
                                            {staff.role}
                                          </span>
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Add Selected Button */}
                          {unassignedStaffIds.size > 0 && (
                            <button
                              type="button"
                              onClick={addSelectedUnassignedStaff}
                              className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all text-xs"
                            >
                              Add {unassignedStaffIds.size} Staff Member
                              {unassignedStaffIds.size > 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PremiumLayout>
  );
}
