'use client';

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TimePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  hourlyOnly?: boolean;
}

export function TimePicker({
  id,
  label,
  value,
  onChange,
  required = false,
  className = '',
  disabled = false,
  hourlyOnly = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current time value
  const currentTime = React.useMemo(() => {
    if (!value) return { hour: 12, minute: 0, ampm: 'PM' };
    const [hours, minutes] = value.split(':');
    const hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    // Round to nearest 15-minute increment if not already
    const roundedMinute = [0, 15, 30, 45].reduce((prev, curr) =>
      Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev
    );
    return { hour: displayHour, minute: roundedMinute, ampm };
  }, [value]);

  const [selectedTime, setSelectedTime] = React.useState(currentTime);

  useEffect(() => {
    setSelectedTime(currentTime);
  }, [currentTime]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideContainer = containerRef.current?.contains(target);
      const isClickInsideDropdown = dropdownRef.current?.contains(target);

      if (!isClickInsideContainer && !isClickInsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const [dropdownStyle, setDropdownStyle] = React.useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });

  // Update dropdown position when opened or on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current && isOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;

        let left = rect.left + window.scrollX;
        let width = rect.width;

        // Adjust horizontal position if would overflow right
        if (rect.left + width > viewportWidth) {
          left = viewportWidth - width + window.scrollX;
        }

        // Adjust horizontal position if would overflow left
        if (rect.left < 0) {
          left = window.scrollX;
          width = Math.min(rect.width, viewportWidth);
        }

        setDropdownStyle({
          top: rect.bottom + window.scrollY + 8,
          left,
          width,
        });
      }
    };

    if (isOpen) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        updatePosition();
      });

      // Also update after a short delay to catch any layout changes
      const timeoutId = setTimeout(updatePosition, 10);

      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  // Scroll selected items into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const hourEl = dropdownRef.current.querySelector(
        `[data-hour="${selectedTime.hour}"]`
      );
      const ampmEl = dropdownRef.current.querySelector(
        `[data-ampm="${selectedTime.ampm}"]`
      );

      hourEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      ampmEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

      const minuteEl = dropdownRef.current.querySelector(
        `[data-minute="${selectedTime.minute}"]`
      );
      minuteEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen, selectedTime]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const handleTimeSelect = (
    field: 'hour' | 'minute' | 'ampm',
    val: number | string
  ) => {
    const newTime = { ...selectedTime };

    if (field === 'hour') {
      newTime.hour = val as number;
    } else if (field === 'minute') {
      newTime.minute = val as number;
    } else {
      newTime.ampm = val as string;
    }

    setSelectedTime(newTime);

    // Convert to 24-hour format
    let hour24 = newTime.hour;
    if (newTime.ampm === 'PM' && newTime.hour !== 12) {
      hour24 = newTime.hour + 12;
    } else if (newTime.ampm === 'AM' && newTime.hour === 12) {
      hour24 = 0;
    }

    const hourStr = String(hour24).padStart(2, '0');
    const minuteStr = String(newTime.minute).padStart(2, '0');
    onChange(`${hourStr}:${minuteStr}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = [0, 15, 30, 45]; // Always show 15-minute increments

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative" ref={containerRef}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <svg
            className="w-5 h-5 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            // Don't close if clicking inside dropdown
            if (!containerRef.current?.contains(e.relatedTarget as Node)) {
              setIsFocused(false);
            }
          }}
          tabIndex={disabled ? -1 : 0}
          className={`
            w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all cursor-pointer
            bg-white dark:bg-gray-800/50
            text-gray-900 dark:text-gray-100
            border-gray-300 dark:border-gray-600
            ${
              isFocused || isOpen
                ? 'border-purple-500 ring-4 ring-purple-500/20 dark:ring-purple-500/30'
                : 'hover:border-purple-400/50 dark:hover:border-purple-500/50'
            }
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          {value ? (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatTime(value)}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              Select time
            </span>
          )}
        </div>

        {/* Custom Dropdown */}
        {isOpen &&
          !disabled &&
          typeof window !== 'undefined' &&
          createPortal(
            <div
              ref={dropdownRef}
              className="fixed bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden backdrop-blur-sm"
              style={{
                minWidth: '280px',
                width: `${dropdownStyle.width || containerRef.current?.offsetWidth || 280}px`,
                top: `${dropdownStyle.top}px`,
                left: `${dropdownStyle.left}px`,
                zIndex: 99999,
              }}
            >
              <div className="flex divide-x divide-gray-200 dark:divide-gray-700">
                {/* Hours Column */}
                <div
                  className="flex-1 max-h-64 overflow-y-auto overscroll-contain relative"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className="sticky top-0 bg-gradient-to-b from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 z-10 backdrop-blur-sm">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-center">
                      Hour
                    </div>
                  </div>
                  <div className="py-1 relative">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        data-hour={hour}
                        onClick={() => handleTimeSelect('hour', hour)}
                        className={`
                        w-full px-4 py-2.5 text-sm font-medium transition-all duration-150 text-center
                        ${
                          selectedTime.hour === hour
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-purple-600 dark:hover:text-purple-400'
                        }
                      `}
                      >
                        {String(hour).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes Column */}
                <div
                  className="flex-1 max-h-64 overflow-y-auto overscroll-contain relative"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className="sticky top-0 bg-gradient-to-b from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 z-10 backdrop-blur-sm">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-center">
                      Minute
                    </div>
                  </div>
                  <div className="py-1 relative">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        data-minute={minute}
                        onClick={() => handleTimeSelect('minute', minute)}
                        className={`
                        w-full px-4 py-2.5 text-sm font-medium transition-all duration-150 text-center
                        ${
                          selectedTime.minute === minute
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-purple-600 dark:hover:text-purple-400'
                        }
                      `}
                      >
                        {String(minute).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AM/PM Column */}
                <div
                  className="flex-1 max-h-64 overflow-y-auto overscroll-contain relative"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className="sticky top-0 bg-gradient-to-b from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 z-10 backdrop-blur-sm">
                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-center">
                      Period
                    </div>
                  </div>
                  <div className="py-1 relative">
                    {['AM', 'PM'].map((ampm) => (
                      <button
                        key={ampm}
                        data-ampm={ampm}
                        onClick={() => handleTimeSelect('ampm', ampm)}
                        className={`
                        w-full px-4 py-3 text-sm font-medium transition-all duration-150 text-center
                        ${
                          selectedTime.ampm === ampm
                            ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-purple-600 dark:hover:text-purple-400'
                        }
                      `}
                      >
                        {ampm}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
