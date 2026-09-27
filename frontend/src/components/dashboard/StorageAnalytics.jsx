import React from 'react';
import { HardDrive, File, ShieldAlert, Sparkles, Folder, Trash, RotateCcw } from 'lucide-react';
import StorageDonutChart from '../StorageDonutChart';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const StorageAnalytics = ({
  totalStorageUsed = 0,
  maxStorageBytes = 2 * 1024 * 1024 * 1024, // 2 GB default quota
  filesCount = 0,
  notesCount = 0,
  files = [],
}) => {
  const percentageUsed = Math.min(100, Math.round((totalStorageUsed / (maxStorageBytes || 1)) * 100));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Donut Chart Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-indigo-500" /> Storage Breakdown
        </h3>
        <StorageDonutChart files={files} totalLimit={maxStorageBytes} />
      </div>

      {/* Quota Progress & Summary */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Vault Quota Used</span>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatBytes(totalStorageUsed)} <span className="text-xs text-slate-400 font-normal">/ {formatBytes(maxStorageBytes)}</span>
              </h3>
            </div>
            <span className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-full">
              {percentageUsed}% Used
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-6">
            <div 
              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentageUsed}%` }}
            />
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400">Total Files</span>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{filesCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400">Notes & Snippets</span>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{notesCount}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400">Security Status</span>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AES-256 Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageAnalytics;
