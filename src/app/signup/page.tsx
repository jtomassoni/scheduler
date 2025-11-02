'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PremiumLayout, PremiumCard } from '@/components/premium-layout';

export default function SignupPage() {
  const router = useRouter();
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
    additionalNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/company-requests', {
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
          additionalNotes: formData.additionalNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <PremiumLayout>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          <PremiumCard>
            <div className="p-8 text-center max-w-md">
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
              <h1 className="text-2xl font-bold text-gray-100 mb-4">
                Request Submitted!
              </h1>
              <p className="text-gray-400 mb-6">
                Thank you for your interest in Scheduler. We&apos;ll review your
                request and get back to you soon.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all"
              >
                Back to Homepage
              </Link>
            </div>
          </PremiumCard>
        </div>
      </PremiumLayout>
    );
  }

  return (
    <PremiumLayout>
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-block group transition-transform hover:scale-105 mb-4"
            >
              <h1 className="text-5xl sm:text-6xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Scheduler
                </span>
              </h1>
            </Link>
            <p className="text-gray-400 text-lg font-light tracking-wide">
              Request Access
            </p>
          </div>

          <PremiumCard>
            <div className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-gray-100 mb-2">
                Tell Us About Your Business
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                We&apos;ll review your request and reach out to get you set up.
              </p>

              {error && (
                <div
                  className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="companyName"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                    placeholder="Your Company"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contactName"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contactEmail"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all"
                    placeholder="you@company.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contactPhone"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Phone Number
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
                      Number of Venues <span className="text-red-400">*</span>
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
                      Estimated Users <span className="text-red-400">*</span>
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

                <div>
                  <label
                    htmlFor="additionalNotes"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Additional Notes
                  </label>
                  <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    rows={4}
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder:text-gray-600/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all resize-none"
                    placeholder="Tell us anything else we should know..."
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group py-3 px-6 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Request</span>
                        <svg
                          className="w-5 h-5 group-hover:translate-x-1 transition-transform"
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
                      </>
                    )}
                  </span>
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-800/50">
                <p className="text-center text-xs text-gray-500">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>
    </PremiumLayout>
  );
}
