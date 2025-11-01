import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignOutButton } from '@/components/sign-out-button';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {user.name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Your Profile</h2>
            </div>
            <div className="card-content">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{user.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Role</dt>
                  <dd>
                    <span className="badge badge-info">{user.role}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {(user.role === 'SUPER_ADMIN' || user.role === 'MANAGER') && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Management Tools</h2>
              </div>
              <div className="card-content">
                <ul className="space-y-3">
                  <li>
                    <a
                      href="/venues"
                      className="text-primary hover:underline tap-target inline-flex items-center"
                    >
                      <span className="mr-2">🏢</span>
                      Manage Venues
                    </a>
                  </li>
                  <li>
                    <a
                      href="/shifts"
                      className="text-primary hover:underline tap-target inline-flex items-center"
                    >
                      <span className="mr-2">📋</span>
                      Schedule Shifts
                    </a>
                  </li>
                  <li>
                    <a
                      href="/reports"
                      className="text-primary hover:underline tap-target inline-flex items-center"
                    >
                      <span className="mr-2">📊</span>
                      View Reports
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
            </div>
            <div className="card-content">
              <ul className="space-y-3">
                <li>
                  <a
                    href="/notifications"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">🔔</span>
                    Notifications
                  </a>
                </li>
                <li>
                  <a
                    href="/availability"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">📅</span>
                    Update Availability
                  </a>
                </li>
                <li>
                  <a
                    href="/external-blocks"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">📆</span>
                    External Schedule
                  </a>
                </li>
                <li>
                  <a
                    href="/shifts/my"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">⏰</span>
                    My Shifts
                  </a>
                </li>
                <li>
                  <a
                    href="/overrides"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">⚠️</span>
                    Override Requests
                  </a>
                </li>
                <li>
                  <a
                    href="/trades"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">🔄</span>
                    Shift Trades
                  </a>
                </li>
                <li>
                  <a
                    href="/tips"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">💰</span>
                    My Tips
                  </a>
                </li>
                <li>
                  <a
                    href="/profile"
                    className="text-primary hover:underline tap-target inline-flex items-center"
                  >
                    <span className="mr-2">👤</span>
                    Edit Profile
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
