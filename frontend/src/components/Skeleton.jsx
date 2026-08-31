import React from 'react';

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="skeleton h-52 rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-5 rounded-lg w-3/4" />
        <div className="skeleton h-4 rounded-lg w-1/2" />
        <div className="skeleton h-4 rounded-lg w-2/3" />
        <div className="flex justify-between mt-4">
          <div className="skeleton h-8 rounded-lg w-24" />
          <div className="skeleton h-8 rounded-lg w-24" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-4 rounded-lg ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="stat-card animate-pulse">
      <div className="skeleton stat-icon" />
      <div className="space-y-2 flex-1">
        <div className="skeleton h-4 rounded w-1/2" />
        <div className="skeleton h-7 rounded w-1/3" />
      </div>
    </div>
  );
}
