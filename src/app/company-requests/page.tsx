'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';

interface CompanyRequest {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  numberOfVenues: number;
  estimatedUsers: number;
  additionalNotes: string | null;
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'DECLINED';
  reviewedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewedAt: string | null;
  adminNotes: Array<{
    text: string;
    timestamp: string;
    addedById: string;
    addedBy?: { name: string; email: string };
  }> | null;
  createdAt: string;
  updatedAt: string;
}

// Helper to get display labels for statuses
function getStatusLabel(
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'DECLINED'
): string {
  switch (status) {
    case 'PENDING':
      return 'Unreviewed';
    case 'REVIEWED':
      return 'In Progress';
    case 'APPROVED':
      return 'Active';
    case 'DECLINED':
      return 'Archived';
    default:
      return status;
  }
}

// Helper to get status color classes
function getStatusColor(
  status: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'DECLINED'
): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'REVIEWED':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'APPROVED':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'DECLINED':
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

export default function CompanyRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    'ALL' | 'PENDING' | 'REVIEWED' | 'APPROVED' | 'DECLINED'
  >('ALL');
  const [selectedRequest, setSelectedRequest] = useState<CompanyRequest | null>(
    null
  );
  const [newNote, setNewNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (status === 'authenticated') {
      fetchRequests();
    }
  }, [status, router, session?.user?.role]);

  // Open modal if ID is in URL query params
  useEffect(() => {
    if (status === 'authenticated' && requests.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const leadId = params.get('id');
      if (leadId && !selectedRequest) {
        const request = requests.find((r) => r.id === leadId);
        if (request) {
          setSelectedRequest(request);
          // Clean up URL
          const newUrl =
            window.location.pathname +
            (filter !== 'ALL' ? `?status=${filter}` : '');
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
  }, [status, requests, selectedRequest, filter]);

  // Clear new note when request changes
  useEffect(() => {
    if (selectedRequest) {
      setNewNote('');
    }
  }, [selectedRequest]);

  async function fetchRequests() {
    try {
      // Always fetch ALL requests for accurate stats
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateRequestStatus(
    requestId: string,
    newStatus: 'PENDING' | 'REVIEWED' | 'APPROVED' | 'DECLINED'
  ) {
    setUpdating(true);
    try {
      const response = await fetch(`/api/companies/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        await fetchRequests();
        // Update selectedRequest with new data
        const updated = await response.json();
        setSelectedRequest(updated);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  }

  async function addNote() {
    if (!selectedRequest || !newNote.trim() || !session?.user) return;

    const noteText = newNote.trim();
    // Store original request for potential revert
    const originalRequest = { ...selectedRequest };

    // Optimistically add note to local state immediately
    const optimisticNote = {
      text: noteText,
      timestamp: new Date().toISOString(),
      addedById: session.user.id,
      addedBy: {
        name: session.user.name || 'You',
        email: session.user.email || '',
      },
    };

    const updatedRequest = {
      ...selectedRequest,
      adminNotes: [...(selectedRequest.adminNotes || []), optimisticNote],
    };
    setSelectedRequest(updatedRequest);
    setNewNote('');

    setUpdating(true);
    try {
      const response = await fetch(
        `/api/companies/${selectedRequest.id}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: noteText,
          }),
        }
      );

      if (response.ok) {
        // Update selectedRequest with server response (contains accurate timestamp and formatted notes)
        const updated = await response.json();

        // Update both selectedRequest and the requests list to keep them in sync
        setSelectedRequest(updated);
        setRequests((prevRequests) =>
          prevRequests.map((req) => (req.id === updated.id ? updated : req))
        );
      } else {
        // If request failed, revert optimistic update
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save note:', response.status, errorData);
        setSelectedRequest(originalRequest);
        setNewNote(noteText);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      // Revert optimistic update on error
      setSelectedRequest(originalRequest);
      setNewNote(noteText);
    } finally {
      setUpdating(false);
    }
  }

  const filteredRequests = requests.filter(
    (req) => filter === 'ALL' || req.status === filter
  );

  const stats = {
    total: requests.length,
    unreviewed: requests.filter((r) => r.status === 'PENDING').length,
    inProgress: requests.filter((r) => r.status === 'REVIEWED').length,
    active: requests.filter((r) => r.status === 'APPROVED').length,
    archived: requests.filter((r) => r.status === 'DECLINED').length,
  };

  if (status === 'loading' || loading) {
    return (
      <PremiumLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading leads & companies...</p>
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
                  Leads & Companies
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Manage leads and track active companies
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumb />

          {/* Stats Cards */}
          <div className="mb-6">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-400 mb-1">
                System-Wide Summary
              </h3>
              <p className="text-xs text-gray-500">
                Counts reflect all requests in the system, not just the filtered
                view below
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <PremiumCard className="border-gray-700/50 bg-gradient-to-br from-gray-900/50 to-gray-900/30 hover:border-gray-600/50 transition-all">
                <div className="p-4 text-center">
                  <div className="text-3xl font-bold text-gray-100 mb-1">
                    {stats.total}
                  </div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
              </PremiumCard>
              <PremiumCard className="border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 via-gray-900/50 to-gray-900/50 hover:border-yellow-500/30 transition-all">
                <div className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">
                    {stats.unreviewed}
                  </div>
                  <div className="text-xs text-gray-400">Unreviewed</div>
                </div>
              </PremiumCard>
              <PremiumCard className="border-blue-500/20 bg-gradient-to-br from-blue-900/10 via-gray-900/50 to-gray-900/50 hover:border-blue-500/30 transition-all">
                <div className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">
                    {stats.inProgress}
                  </div>
                  <div className="text-xs text-gray-400">In Progress</div>
                </div>
              </PremiumCard>
              <PremiumCard className="border-green-500/20 bg-gradient-to-br from-green-900/10 via-gray-900/50 to-gray-900/50 hover:border-green-500/30 transition-all">
                <div className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    {stats.active}
                  </div>
                  <div className="text-xs text-gray-400">Active</div>
                </div>
              </PremiumCard>
              <PremiumCard className="border-gray-500/20 bg-gradient-to-br from-gray-800/10 via-gray-900/50 to-gray-900/50 hover:border-gray-500/30 transition-all">
                <div className="p-4 text-center">
                  <div className="text-3xl font-bold text-gray-400 mb-1">
                    {stats.archived}
                  </div>
                  <div className="text-xs text-gray-400">Archived</div>
                </div>
              </PremiumCard>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'ALL'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800 border border-gray-700'
              }`}
            >
              All
            </button>
            {(['PENDING', 'REVIEWED', 'APPROVED', 'DECLINED'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === status
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800 border border-gray-700'
                  }`}
                >
                  {getStatusLabel(status)}
                </button>
              )
            )}
          </div>

          {/* Requests Table */}
          <PremiumCard>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Company
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Contact
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Details
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Status
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Date
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="font-medium text-gray-100">
                          {request.companyName}
                        </div>
                        {request.additionalNotes && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {request.additionalNotes}
                          </div>
                        )}
                        {request.adminNotes &&
                          request.adminNotes.length > 0 && (
                            <div className="text-xs text-purple-400 mt-1 line-clamp-1 italic">
                              📝{' '}
                              {
                                request.adminNotes[
                                  request.adminNotes.length - 1
                                ]?.text
                              }
                            </div>
                          )}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-200">
                          {request.contactName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {request.contactEmail}
                        </div>
                        {request.contactPhone && (
                          <div className="text-xs text-gray-400">
                            {request.contactPhone}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-300">
                          <div>
                            {request.numberOfVenues} venue
                            {request.numberOfVenues !== 1 ? 's' : ''}
                          </div>
                          <div className="text-gray-400">
                            {request.estimatedUsers} staff
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </div>
                        {request.reviewedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Reviewed:{' '}
                            {new Date(request.reviewedAt).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-purple-400 text-sm font-medium">
                          View / Update
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRequests.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">
                    No {filter === 'ALL' ? '' : filter.toLowerCase()} requests
                    found
                  </p>
                </div>
              )}
            </div>
          </PremiumCard>
        </main>

        {/* Modal for viewing/updating request */}
        {selectedRequest && (
          <>
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
              onClick={() => {
                setSelectedRequest(null);
                setNewNote('');
              }}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4">
              <PremiumCard>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-100">
                      {selectedRequest.companyName}
                    </h2>
                    <button
                      onClick={() => {
                        setSelectedRequest(null);
                        setNewNote('');
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

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Contact Name
                      </label>
                      <div className="text-gray-100">
                        {selectedRequest.contactName}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Email
                      </label>
                      <div className="text-gray-100">
                        <a
                          href={`mailto:${selectedRequest.contactEmail}`}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {selectedRequest.contactEmail}
                        </a>
                      </div>
                    </div>
                    {selectedRequest.contactPhone && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Phone
                        </label>
                        <div className="text-gray-100">
                          <a
                            href={`tel:${selectedRequest.contactPhone}`}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            {selectedRequest.contactPhone}
                          </a>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Number of Venues
                        </label>
                        <div className="text-gray-100">
                          {selectedRequest.numberOfVenues}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Estimated Users
                        </label>
                        <div className="text-gray-100">
                          {selectedRequest.estimatedUsers}
                        </div>
                      </div>
                    </div>
                    {selectedRequest.additionalNotes && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Additional Notes
                        </label>
                        <div className="text-gray-100 bg-gray-800/50 p-3 rounded-lg">
                          {selectedRequest.additionalNotes}
                        </div>
                      </div>
                    )}
                    {selectedRequest.reviewedBy && (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Reviewed By
                        </label>
                        <div className="text-gray-100">
                          {selectedRequest.reviewedBy.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {selectedRequest.reviewedBy.email}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Status
                      </label>
                      <select
                        value={selectedRequest.status}
                        onChange={(e) =>
                          updateRequestStatus(
                            selectedRequest.id,
                            e.target.value as
                              | 'PENDING'
                              | 'REVIEWED'
                              | 'APPROVED'
                              | 'DECLINED'
                          )
                        }
                        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        disabled={updating}
                      >
                        <option value="PENDING">Unreviewed</option>
                        <option value="REVIEWED">In Progress</option>
                        <option value="APPROVED">Active</option>
                        <option value="DECLINED">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Add Note
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add a note (e.g., 'Called and left a message')..."
                          className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                          rows={2}
                          disabled={updating}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              addNote();
                            }
                          }}
                        />
                        <button
                          onClick={addNote}
                          className="px-6 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          disabled={updating || !newNote.trim()}
                        >
                          {updating ? 'Saving...' : 'Add'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Press Cmd/Ctrl+Enter to save
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-2">
                        Notes History
                      </label>
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                        {selectedRequest.adminNotes &&
                        selectedRequest.adminNotes.length > 0 ? (
                          selectedRequest.adminNotes
                            .sort(
                              (a, b) =>
                                new Date(b.timestamp).getTime() -
                                new Date(a.timestamp).getTime()
                            )
                            .map((note, index) => (
                              <div
                                key={index}
                                className="pb-3 border-b border-gray-800/50 last:border-b-0 last:pb-0"
                              >
                                <div className="text-gray-100 text-sm mb-1">
                                  {note.text}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(note.timestamp).toLocaleString(
                                    'en-US',
                                    {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    }
                                  )}
                                  {note.addedBy && ` • ${note.addedBy.name}`}
                                </div>
                              </div>
                            ))
                        ) : (
                          <div className="text-gray-500 text-sm italic">
                            No notes yet
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </>
        )}
      </div>
    </PremiumLayout>
  );
}
