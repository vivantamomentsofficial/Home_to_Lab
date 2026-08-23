import React from 'react';
import { getFileCategory } from '../utils/fileSecurity';

const CATEGORY_COLORS = {
  images: '#8b5cf6',   // Purple
  documents: '#3b82f6',// Blue
  video: '#ec4899',    // Pink
  audio: '#f59e0b',    // Amber
  code: '#10b981',     // Emerald
  archives: '#f97316', // Orange
  other: '#64748b',    // Slate
};

const CATEGORY_LABELS = {
  images: 'Images',
  documents: 'Documents',
  video: 'Video',
  audio: 'Audio',
  code: 'Code',
  archives: 'Archives',
  other: 'Other',
};

export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StorageDonutChart = ({ files = [], totalLimit = 104857600 }) => {
  // Aggregate file sizes by category
  const categorySizes = {
    images: 0,
    documents: 0,
    video: 0,
    audio: 0,
    code: 0,
    archives: 0,
    other: 0,
  };

  let usedBytes = 0;
  (files || []).forEach((file) => {
    if (file.is_deleted) return;
    const cat = getFileCategory(file.filename, file.file_type);
    const size = parseInt(file.size, 10) || 0;
    categorySizes[cat] = (categorySizes[cat] || 0) + size;
    usedBytes += size;
  });

  const freeBytes = Math.max(0, totalLimit - usedBytes);
  const usedPercent = Math.min(100, (usedBytes / (totalLimit || 1)) * 100);

  // Build SVG Donut Segments
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const activeCategories = Object.entries(categorySizes).filter(([_, size]) => size > 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Storage Breakdown
        </h4>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {usedPercent.toFixed(1)}% Used
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Donut */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-100 dark:text-slate-800"
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Category segments */}
            {activeCategories.map(([cat, size]) => {
              const fraction = size / (totalLimit || 1);
              const strokeDasharray = `${fraction * circumference} ${circumference}`;
              const strokeDashoffset = -currentOffset;
              currentOffset += fraction * circumference;

              return (
                <circle
                  key={cat}
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={CATEGORY_COLORS[cat] || '#64748b'}
                  strokeWidth="12"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 ease-out"
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black text-slate-800 dark:text-white leading-tight">
              {formatBytes(usedBytes)}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              of {formatBytes(totalLimit)}
            </span>
          </div>
        </div>

        {/* Category Legend */}
        <div className="flex-1 w-full grid grid-cols-2 gap-2 text-xs">
          {activeCategories.length === 0 ? (
            <div className="col-span-2 text-center text-slate-400 text-xs py-2">
              No files uploaded yet.
            </div>
          ) : (
            activeCategories.map(([cat, size]) => (
              <div key={cat} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                />
                <div className="truncate">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-slate-400 text-[10px] ml-1">
                    ({formatBytes(size)})
                  </span>
                </div>
              </div>
            ))
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="truncate text-slate-500 dark:text-slate-400">
              Free ({formatBytes(freeBytes)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageDonutChart;
