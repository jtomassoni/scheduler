'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type ReportType = 'shift-equity' | 'venue-summary' | 'override-summary';

export default function ReportsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedReport, setSelectedReport] =
    useState<ReportType>('shift-equity');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState<unknown>(null);

  const isManager =
    session?.user?.role === 'MANAGER' || session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && !isManager) {
      router.push('/dashboard');
    }
  }, [status, isManager, router]);

  useEffect(() => {
    // Set default dates (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
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
      const response = await fetch(
        `/api/reports/${selectedReport}?startDate=${startDate}&endDate=${endDate}`
      );

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

    if (selectedReport === 'shift-equity') {
      const equityData = data.data as Array<{
        userName: string;
        email: string;
        role: string;
        totalShifts: number;
        leadShifts: number;
        venues: Array<{ venueName: string; count: number }>;
      }>;

      csv = 'Name,Email,Role,Total Shifts,Lead Shifts,Venues\n';
      equityData.forEach((row) => {
        const venuesList = row.venues
          .map((v) => `${v.venueName}(${v.count})`)
          .join('; ');
        csv += `"${row.userName}","${row.email}","${row.role}",${row.totalShifts},${row.leadShifts},"${venuesList}"\n`;
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
    }

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
              <h1 className="text-2xl font-bold">Reports & Analytics</h1>
              <p className="text-sm text-muted-foreground">
                View insights and export data
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Controls */}
        <div className="card mb-6">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="reportType" className="form-label">
                  Report Type
                </label>
                <select
                  id="reportType"
                  value={selectedReport}
                  onChange={(e) =>
                    setSelectedReport(e.target.value as ReportType)
                  }
                  className="input w-full"
                >
                  <option value="shift-equity">Shift Equity</option>
                  <option value="venue-summary">Venue Summary</option>
                  <option value="override-summary">Override Summary</option>
                </select>
              </div>

              <div>
                <label htmlFor="startDate" className="form-label">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="form-label">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={generateReport}
                  className="btn btn-primary flex-1"
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate'}
                </button>
                {reportData && (
                  <button
                    onClick={exportToCSV}
                    className="btn btn-outline"
                    title="Export to CSV"
                  >
                    Export
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Report Display */}
        {reportData && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">
                {selectedReport === 'shift-equity' && 'Shift Equity Report'}
                {selectedReport === 'venue-summary' && 'Venue Summary Report'}
                {selectedReport === 'override-summary' &&
                  'Override Summary Report'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {startDate} to {endDate}
              </p>
            </div>
            <div className="card-content">
              {selectedReport === 'shift-equity' && (
                <ShiftEquityReport data={reportData} />
              )}
              {selectedReport === 'venue-summary' && (
                <VenueSummaryReport data={reportData} />
              )}
              {selectedReport === 'override-summary' && (
                <OverrideSummaryReport data={reportData} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ShiftEquityReport({ data }: { data: unknown }) {
  const reportData = data as {
    totalAssignments: number;
    staffCount: number;
    data: Array<{
      userName: string;
      email: string;
      role: string;
      totalShifts: number;
      leadShifts: number;
      venues: Array<{ venueName: string; count: number }>;
    }>;
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Total Assignments</div>
          <div className="text-2xl font-bold">
            {reportData.totalAssignments}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Staff Members</div>
          <div className="text-2xl font-bold">{reportData.staffCount}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-right py-3 px-4">Total Shifts</th>
              <th className="text-right py-3 px-4">Lead Shifts</th>
              <th className="text-left py-3 px-4">Top Venues</th>
            </tr>
          </thead>
          <tbody>
            {reportData.data.map((row, idx) => (
              <tr key={idx} className="border-b border-border">
                <td className="py-3 px-4 font-medium">{row.userName}</td>
                <td className="py-3 px-4">
                  <span className="badge badge-info">{row.role}</span>
                </td>
                <td className="py-3 px-4 text-right">{row.totalShifts}</td>
                <td className="py-3 px-4 text-right">{row.leadShifts}</td>
                <td className="py-3 px-4">
                  {row.venues.slice(0, 3).map((v, vidx) => (
                    <div key={vidx} className="text-sm text-muted-foreground">
                      {v.venueName} ({v.count})
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VenueSummaryReport({ data }: { data: unknown }) {
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

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Total Shifts</div>
          <div className="text-2xl font-bold">{reportData.totalShifts}</div>
        </div>
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Active Venues</div>
          <div className="text-2xl font-bold">{reportData.venueCount}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className="text-left py-3 px-4">Venue</th>
              <th className="text-right py-3 px-4">Total Shifts</th>
              <th className="text-right py-3 px-4">Unique Staff</th>
              <th className="text-right py-3 px-4">Avg Shifts/Staff</th>
              <th className="text-right py-3 px-4">Lead Coverage</th>
              <th className="text-right py-3 px-4">Overrides</th>
            </tr>
          </thead>
          <tbody>
            {reportData.data.map((row, idx) => (
              <tr key={idx} className="border-b border-border">
                <td className="py-3 px-4 font-medium">{row.venueName}</td>
                <td className="py-3 px-4 text-right">{row.totalShifts}</td>
                <td className="py-3 px-4 text-right">{row.uniqueStaff}</td>
                <td className="py-3 px-4 text-right">
                  {row.averageShiftsPerStaff}
                </td>
                <td className="py-3 px-4 text-right">
                  {row.leadCoveragePercent}%
                </td>
                <td className="py-3 px-4 text-right">{row.overridesCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Total Overrides</div>
          <div className="text-2xl font-bold">{reportData.totalOverrides}</div>
        </div>
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Approval Rate</div>
          <div className="text-2xl font-bold">{reportData.approvalRate}%</div>
        </div>
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Approved</div>
          <div className="text-2xl font-bold">{reportData.approved}</div>
        </div>
        <div className="p-4 rounded-lg bg-accent">
          <div className="text-sm text-muted-foreground">Declined</div>
          <div className="text-2xl font-bold">{reportData.declined}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">By Violation Type</h3>
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {reportData.byType.map((row, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="py-2">{row.violationType}</td>
                  <td className="py-2 text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Most Frequent Users</h3>
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-2">Staff Member</th>
                <th className="text-right py-2">Overrides</th>
              </tr>
            </thead>
            <tbody>
              {reportData.mostFrequentUsers.map((row, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="py-2">{row.userName}</td>
                  <td className="py-2 text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
