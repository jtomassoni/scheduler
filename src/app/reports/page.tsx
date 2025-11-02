'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';
import { UserMenu } from '@/components/user-menu';
import { Breadcrumb } from '@/components/breadcrumb';

type ReportType =
  | 'shift-equity'
  | 'venue-summary'
  | 'override-summary'
  | 'tips'
  | 'equity';
type SortField =
  | 'name'
  | 'totalShifts'
  | 'leadShifts'
  | 'role'
  | 'venueName'
  | 'uniqueStaff';
type SortDirection = 'asc' | 'desc';

export default function ReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const isManager =
    session?.user?.role === 'MANAGER' ||
    session?.user?.role === 'SUPER_ADMIN' ||
    session?.user?.role === 'GENERAL_MANAGER';
  const isStaff = !isManager && session?.user?.role !== 'SUPER_ADMIN';

  const [selectedReport, setSelectedReport] = useState<ReportType>(
    isStaff ? 'tips' : 'shift-equity'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('custom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<unknown>(null);

  // Filtering and sorting state
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('totalShifts');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  function applyDateRangePreset(preset: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date;
    let end: Date = new Date(today);

    switch (preset) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'thisWeek':
        const dayOfWeek = now.getDay();
        start = new Date(today);
        start.setDate(today.getDate() - dayOfWeek); // Start of week (Sunday)
        end = new Date(today);
        end.setDate(today.getDate() + (6 - dayOfWeek)); // End of week (Saturday)
        break;
      case 'lastWeek':
        const lastWeekDayOfWeek = now.getDay();
        start = new Date(today);
        start.setDate(today.getDate() - lastWeekDayOfWeek - 7); // Last Sunday
        end = new Date(today);
        end.setDate(today.getDate() - lastWeekDayOfWeek - 1); // Last Saturday
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarterMonth = lastQuarter === 0 ? 9 : (lastQuarter - 1) * 3;
        const lastQuarterYear =
          lastQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        start = new Date(lastQuarterYear, lastQuarterMonth, 1);
        end = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'yearToDate':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(today);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        // Custom - don't change dates
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setDateRangePreset(preset);
  }

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    setDateRangePreset('thisMonth');
  }, []);

  async function generateReport() {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setLoading(true);
    setError('');
    setReportData(null);

    try {
      let url = '';

      // Staff users use different endpoints
      if (selectedReport === 'tips') {
        url = `/api/tips/history?startDate=${startDate}&endDate=${endDate}`;
      } else if (selectedReport === 'equity') {
        url = `/api/reports/shift-equity?startDate=${startDate}&endDate=${endDate}&userId=${session?.user?.id}`;
      } else {
        // Manager reports
        url = `/api/reports/${selectedReport}?startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate report'
      );
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!reportData) return;

    let csv = '';
    const data = reportData as Record<string, unknown>;

    if (selectedReport === 'tips') {
      const tipData = data as {
        totalShifts: number;
        totalShiftsWithTips: number;
        totalTips: string;
        averageTip: string;
        tips: Array<{
          date: string;
          venue: string;
          amount: string;
          enteredAt: string | null;
        }>;
      };

      csv = 'Date,Venue,Amount,Entered At\n';
      tipData.tips.forEach((tip) => {
        csv += `"${tip.date}","${tip.venue}","${tip.amount}","${tip.enteredAt || ''}"\n`;
      });
    } else if (selectedReport === 'equity') {
      const equityData = data.data as Array<{
        userName: string;
        email: string | null;
        role: string;
        totalShifts: number;
        leadShifts: number;
        venues: Array<{ venueName: string; count: number }>;
      }>;

      const userData =
        equityData.find((row) => row.email === session?.user?.email) ||
        equityData[0];
      if (userData) {
        csv = 'Venue,Shifts\n';
        userData.venues.forEach((venue) => {
          csv += `"${venue.venueName}",${venue.count}\n`;
        });
      }
    } else if (selectedReport === 'shift-equity') {
      const equityData = data.data as Array<{
        userName: string;
        email: string | null;
        role: string;
        totalShifts: number;
        leadShifts: number;
        venues: Array<{ venueName: string; count: number }>;
        currentShifts?: number;
        historicShifts?: number;
      }>;

      csv =
        'Name,Email,Role,Total Shifts,Current Shifts,Historic Shifts,Lead Shifts,Venues\n';
      equityData.forEach((row) => {
        const venuesList = row.venues
          .map((v) => `${v.venueName}(${v.count})`)
          .join('; ');
        csv += `"${row.userName}","${row.email || ''}","${row.role}",${row.totalShifts},${row.currentShifts || 0},${row.historicShifts || 0},${row.leadShifts},"${venuesList}"\n`;
      });
    } else if (selectedReport === 'venue-summary') {
      const venueData = data.data as Array<{
        venueName: string;
        totalShifts: number;
        uniqueStaff: number;
        averageShiftsPerStaff: string;
        leadCoveragePercent: string;
        overridesCount: number;
      }>;

      csv =
        'Venue,Total Shifts,Unique Staff,Avg Shifts/Staff,Lead Coverage %,Overrides\n';
      venueData.forEach((row) => {
        csv += `"${row.venueName}",${row.totalShifts},${row.uniqueStaff},${row.averageShiftsPerStaff},${row.leadCoveragePercent},${row.overridesCount}\n`;
      });
    } else if (selectedReport === 'override-summary') {
      csv = 'Summary\n';
      csv += `Total Overrides,${data.totalOverrides}\n`;
      csv += `Approval Rate,${data.approvalRate}%\n`;
      csv += `Approved,${data.approved}\n`;
      csv += `Declined,${data.declined}\n`;
      csv += `Pending,${data.pending}\n\n`;

      csv += 'By Type\n';
      csv += 'Violation Type,Count\n';
      const byType = data.byType as Array<{
        violationType: string;
        count: number;
      }>;
      byType.forEach((row) => {
        csv += `"${row.violationType}",${row.count}\n`;
      });

      csv += '\nMost Frequent Users\n';
      csv += 'Staff Member,Overrides\n';
      const users = data.mostFrequentUsers as Array<{
        userName: string;
        count: number;
      }>;
      users.forEach((row) => {
        csv += `"${row.userName}",${row.count}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function printReport() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const data = reportData as Record<string, unknown>;
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selectedReport} Report - ${startDate} to ${endDate}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f5f5f5; font-weight: bold; }
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>${selectedReport.replace('-', ' ').toUpperCase()} Report</h1>
          <p><strong>Date Range:</strong> ${startDate} to ${endDate}</p>
    `;

    if (selectedReport === 'shift-equity') {
      const equityData = data.data as Array<{
        userName: string;
        role: string;
        totalShifts: number;
        leadShifts: number;
        venues: Array<{ venueName: string; count: number }>;
      }>;

      html +=
        '<table><thead><tr><th>Name</th><th>Role</th><th>Total Shifts</th><th>Lead Shifts</th><th>Venues</th></tr></thead><tbody>';
      equityData.forEach((row) => {
        const venuesList = row.venues
          .map((v) => `${v.venueName} (${v.count})`)
          .join(', ');
        html += `<tr><td>${row.userName}</td><td>${row.role}</td><td>${row.totalShifts}</td><td>${row.leadShifts}</td><td>${venuesList}</td></tr>`;
      });
      html += '</tbody></table>';
    } else if (selectedReport === 'venue-summary') {
      const venueData = data.data as Array<{
        venueName: string;
        totalShifts: number;
        uniqueStaff: number;
        averageShiftsPerStaff: string;
        leadCoveragePercent: string;
        overridesCount: number;
      }>;

      html +=
        '<table><thead><tr><th>Venue</th><th>Total Shifts</th><th>Unique Staff</th><th>Avg Shifts/Staff</th><th>Lead Coverage</th><th>Overrides</th></tr></thead><tbody>';
      venueData.forEach((row) => {
        html += `<tr><td>${row.venueName}</td><td>${row.totalShifts}</td><td>${row.uniqueStaff}</td><td>${row.averageShiftsPerStaff}</td><td>${row.leadCoveragePercent}%</td><td>${row.overridesCount}</td></tr>`;
      });
      html += '</tbody></table>';
    }

    html += '</body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  if (status === 'loading') {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading reports...</p>
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
                  Reports & Analytics
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  View insights and export data
                </p>
              </div>
              <div className="flex items-center gap-3">
                <UserMenu />
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

          {/* Report Controls */}
          <PremiumCard className="mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label
                    htmlFor="reportType"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Report Type
                  </label>
                  <select
                    id="reportType"
                    value={selectedReport}
                    onChange={(e) =>
                      setSelectedReport(e.target.value as ReportType)
                    }
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  >
                    {isManager ? (
                      <>
                        <option value="shift-equity">Shift Equity</option>
                        <option value="venue-summary">Venue Summary</option>
                        <option value="override-summary">
                          Override Summary
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="tips">Tips Report</option>
                        <option value="equity">Equity Report</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dateRangePreset"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Quick Range
                  </label>
                  <select
                    id="dateRangePreset"
                    value={dateRangePreset}
                    onChange={(e) => {
                      const preset = e.target.value;
                      setDateRangePreset(preset);
                      applyDateRangePreset(preset);
                    }}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  >
                    <option value="custom">Custom Range</option>
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="thisQuarter">This Quarter</option>
                    <option value="lastQuarter">Last Quarter</option>
                    <option value="yearToDate">Year to Date</option>
                    <option value="thisYear">This Year</option>
                    <option value="lastYear">Last Year</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRangePreset('custom');
                    }}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRangePreset('custom');
                    }}
                    className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={generateReport}
                    className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          </PremiumCard>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Report Display */}
          {reportData !== null && (
            <>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-xl font-semibold text-gray-100">
                  {selectedReport === 'shift-equity' && 'Shift Equity Report'}
                  {selectedReport === 'venue-summary' && 'Venue Summary Report'}
                  {selectedReport === 'override-summary' &&
                    'Override Summary Report'}
                  {selectedReport === 'tips' && 'Tips Report'}
                  {selectedReport === 'equity' && 'Equity Report'}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-sm flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export CSV
                  </button>
                  <button
                    onClick={printReport}
                    className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors text-sm flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print
                  </button>
                </div>
              </div>

              <PremiumCard>
                <div className="p-6">
                  <p className="text-sm text-gray-400 mb-6">
                    {startDate} to {endDate}
                  </p>
                  {selectedReport === 'shift-equity' && (
                    <ShiftEquityReport
                      data={reportData}
                      searchFilter={searchFilter}
                      roleFilter={roleFilter}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSearchChange={setSearchFilter}
                      onRoleFilterChange={setRoleFilter}
                      onSortChange={(field) => {
                        setSortField(field);
                        setSortDirection(
                          sortField === field && sortDirection === 'desc'
                            ? 'asc'
                            : 'desc'
                        );
                      }}
                    />
                  )}
                  {selectedReport === 'venue-summary' && (
                    <VenueSummaryReport
                      data={reportData}
                      searchFilter={searchFilter}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSearchChange={setSearchFilter}
                      onSortChange={(field) => {
                        setSortField(field);
                        setSortDirection(
                          sortField === field && sortDirection === 'desc'
                            ? 'asc'
                            : 'desc'
                        );
                      }}
                    />
                  )}
                  {selectedReport === 'override-summary' && (
                    <OverrideSummaryReport data={reportData} />
                  )}
                  {selectedReport === 'tips' && (
                    <TipsReport data={reportData} />
                  )}
                  {selectedReport === 'equity' && (
                    <EquityReport data={reportData} />
                  )}
                </div>
              </PremiumCard>
            </>
          )}
        </main>
      </div>
    </PremiumLayout>
  );
}

interface ShiftEquityReportProps {
  data: unknown;
  searchFilter: string;
  roleFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string) => void;
  onSortChange: (field: SortField) => void;
}

function ShiftEquityReport({
  data,
  searchFilter,
  roleFilter,
  sortField,
  sortDirection,
  onSearchChange,
  onRoleFilterChange,
  onSortChange,
}: ShiftEquityReportProps) {
  const reportData = data as {
    totalAssignments: number;
    currentAssignments?: number;
    historicAssignments?: number;
    staffCount: number;
    includesHistoric?: boolean;
    historicSchedules?: Array<{
      id: string;
      periodName: string | null;
      venueName: string;
    }>;
    data: Array<{
      userName: string;
      email: string | null;
      role: string;
      totalShifts: number;
      leadShifts: number;
      venues: Array<{ venueName: string; count: number }>;
      historicShifts?: number;
      currentShifts?: number;
    }>;
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = [...reportData.data];

    // Apply search filter
    if (searchFilter) {
      filtered = filtered.filter(
        (row) =>
          row.userName.toLowerCase().includes(searchFilter.toLowerCase()) ||
          row.email?.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((row) => row.role === roleFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'name':
          aVal = a.userName.toLowerCase();
          bVal = b.userName.toLowerCase();
          break;
        case 'totalShifts':
          aVal = a.totalShifts;
          bVal = b.totalShifts;
          break;
        case 'leadShifts':
          aVal = a.leadShifts;
          bVal = b.leadShifts;
          break;
        case 'role':
          aVal = a.role;
          bVal = b.role;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reportData.data, searchFilter, roleFilter, sortField, sortDirection]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(reportData.data.map((r) => r.role)));
  }, [reportData.data]);

  return (
    <div>
      {reportData.includesHistoric && reportData.historicSchedules && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-blue-400">
              📊 Historic Data Included
            </span>
          </div>
          <div className="text-xs text-gray-400">
            This report includes historic schedule data from:{' '}
            {reportData.historicSchedules.map((s, idx) => (
              <span key={s.id}>
                {idx > 0 && ', '}
                {s.periodName || 'Unknown Period'} ({s.venueName})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Total Assignments</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.totalAssignments}
          </div>
          {reportData.currentAssignments !== undefined &&
            reportData.historicAssignments !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                {reportData.currentAssignments} current +{' '}
                {reportData.historicAssignments} historic
              </div>
            )}
        </div>
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Staff Members</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.staffCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-');
              onSortChange(field as SortField);
            }}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
          >
            <option value="totalShifts-desc">Total Shifts (High to Low)</option>
            <option value="totalShifts-asc">Total Shifts (Low to High)</option>
            <option value="leadShifts-desc">Lead Shifts (High to Low)</option>
            <option value="leadShifts-asc">Lead Shifts (Low to High)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="role-asc">Role (A-Z)</option>
            <option value="role-desc">Role (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-700">
            <tr>
              <th
                className="text-left py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                onClick={() => onSortChange('name')}
              >
                Name{' '}
                {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left py-3 px-4 text-gray-300">Role</th>
              <th
                className="text-right py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                onClick={() => onSortChange('totalShifts')}
              >
                Total Shifts{' '}
                {sortField === 'totalShifts' &&
                  (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              {reportData.includesHistoric && (
                <th className="text-right py-3 px-4 text-xs text-gray-400">
                  Current / Historic
                </th>
              )}
              <th
                className="text-right py-3 px-4 text-gray-300 cursor-pointer hover:text-gray-100 transition-colors"
                onClick={() => onSortChange('leadShifts')}
              >
                Lead Shifts{' '}
                {sortField === 'leadShifts' &&
                  (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left py-3 px-4 text-gray-300">Top Venues</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-gray-100">
                  {row.userName}
                  {!row.email && (
                    <span className="ml-2 text-xs text-gray-500 italic">
                      (Historic)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {row.role}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.totalShifts}
                </td>
                {reportData.includesHistoric && (
                  <td className="py-3 px-4 text-right text-xs text-gray-500">
                    {row.currentShifts || 0} / {row.historicShifts || 0}
                  </td>
                )}
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.leadShifts}
                </td>
                <td className="py-3 px-4">
                  {row.venues.slice(0, 3).map((v, vidx) => (
                    <div key={vidx} className="text-sm text-gray-400">
                      {v.venueName} ({v.count})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAndSorted.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No results found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
}

interface VenueSummaryReportProps {
  data: unknown;
  searchFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSearchChange: (value: string) => void;
  onSortChange: (field: SortField) => void;
}

function VenueSummaryReport({
  data,
  searchFilter,
  sortField,
  sortDirection,
  onSearchChange,
  onSortChange,
}: VenueSummaryReportProps) {
  const reportData = data as {
    totalShifts: number;
    venueCount: number;
    data: Array<{
      venueName: string;
      totalShifts: number;
      uniqueStaff: number;
      averageShiftsPerStaff: string;
      leadCoveragePercent: string;
      overridesCount: number;
    }>;
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = [...reportData.data];

    if (searchFilter) {
      filtered = filtered.filter((row) =>
        row.venueName.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case 'venueName':
          aVal = a.venueName.toLowerCase();
          bVal = b.venueName.toLowerCase();
          break;
        case 'totalShifts':
          aVal = a.totalShifts;
          bVal = b.totalShifts;
          break;
        case 'uniqueStaff':
          aVal = a.uniqueStaff;
          bVal = b.uniqueStaff;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reportData.data, searchFilter, sortField, sortDirection]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Total Shifts</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.totalShifts}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Active Venues</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.venueCount}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by venue name..."
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Sort By
          </label>
          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field] = e.target.value.split('-');
              onSortChange(field as SortField);
            }}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
          >
            <option value="totalShifts-desc">Total Shifts (High to Low)</option>
            <option value="totalShifts-asc">Total Shifts (Low to High)</option>
            <option value="uniqueStaff-desc">Unique Staff (High to Low)</option>
            <option value="uniqueStaff-asc">Unique Staff (Low to High)</option>
            <option value="venueName-asc">Venue Name (A-Z)</option>
            <option value="venueName-desc">Venue Name (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-700">
            <tr>
              <th className="text-left py-3 px-4 text-gray-300">Venue</th>
              <th className="text-right py-3 px-4 text-gray-300">
                Total Shifts
              </th>
              <th className="text-right py-3 px-4 text-gray-300">
                Unique Staff
              </th>
              <th className="text-right py-3 px-4 text-gray-300">
                Avg Shifts/Staff
              </th>
              <th className="text-right py-3 px-4 text-gray-300">
                Lead Coverage
              </th>
              <th className="text-right py-3 px-4 text-gray-300">Overrides</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-gray-100">
                  {row.venueName}
                </td>
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.totalShifts}
                </td>
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.uniqueStaff}
                </td>
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.averageShiftsPerStaff}
                </td>
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.leadCoveragePercent}%
                </td>
                <td className="py-3 px-4 text-right text-gray-100">
                  {row.overridesCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TipsReport({ data }: { data: unknown }) {
  const tipData = data as {
    startDate: string;
    endDate: string;
    userId: string | null;
    totalShifts: number;
    totalShiftsWithTips: number;
    totalTips: string;
    averageTip: string;
    averageShiftsAcrossAllUsers: string;
    tips: Array<{
      id: string;
      shiftId: string;
      date: string;
      venue: string;
      amount: string;
      enteredAt: string | null;
      updatedAt: string | null;
      user: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  };

  const userShifts = tipData?.totalShifts || 0;
  const avgShifts = parseFloat(tipData?.averageShiftsAcrossAllUsers || '0');
  const comparisonText =
    userShifts > avgShifts
      ? `${userShifts} shifts (above average of ${avgShifts})`
      : userShifts < avgShifts
        ? `${userShifts} shifts (below average of ${avgShifts})`
        : `${userShifts} shifts (at average of ${avgShifts})`;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Total Shifts</div>
          <div className="text-2xl font-bold text-gray-100">
            {tipData.totalShifts}
          </div>
          {tipData.averageShiftsAcrossAllUsers && (
            <div className="text-xs text-gray-500 mt-1">
              Avg: {tipData.averageShiftsAcrossAllUsers}
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Shifts with Tips</div>
          <div className="text-2xl font-bold text-gray-100">
            {tipData.totalShiftsWithTips}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {tipData.totalShifts > 0
              ? Math.round(
                  (tipData.totalShiftsWithTips / tipData.totalShifts) * 100
                )
              : 0}
            % of shifts
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Total Tips</div>
          <div className="text-2xl font-bold text-green-400">
            ${tipData.totalTips}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Average per Shift</div>
          <div className="text-2xl font-bold text-gray-100">
            ${tipData.averageTip}
          </div>
        </div>
      </div>

      {tipData.averageShiftsAcrossAllUsers && (
        <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="text-sm font-medium text-gray-300 mb-2">
            Shift Comparison
          </div>
          <div className="text-base text-gray-400">
            You worked{' '}
            <span className="font-semibold text-gray-200">
              {comparisonText}
            </span>{' '}
            in this period.
            {userShifts < avgShifts && (
              <span className="block text-xs text-yellow-400 mt-1">
                Even though {userShifts} isn&apos;t a lot, it&apos;s below the
                average. Consider discussing availability with management if
                you&apos;d like more shifts.
              </span>
            )}
            {userShifts > avgShifts && (
              <span className="block text-xs text-green-400 mt-1">
                Great job! You&apos;re working more shifts than average.
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Tip History
        </h3>
        {tipData.tips.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No tips found for this period
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                    Venue
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                    Entered
                  </th>
                </tr>
              </thead>
              <tbody>
                {tipData.tips.map((tip) => (
                  <tr
                    key={tip.id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {new Date(tip.date).toLocaleDateString('default', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {tip.venue}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-green-400">
                      ${tip.amount}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {tip.enteredAt
                        ? new Date(tip.enteredAt).toLocaleDateString(
                            'default',
                            {
                              month: 'short',
                              day: 'numeric',
                            }
                          )
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EquityReport({ data }: { data: unknown }) {
  const { data: session } = useSession();
  const equityData = data as {
    data: Array<{
      userName: string;
      email: string | null;
      role: string;
      totalShifts: number;
      leadShifts: number;
      venues: Array<{ venueName: string; count: number }>;
      historicShifts?: number;
      currentShifts?: number;
    }>;
  };

  // Filter to show only current user if staff
  const userData =
    equityData.data.find((row) => row.email === session?.user?.email) ||
    equityData.data[0];

  if (!userData) {
    return (
      <div className="text-gray-400 text-center py-8">
        No equity data found for this period
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Total Shifts</div>
          <div className="text-2xl font-bold text-gray-100">
            {userData.totalShifts}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Lead Shifts</div>
          <div className="text-2xl font-bold text-gray-100">
            {userData.leadShifts}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400 mb-1">Top Venues</div>
          <div className="text-lg font-bold text-gray-100">
            {userData.venues.length}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Venue Distribution
        </h3>
        {userData.venues.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No venue data available
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">
                    Venue
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">
                    Shifts
                  </th>
                </tr>
              </thead>
              <tbody>
                {userData.venues.map((venue, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-300">
                      {venue.venueName}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-100">
                      {venue.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OverrideSummaryReport({ data }: { data: unknown }) {
  const reportData = data as {
    totalOverrides: number;
    approvalRate: string;
    approved: number;
    declined: number;
    pending: number;
    byType: Array<{ violationType: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
    mostFrequentUsers: Array<{ userName: string; count: number }>;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Total Overrides</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.totalOverrides}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Approval Rate</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.approvalRate}%
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Approved</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.approved}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="text-sm text-gray-400">Declined</div>
          <div className="text-2xl font-bold text-gray-100">
            {reportData.declined}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3 text-gray-100">
            By Violation Type
          </h3>
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left py-2 text-gray-300">Type</th>
                <th className="text-right py-2 text-gray-300">Count</th>
              </tr>
            </thead>
            <tbody>
              {reportData.byType.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-2 text-gray-100">{row.violationType}</td>
                  <td className="py-2 text-right text-gray-100">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-gray-100">
            Most Frequent Users
          </h3>
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="text-left py-2 text-gray-300">Staff Member</th>
                <th className="text-right py-2 text-gray-300">Overrides</th>
              </tr>
            </thead>
            <tbody>
              {reportData.mostFrequentUsers.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-2 text-gray-100">{row.userName}</td>
                  <td className="py-2 text-right text-gray-100">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
