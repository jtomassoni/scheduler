'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';
import { Toast } from '@/components/toast';
import { formatName } from '@/lib/utils';

interface StaffMember {
  id: string;
  email: string;
  name: string;
  phoneNumber: string | null;
  role: string;
  status: string;
  isLead: boolean;
  hasDayJob: boolean;
  dayJobCutoff: string | null;
  preferredVenuesOrder?: string[];
  venueRankings?: Record<string, number> | null;
}

interface Venue {
  id: string;
  name: string;
}

type FilterRole =
  | 'all'
  | 'BARTENDER'
  | 'BARBACK'
  | 'MANAGER'
  | 'GENERAL_MANAGER';
type FilterStatus = 'all' | 'ACTIVE' | 'INACTIVE';

export default function StaffPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(
    new Set()
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState<string | null>(null);
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editRole, setEditRole] = useState<
    'BARTENDER' | 'BARBACK' | 'MANAGER' | 'GENERAL_MANAGER'
  >('BARTENDER');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editIsLead, setEditIsLead] = useState(false);
  const [editHasDayJob, setEditHasDayJob] = useState(false);
  const [editDayJobCutoff, setEditDayJobCutoff] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueIds, setSelectedVenueIds] = useState<Set<string>>(
    new Set()
  );
  const [sortField, setSortField] = useState<
    'name' | 'email' | 'role' | 'status' | 'venue'
  >('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [groupByVenue, setGroupByVenue] = useState(false);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const userRole = session?.user?.role as string | undefined;
  const isManager =
    userRole === 'MANAGER' ||
    userRole === 'GENERAL_MANAGER' ||
    userRole === 'SUPER_ADMIN';

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
    async function fetchStaff() {
      try {
        const response = await fetch(`/api/users?t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch staff');
        }
        const data = await response.json();
        setStaff(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load staff');
      } finally {
        setLoading(false);
      }
    }

    async function fetchVenues() {
      try {
        const response = await fetch('/api/venues');
        if (response.ok) {
          const data = await response.json();
          setVenues(data);
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      }
    }

    if (status === 'authenticated' && isManager) {
      fetchStaff();
      fetchVenues();
    }
  }, [status, isManager]);

  // Refresh data when page becomes visible (handles changes made in other tabs/pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        status === 'authenticated' &&
        isManager &&
        !loading
      ) {
        fetch(`/api/users?t=${Date.now()}`)
          .then((res) => res.json())
          .then((data) => setStaff(data))
          .catch((err) => console.error('Failed to refresh staff:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, isManager, loading]);

  // Filter and search staff
  const filteredStaff = staff.filter((member) => {
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus =
      filterStatus === 'all' || member.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
  });

  // Get venue name for a staff member
  function getStaffMemberVenues(staffMember: StaffMember): string {
    if (
      !staffMember.preferredVenuesOrder ||
      staffMember.preferredVenuesOrder.length === 0
    ) {
      return 'No venues';
    }
    const venueNames = staffMember.preferredVenuesOrder
      .map((venueId) => {
        const venue = venues.find((v) => v.id === venueId);
        return venue ? venue.name : venueId;
      })
      .join(', ');
    return venueNames;
  }

  // Get primary venue for sorting (first venue or 'No venues')
  function getPrimaryVenue(staffMember: StaffMember): string {
    if (
      !staffMember.preferredVenuesOrder ||
      staffMember.preferredVenuesOrder.length === 0
    ) {
      return 'zzz_no_venues'; // Sort to end
    }
    const firstVenue = venues.find(
      (v) => v.id === staffMember.preferredVenuesOrder![0]
    );
    return firstVenue ? firstVenue.name : staffMember.preferredVenuesOrder[0];
  }

  // Sort filtered staff
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'email':
        aValue = a.email.toLowerCase();
        bValue = b.email.toLowerCase();
        break;
      case 'role':
        aValue = a.role;
        bValue = b.role;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'venue':
        aValue = getPrimaryVenue(a);
        bValue = getPrimaryVenue(b);
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Group by venue if enabled
  const groupedStaff = groupByVenue
    ? sortedStaff.reduce(
        (acc, member) => {
          const venueKey = getPrimaryVenue(member);
          if (!acc[venueKey]) {
            acc[venueKey] = [];
          }
          acc[venueKey].push(member);
          return acc;
        },
        {} as Record<string, StaffMember[]>
      )
    : null;

  function handleSort(field: 'name' | 'email' | 'role' | 'status' | 'venue') {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function SortIcon({
    field,
  }: {
    field: 'name' | 'email' | 'role' | 'status' | 'venue';
  }) {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-500 ml-1 inline-block"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg
        className="w-4 h-4 text-purple-400 ml-1 inline-block"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-purple-400 ml-1 inline-block"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  }

  const allSelected =
    sortedStaff.length > 0 &&
    sortedStaff.every((m) => selectedStaffIds.has(m.id));
  const someSelected = sortedStaff.some((m) => selectedStaffIds.has(m.id));

  function toggleStaffSelection(id: string) {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedStaffIds(new Set());
    } else {
      setSelectedStaffIds(new Set(filteredStaff.map((m) => m.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedStaffIds.size === 0) {
      setError('Please select at least one staff member');
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const userIds = Array.from(selectedStaffIds);
      const selectedStaff = staff.filter((m) => userIds.includes(m.id));

      const promises = selectedStaff.map(async (member) => {
        const response = await fetch(`/api/users/${member.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: 'Unknown error' }));
          return {
            success: false,
            userId: member.id,
            name: member.name,
            error:
              errorData.error ||
              `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        return { success: true, userId: member.id };
      });

      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.success) as Array<{
        success: false;
        userId: string;
        name: string;
        error: string;
      }>;
      const succeeded = results.filter((r) => r.success);

      if (failed.length > 0) {
        const failedNames = failed.map((f) => f.name).join(', ');
        const errorMessages = failed
          .map((f) => `${f.name}: ${f.error}`)
          .join('; ');
        setError(
          `Failed to delete ${failed.length} staff member(s): ${failedNames}. Errors: ${errorMessages}`
        );

        // If some succeeded, refresh the list
        if (succeeded.length > 0) {
          const response = await fetch(`/api/users?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            setStaff(data);
            setSelectedStaffIds(new Set());
          }
        }
        setDeleting(false);
        setShowDeleteModal(false);
        return;
      }

      // Refresh staff list
      const response = await fetch(`/api/users?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
        setSelectedStaffIds(new Set());
        setShowDeleteModal(false);
        setSuccess(`Deleted ${userIds.length} staff member(s) successfully!`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff');
    } finally {
      setDeleting(false);
    }
  }

  function openEditModal(member: StaffMember) {
    setEditingStaff(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhoneNumber(member.phoneNumber || '');
    setEditRole(
      member.role as 'BARTENDER' | 'BARBACK' | 'MANAGER' | 'GENERAL_MANAGER'
    );
    setEditStatus(member.status as 'ACTIVE' | 'INACTIVE');
    // Barbacks cannot be leads, so set to false if role is BARBACK
    setEditIsLead(member.role === 'BARBACK' ? false : member.isLead);
    setEditHasDayJob(member.hasDayJob);
    setEditDayJobCutoff(member.dayJobCutoff || '');
    setSelectedVenueIds(new Set(member.preferredVenuesOrder || []));
    setShowEditModal(true);
    setError('');
    setSuccess('');
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingStaff(null);
    setSelectedVenueIds(new Set());
    setError('');
    setSuccess('');
  }

  async function handleSingleDelete() {
    if (!deletingStaffId) return;

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/users/${deletingStaffId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || 'Failed to delete staff member');
      }

      // Refresh staff list
      const refreshResponse = await fetch(`/api/users?t=${Date.now()}`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setStaff(data);
      }

      setShowSingleDeleteModal(false);
      setDeletingStaffId(null);
      setSuccess('Staff member deleted successfully!');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete staff member'
      );
    } finally {
      setDeleting(false);
    }
  }

  function openDeleteModal(staffId: string) {
    setDeletingStaffId(staffId);
    setShowSingleDeleteModal(true);
    setError('');
    setSuccess('');
  }

  function toggleVenue(venueId: string) {
    setSelectedVenueIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(venueId)) {
        newSet.delete(venueId);
      } else {
        newSet.add(venueId);
      }
      return newSet;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData: {
        name?: string;
        email?: string;
        phoneNumber?: string | null;
        role?: 'BARTENDER' | 'BARBACK' | 'MANAGER' | 'GENERAL_MANAGER';
        status?: 'ACTIVE' | 'INACTIVE';
        isLead?: boolean;
        hasDayJob?: boolean;
        dayJobCutoff?: string | null;
        preferredVenuesOrder?: string[];
      } = {
        name: editName,
        email: editEmail,
        phoneNumber: editPhoneNumber || null,
        status: editStatus,
        isLead: editIsLead,
        // hasDayJob and dayJobCutoff are managed by the user, not managers
        preferredVenuesOrder: Array.from(selectedVenueIds),
      };

      // Only super admins can change roles
      if (isSuperAdmin && editRole !== editingStaff.role) {
        updateData.role = editRole;
      }

      const response = await fetch(`/api/users/${editingStaff.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update staff member');
      }

      const updatedStaff = await response.json();

      // Refresh the entire staff list to ensure we have the latest data
      const refreshResponse = await fetch(`/api/users?t=${Date.now()}`);
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setStaff(refreshedData);
      } else {
        // Fallback: update local state if refresh fails
        setStaff((prev) =>
          prev.map((s) =>
            s.id === updatedStaff.id
              ? {
                  ...updatedStaff,
                  preferredVenuesOrder: Array.from(selectedVenueIds),
                }
              : s
          )
        );
      }

      setSuccess('Staff member updated successfully!');
      setTimeout(() => {
        closeEditModal();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Loading staff...</p>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 mb-6 -mx-4 px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <Breadcrumb
                items={[{ label: 'Dashboard', href: '/dashboard' }]}
                currentLabel="Staff Management"
              />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mt-2">
                Staff Management
              </h1>
            </div>
            <UserMenu />
          </div>
        </div>

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

        {/* Filters and Search */}
        <PremiumCard className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Role
              </label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="BARTENDER">Bartender</option>
                <option value="BARBACK">Barback</option>
                <option value="MANAGER">Manager</option>
                <option value="GENERAL_MANAGER">General Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FilterStatus)
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </PremiumCard>

        {/* Bulk Actions Bar */}
        {selectedStaffIds.size > 0 && (
          <PremiumCard className="mb-4 border-purple-500/50 bg-purple-500/10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-200">
                  {selectedStaffIds.size} staff member
                  {selectedStaffIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedStaffIds(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Clear selection
                </button>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 rounded-lg border border-red-700 bg-red-900/30 text-red-400 hover:bg-red-900/50 text-sm transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </PremiumCard>
        )}

        {/* Staff List */}
        <PremiumCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-lg font-semibold text-gray-100">
                Staff Members ({sortedStaff.length})
              </h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByVenue}
                  onChange={(e) => setGroupByVenue(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Group by Venue</span>
              </label>
            </div>

            {sortedStaff.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No staff members found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300 w-12">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input)
                              input.indeterminate =
                                someSelected && !allSelected;
                          }}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('name')}
                      >
                        Name
                        <SortIcon field="name" />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('email')}
                      >
                        Email
                        <SortIcon field="email" />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Phone
                      </th>
                      <th
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('venue')}
                      >
                        Venues
                        <SortIcon field="venue" />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('role')}
                      >
                        Role
                        <SortIcon field="role" />
                      </th>
                      <th
                        className="text-left py-3 px-4 text-sm font-semibold text-gray-300 cursor-pointer hover:text-gray-200 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        <SortIcon field="status" />
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Lead
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStaff.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedStaffIds.has(member.id)}
                            onChange={() => toggleStaffSelection(member.id)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-200">
                          {formatName(member.name)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {member.email}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {member.phoneNumber || '—'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          <span className="text-xs">
                            {getStaffMemberVenues(member)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getRoleBadgeClasses(member.role)}`}
                          >
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              member.status === 'ACTIVE'
                                ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {member.isLead ? (
                            <span className="text-yellow-400">⭐</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(member)}
                              className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <span className="text-gray-600">•</span>
                            <button
                              onClick={() => openDeleteModal(member.id)}
                              className="text-red-400 hover:text-red-300 transition-colors text-sm"
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </PremiumCard>

        {/* Edit Modal */}
        {showEditModal && editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-100">
                  Edit Staff Member
                </h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                {/* Three-column compact layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Column 1: Basic Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-1.5">
                      Basic Information
                    </h3>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editPhoneNumber}
                        onChange={(e) => setEditPhoneNumber(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) =>
                          setEditStatus(e.target.value as 'ACTIVE' | 'INACTIVE')
                        }
                        required
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>

                    {isSuperAdmin && (
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1.5">
                          Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editRole}
                          onChange={(e) =>
                            setEditRole(
                              e.target.value as
                                | 'BARTENDER'
                                | 'BARBACK'
                                | 'MANAGER'
                                | 'GENERAL_MANAGER'
                            )
                          }
                          required
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                        >
                          <option value="BARTENDER">Bartender</option>
                          <option value="BARBACK">Barback</option>
                          <option value="MANAGER">Manager</option>
                          <option value="GENERAL_MANAGER">
                            General Manager
                          </option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Role & Preferences */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-1.5">
                      Role & Preferences
                    </h3>

                    {/* Only show lead checkbox for bartenders */}
                    {editRole === 'BARTENDER' && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-700 bg-gray-800/30 hover:bg-gray-800/40 transition-colors">
                        <input
                          type="checkbox"
                          id="editIsLead"
                          checked={editIsLead}
                          onChange={(e) => setEditIsLead(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-1"
                        />
                        <label
                          htmlFor="editIsLead"
                          className="text-xs font-medium text-gray-300 cursor-pointer flex-1"
                        >
                          Designated as Lead
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-700 bg-gray-800/20 opacity-75">
                      <input
                        type="checkbox"
                        id="editHasDayJob"
                        checked={editHasDayJob}
                        disabled
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 cursor-not-allowed"
                      />
                      <label
                        htmlFor="editHasDayJob"
                        className="text-xs font-medium text-gray-400 cursor-not-allowed flex-1"
                      >
                        Has Day Job
                        <span className="ml-1.5 text-xs text-gray-500">
                          (user)
                        </span>
                      </label>
                    </div>

                    {editHasDayJob && (
                      <div className="p-2.5 rounded-lg border border-gray-700 bg-gray-800/20 opacity-75">
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">
                          Day Job Cutoff Time
                        </label>
                        <input
                          type="time"
                          value={editDayJobCutoff}
                          disabled
                          className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-700 bg-gray-700 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          (managed by user)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Venue Assignments */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-1.5">
                      Venue Assignments
                    </h3>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">
                        Venues This Staff Member Can Work At
                      </label>
                      <div className="grid grid-cols-1 gap-2 p-3 rounded-lg border border-gray-700 bg-gray-800/30 max-h-80 overflow-y-auto">
                        {venues.map((venue) => (
                          <label
                            key={venue.id}
                            htmlFor={`venue-${venue.id}`}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                              selectedVenueIds.has(venue.id)
                                ? 'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/15'
                                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800/70'
                            }`}
                          >
                            <input
                              type="checkbox"
                              id={`venue-${venue.id}`}
                              checked={selectedVenueIds.has(venue.id)}
                              onChange={() => toggleVenue(venue.id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-1 cursor-pointer flex-shrink-0"
                            />
                            <span
                              className={`text-xs font-medium cursor-pointer flex-1 select-none ${
                                selectedVenueIds.has(venue.id)
                                  ? 'text-purple-300'
                                  : 'text-gray-300'
                              }`}
                            >
                              {venue.name}
                            </span>
                          </label>
                        ))}
                        {venues.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-4">
                            No venues available
                          </p>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">
                        Use the Scheduling Priority page to set staff priority
                        rankings.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingStaff) {
                        openDeleteModal(editingStaff.id);
                        closeEditModal();
                      }
                    }}
                    disabled={saving || deleting}
                    className="px-4 py-2 text-sm rounded-lg border border-red-700/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete Staff Member
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-900 border border-red-700/50 rounded-lg shadow-xl w-full max-w-md m-4">
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-400">
                  Delete Staff Members
                </h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-gray-300 mb-4">
                    Are you sure you want to delete {selectedStaffIds.size}{' '}
                    staff member{selectedStaffIds.size !== 1 ? 's' : ''}? This
                    action cannot be undone.
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <p className="text-sm font-medium text-gray-400 mb-2">
                      Selected staff:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      {staff
                        .filter((m) => selectedStaffIds.has(m.id))
                        .map((member) => (
                          <li key={member.id}>
                            • {member.name} ({member.email})
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Single Delete Confirmation Modal */}
        {showSingleDeleteModal && deletingStaffId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-gray-100">
                  Delete Staff Member
                </h2>
                <button
                  onClick={() => {
                    setShowSingleDeleteModal(false);
                    setDeletingStaffId(null);
                  }}
                  disabled={deleting}
                  className="text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-4">
                {(() => {
                  const member = staff.find((m) => m.id === deletingStaffId);
                  return member ? (
                    <>
                      <div>
                        <p className="text-gray-300 mb-4">
                          Are you sure you want to delete{' '}
                          <span className="font-semibold text-gray-100">
                            {formatName(member.name)}
                          </span>
                          ? This action cannot be undone.
                        </p>
                        <div className="bg-gray-800/50 rounded-lg p-3">
                          <div className="text-sm space-y-1">
                            <p className="text-gray-400">
                              <span className="font-medium text-gray-300">
                                Email:
                              </span>{' '}
                              {member.email}
                            </p>
                            <p className="text-gray-400">
                              <span className="font-medium text-gray-300">
                                Role:
                              </span>{' '}
                              {member.role}
                            </p>
                            {member.preferredVenuesOrder &&
                              member.preferredVenuesOrder.length > 0 && (
                                <p className="text-gray-400">
                                  <span className="font-medium text-gray-300">
                                    Venues:
                                  </span>{' '}
                                  {getStaffMemberVenues(member)}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null;
                })()}

                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setShowSingleDeleteModal(false);
                      setDeletingStaffId(null);
                    }}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSingleDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </PremiumLayout>
  );
}
