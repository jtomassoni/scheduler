'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card w-full max-w-md">
        <div className="card-header">
          <h1 className="text-2xl font-bold text-center">Scheduler</h1>
          <p className="text-muted-foreground text-center">
            Sign in to your account
          </p>
        </div>
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded"
                role="alert"
              >
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full h-10"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Need an account? Contact your administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

