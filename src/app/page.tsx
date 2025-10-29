import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Scheduler</h1>
            <p className="text-muted-foreground">
              Multi-Venue Scheduling System
            </p>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Features</h2>
            </div>
            <div className="card-content">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-success mr-2 flex-shrink-0 mt-0.5"
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
                  Multi-venue scheduling
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-success mr-2 flex-shrink-0 mt-0.5"
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
                  Role-based permissions
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-success mr-2 flex-shrink-0 mt-0.5"
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
                  Shift management
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-success mr-2 flex-shrink-0 mt-0.5"
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
                  Availability tracking
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-success mr-2 flex-shrink-0 mt-0.5"
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
                  Shift trading
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Status</h2>
            </div>
            <div className="card-content">
              <div className="space-y-3">
                <div>
                  <span className="badge badge-warning">In Development</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This application is currently under active development.
                  Features are being added according to the MVP roadmap defined
                  in <code className="text-xs">todo.md</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">Theme</h2>
            </div>
            <div className="card-content">
              <p className="text-sm text-muted-foreground mb-4">
                The theme system supports light, dark, and system preferences
                with WCAG AA compliant contrast ratios.
              </p>
              <div className="space-y-2">
                <span className="badge badge-success">Light Mode</span>
                <span className="badge badge-info">Dark Mode</span>
                <span className="badge badge-info">System Preference</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Next Steps</h2>
          </div>
          <div className="card-content">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Set up database and run migrations</li>
              <li>Implement authentication system</li>
              <li>Build user profile management</li>
              <li>Create venue management interface</li>
              <li>Develop shift scheduling interface</li>
              <li>Add availability management</li>
              <li>Implement reporting features</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-4">
              See <code className="text-xs">todo.md</code> for the complete
              development roadmap.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

