import React from 'react';

export const Avatar = ({ src, name, size = 'md', status, className = '' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusSize = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-2',
    md: 'w-3 h-3 ring-2',
    lg: 'w-3.5 h-3.5 ring-2',
    xl: 'w-4 h-4 ring-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    idle: 'bg-amber-500',
    dnd: 'bg-rose-500',
    offline: 'bg-slate-500',
  };

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className={`relative inline-block select-none flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-white/10 bg-slate-800`}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-tr from-indigo-600 to-purple-600 ring-1 ring-white/10`}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-slate-900 ${statusColors[status] || statusColors.offline} ${statusSize[size]}`}
          title={status}
        />
      )}
    </div>
  );
};
