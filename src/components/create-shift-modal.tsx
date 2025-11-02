'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TimePicker } from '@/components/time-picker';

interface Venue {
  id: string;
  name: string;
}

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftCreated?: () => void;
  defaultVenueId?: string;
  defaultDate?: string;
}

export function CreateShiftModal({
  isOpen,
  onClose,
  onShiftCreated,
  defaultVenueId,
  defaultDate,
}: CreateShiftModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [venueId, setVenueId] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('18:00');
  const [bartendersRequired, setBartendersRequired] = useState(1);
  const [barbacksRequired, setBarbacksRequired] = useState(0);
  const [leadsRequired, setLeadsRequired] = useState(0);
  const [eventName, setEventName] = useState('');

  // Reset form when modal opens/closes or defaults change
  useEffect(() => {
    if (isOpen) {
      setVenueId(defaultVenueId || '');
      // Default to today's date if no defaultDate provided
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setDate(defaultDate || todayStr);
      setStartTime('18:00');
      setBartendersRequired(1);
      setBarbacksRequired(0);
      setLeadsRequired(0);
      setEventName('');
      setError('');
    }
  }, [isOpen, defaultVenueId, defaultDate]);

  // Fetch venues
  useEffect(() => {
    async function fetchVenues() {
      try {
        const response = await fetch('/api/venues');
        if (response.ok) {
          const data = await response.json();
          setVenues(data);

          // Set default venue if not provided
          if (!defaultVenueId && data.length > 0) {
            setVenueId(data[0].id);
          } else if (
            defaultVenueId &&
            data.find((v: Venue) => v.id === defaultVenueId)
          ) {
            setVenueId(defaultVenueId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch venues:', err);
      }
    }

    if (isOpen) {
      fetchVenues();
    }
  }, [isOpen, defaultVenueId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }

      // Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form && !saving) {
          form.requestSubmit();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, saving]);

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
          endTime: '02:00', // Default end time
          bartendersRequired,
          barbacksRequired,
          leadsRequired,
          eventName: eventName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create shift');
      }

      const newShift = await response.json();

      // Notify parent that shift was created
      if (onShiftCreated) {
        onShiftCreated();
      }

      // Close modal and redirect to shift detail page
      onClose();
      router.push(`/shifts/${newShift.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shift');
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 sm:p-5 max-w-5xl w-full shadow-xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              Create Shift
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 hidden sm:block">
              Add a new shift to the schedule
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 -m-2 min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center flex-shrink-0"
            disabled={saving}
            aria-label="Close modal"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shift Details - 2 Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Shift Details
              </h3>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="eventName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Event Name (Optional)
              </label>
              <input
                type="text"
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Taylor Swift Concert"
                className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-base sm:text-sm min-h-[44px] touch-manipulation"
              />
            </div>

            <div>
              <label
                htmlFor="venue"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Venue <span className="text-red-500">*</span>
              </label>
              <select
                id="venue"
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-base sm:text-sm min-h-[44px] touch-manipulation"
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-base sm:text-sm min-h-[44px] touch-manipulation"
              />
            </div>

            <div>
              <TimePicker
                id="startTime"
                label="Start Time"
                value={startTime}
                onChange={setStartTime}
                required
              />
            </div>
          </div>

          {/* Staffing Requirements */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Staffing Requirements
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="bartenders"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Bartenders
                </label>
                <input
                  type="number"
                  id="bartenders"
                  value={bartendersRequired}
                  onChange={(e) =>
                    setBartendersRequired(parseInt(e.target.value) || 0)
                  }
                  min="0"
                  required
                  className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-base sm:text-sm min-h-[44px] touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div>
                <label
                  htmlFor="barbacks"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Barbacks
                </label>
                <input
                  type="number"
                  id="barbacks"
                  value={barbacksRequired}
                  onChange={(e) =>
                    setBarbacksRequired(parseInt(e.target.value) || 0)
                  }
                  min="0"
                  required
                  className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-base sm:text-sm min-h-[44px] touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <div>
                <label
                  htmlFor="leads"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Leads
                </label>
                <input
                  type="number"
                  id="leads"
                  value={leadsRequired}
                  onChange={(e) =>
                    setLeadsRequired(parseInt(e.target.value) || 0)
                  }
                  min="0"
                  required
                  className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all text-base sm:text-sm min-h-[44px] touch-manipulation [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Must be lead-capable
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
              disabled={saving || !venueId || !date || !startTime}
            >
              {saving ? 'Creating...' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
