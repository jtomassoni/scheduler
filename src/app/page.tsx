'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50 hover:border-purple-500/50 transition-all group z-30 pointer-events-auto"
      title={copied ? 'Copied!' : 'Copy prompt'}
    >
      {copied ? (
        <svg
          className="w-4 h-4 text-green-400"
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
      ) : (
        <svg
          className="w-4 h-4 text-gray-400 group-hover:text-purple-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

function GetStartedModal() {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    numberOfVenues: '',
    estimatedUsers: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName.trim(),
          contactName: formData.contactName.trim(),
          contactEmail: formData.contactEmail.trim(),
          contactPhone: formData.contactPhone.trim() || undefined,
          numberOfVenues: parseInt(formData.numberOfVenues, 10),
          estimatedUsers: parseInt(formData.estimatedUsers, 10),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setFormData({
          companyName: '',
          contactName: '',
          contactEmail: '',
          contactPhone: '',
          numberOfVenues: '',
          estimatedUsers: '',
        });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-105"
      >
        Get Started
        <svg
          className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      </button>

      {showModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={() => !loading && !success && setShowModal(false)}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4">
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
              {success ? (
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
                  <h2 className="text-2xl font-bold text-gray-100 mb-3">
                    Thank You!
                  </h2>
                  <p className="text-gray-400 mb-6">
                    We&apos;ll review your request and get back to you soon.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-100">
                        Get Started
                      </h2>
                      <button
                        onClick={() => setShowModal(false)}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={loading}
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
                    <p className="text-sm text-gray-400 mt-2">
                      Tell us about your venues and we&apos;ll get you set up
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="companyName"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Company or Venue Name *
                      </label>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        placeholder="Mission Ballroom"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contactName"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Your Name *
                      </label>
                      <input
                        id="contactName"
                        name="contactName"
                        type="text"
                        required
                        value={formData.contactName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        placeholder="John Smith"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contactEmail"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Email *
                      </label>
                      <input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        required
                        value={formData.contactEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        placeholder="john@example.com"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="contactPhone"
                        className="block text-sm font-medium text-gray-300 mb-2"
                      >
                        Phone
                      </label>
                      <input
                        id="contactPhone"
                        name="contactPhone"
                        type="tel"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                        placeholder="(555) 123-4567"
                        disabled={loading}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="numberOfVenues"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Venues *
                        </label>
                        <input
                          id="numberOfVenues"
                          name="numberOfVenues"
                          type="number"
                          min="1"
                          required
                          value={formData.numberOfVenues}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          placeholder="3"
                          disabled={loading}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="estimatedUsers"
                          className="block text-sm font-medium text-gray-300 mb-2"
                        >
                          Staff *
                        </label>
                        <input
                          id="estimatedUsers"
                          name="estimatedUsers"
                          type="number"
                          min="1"
                          required
                          value={formData.estimatedUsers}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                          placeholder="25"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 font-semibold hover:bg-gray-800 transition-all"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Get Started'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0a] text-gray-100">
      {/* Hero Section with Dark Gradient */}
      <section className="relative flex items-start justify-center overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#1a0a1f] pt-8 pb-16">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute top-1/4 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
        </div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero Content - Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Text */}
              <div className="text-center lg:text-left">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
                  <span className="text-gray-100">Multi-Venue Scheduling</span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Made Simple
                  </span>
                </h1>

                <p className="text-xl sm:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Streamline staffing across multiple venues with intelligent
                  scheduling, automated availability tracking, and comprehensive
                  reporting that ensures fairness.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                  <GetStartedModal />
                </div>

                {/* Trust indicators */}
                <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto lg:mx-0 pt-8 border-t border-gray-800">
                  <div>
                    <div className="text-3xl font-bold text-gray-100 mb-1">
                      22–48 min
                    </div>
                    <div className="text-sm text-gray-500 mb-1">
                      Saved per bartender, per week
                    </div>
                    <div className="text-xs text-gray-600 italic">
                      (varies by venue size)
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-100 mb-1">
                      100%
                    </div>
                    <div className="text-sm text-gray-500 mb-1">
                      Shift visibility
                    </div>
                    <div className="text-xs text-gray-600 italic">
                      across all venues
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-100 mb-1">
                      Zero
                    </div>
                    <div className="text-sm text-gray-500 mb-1">
                      Scheduling conflicts
                    </div>
                    <div className="text-xs text-gray-600 italic">
                      multi-venue wide
                    </div>
                  </div>
                </div>
                {/* Optional: Annual value recaptured - shown if relevant */}
                <div className="mt-4 max-w-2xl mx-auto lg:mx-0">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-400/80 mb-1">
                      $5,000–$15,000+ saved per venue annually
                    </div>
                    <div className="text-xs text-gray-600 italic">
                      Through reduced scheduling overhead, prevented conflicts,
                      and optimized labor costs
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Hero Graphic */}
              <div className="relative">
                <div className="relative w-full h-[500px] lg:h-[600px] rounded-2xl overflow-hidden border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                  {/* Hero Image - Copy scheduleweekoverview.png from example_data/photos/ to public/hero-graphic.png */}
                  <Image
                    src="/hero-graphic.png"
                    alt="Schedule week overview - Multi-venue scheduling dashboard"
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                  />

                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-[#0a0a0a] relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 text-gray-100">
                Everything You Need to Manage Staff
              </h2>
              <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
                Powerful features designed for hospitality businesses with
                multiple locations
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Feature 1 */}
              <div className="group relative card border-gray-800 bg-gray-900/50 hover:border-purple-500/50 hover:bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
                <div className="card-header">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-purple-500/40 transition-transform">
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
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-100">
                    Multi-Venue Support
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Manage scheduling across multiple venues from a single
                    platform. Support for networked venues and external
                    locations with unified visibility. Even if your staff works
                    elsewhere, the seamless UI on their profiles combined with
                    your ability to sync whenever you want means no more time
                    lost.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="group relative card border-gray-800 bg-gray-900/50 hover:border-blue-500/50 hover:bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="card-header">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-blue-500/40 transition-transform">
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
                  <h3 className="text-xl font-semibold mb-2 text-gray-100">
                    Role-Based Access Control
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Granular permissions for Super Admins, Managers, and Staff.
                    Each role sees only what they need with appropriate access
                    controls.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="group relative card border-gray-800 bg-gray-900/50 hover:border-cyan-500/50 hover:bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10">
                <div className="card-header">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-cyan-500/40 transition-transform">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-100">
                    Intelligent Shift Management
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Calendar-based scheduling with automatic conflict detection.
                    Auto-fill schedules instantly when you publish events based
                    on submitted availability, saving hours of manual work.
                    Support for availability submissions up to 12 months in
                    advance. Ensure proper staffing with bartender, barback, and
                    lead requirements.
                  </p>
                </div>
              </div>

              {/* Feature 4 */}
              <div className="group relative card border-gray-800 bg-gray-900/50 hover:border-purple-500/50 hover:bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10">
                <div className="card-header">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-purple-500/40 transition-transform">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-100">
                    Availability Tracking
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Staff submit availability with deadline enforcement.
                    Automatic reminders and lock mechanisms prevent last-minute
                    changes.
                  </p>
                </div>
              </div>

              {/* Feature 5 */}
              <div className="group relative card border-gray-800 bg-gray-900/50 hover:border-blue-500/50 hover:bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
                <div className="card-header">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-blue-500/40 transition-transform">
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
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-100">
                    Shift Trading
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Empower staff to trade shifts with built-in validation and
                    manager approval. Automatic checks for role compatibility
                    and availability conflicts.
                  </p>
                </div>
              </div>

              {/* Feature 6 */}
              <div className="group relative card border-gray-800 bg-gray-900/50 hover:border-cyan-500/50 hover:bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10">
                <div className="card-header">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-cyan-500/40 transition-transform">
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
                  <h3 className="text-xl font-semibold mb-2 text-gray-100">
                    Comprehensive Reporting
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Shift equity reports, venue summaries, and override
                    tracking. Ensure fair distribution and maintain compliance
                    with detailed analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-[#0f0f0f] relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-100">
                Built for Modern Hospitality
              </h2>
              <p className="text-xl text-gray-400">
                Reduce scheduling headaches and focus on what matters most
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-400"
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">
                      Save Time
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Automate availability collection and reduce manual
                      scheduling work by hours each week.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-400"
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">
                      Prevent Conflicts
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Automatic validation prevents double-booking, availability
                      conflicts, and scheduling errors.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-cyan-400"
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">
                      Ensure Fairness
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Equity reports help ensure fair shift distribution across
                      all staff members.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-purple-400"
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">
                      Increase Transparency
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Staff can see their schedules, submit availability, and
                      trade shifts with full visibility.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-400"
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">
                      Stay Compliant
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Complete audit trails and override tracking help maintain
                      compliance and resolve disputes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-cyan-400"
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-100">
                      Scale Easily
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Add new venues and staff without complexity. The system
                      grows with your business.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#1a0a1f] relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-100">
              Ready to Streamline Your Scheduling?
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Join teams using Scheduler to manage multi-venue operations
              efficiently and fairly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GetStartedModal />
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur-sm hover:bg-gray-800/50 hover:border-gray-600 transition-all duration-200 hover:scale-105"
              >
                View Demo
              </Link>
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
                {status === 'authenticated' ? (
                  <Link
                    href="/dashboard"
                    className="hover:text-gray-300 transition-colors"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="hover:text-gray-300 transition-colors"
                  >
                    Log In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
