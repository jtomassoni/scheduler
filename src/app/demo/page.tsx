'use client';

import Link from 'next/link';
import { useTheme } from '@/lib/theme-provider';
import { useEffect, useState } from 'react';

export default function DemoPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0a] text-gray-100">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#1a0a1f]">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Interactive Demo Coming Soon
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gray-100">Explore Our Platform</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Coming Soon
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              We&apos;re building an interactive demo that lets you experience
              the power of multi-venue scheduling firsthand. See how effortless
              it is to manage your staff across multiple locations.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/"
                className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105"
              >
                <svg
                  className="mr-2 w-5 h-5 group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Home
              </Link>
              <Link
                href="/login"
                className="group inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur-sm hover:bg-gray-800/50 hover:border-gray-600 transition-all duration-200 hover:scale-105"
              >
                Log In to Your Account
              </Link>
            </div>

            {/* Preview Cards */}
            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Multi-Venue Calendar
                </h3>
                <p className="text-sm text-gray-400">
                  See how schedules sync across all your locations in real-time
                </p>
              </div>

              <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Auto-Fill Scheduling
                </h3>
                <p className="text-sm text-gray-400">
                  Watch as the system automatically matches staff based on
                  availability
                </p>
              </div>

              <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  Real-Time Reporting
                </h3>
                <p className="text-sm text-gray-400">
                  Explore equity reports and insights across all your venues
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-500 text-sm">
                © {new Date().getFullYear()} Scheduler. All rights reserved.
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <Link
                  href="/"
                  className="hover:text-gray-300 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/login"
                  className="hover:text-gray-300 transition-colors"
                >
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
