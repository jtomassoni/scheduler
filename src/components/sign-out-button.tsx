'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="btn btn-outline h-10 px-4"
    >
      Sign Out
    </button>
  );
}

