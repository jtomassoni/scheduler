'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor =
    type === 'success'
      ? 'bg-green-500'
      : type === 'error'
        ? 'bg-red-500'
        : 'bg-blue-500';

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

  return createPortal(
    <div className="fixed top-4 right-4 z-[10000] animate-in slide-in-from-top-5 fade-in duration-300">
      <div
        className={`
          ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg
          flex items-center gap-3 min-w-[300px] max-w-md
          border border-white/20 backdrop-blur-sm
        `}
      >
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
          {icon}
        </div>
        <p className="flex-1 text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <span className="text-xs">×</span>
        </button>
      </div>
    </div>,
    document.body
  );
}
