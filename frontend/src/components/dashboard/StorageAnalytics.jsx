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
  const remainingBytes = Math.max(0, maxStorageBytes - totalStorageUsed);

  // Status badge config
  const statusConfig = percentageUsed > 90
    ? { text: 'Nearly Full', color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' }
    : percentageUsed > 75
    ? { text: 'Filling Up', color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' }
    : { text: 'Optimal Space', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Donut Chart Card */}
      <div className="glass-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Category Split
              </h3>
              <p className="text-[10px] text-slate-400">By file classification</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {filesCount} items
          </span>
        </div>
        <div className="flex items-center justify-center py-1">
          <StorageDonutChart files={files} totalLimit={maxStorageBytes} showCardWrapper={false} />
        </div>
      </div>

      {/* Quota Progress & Summary */}
      <div className="lg:col-span-2 glass-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Vault Storage Allocation
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {formatBytes(totalStorageUsed)}
                </h3>
                <span className="text-xs font-medium text-slate-400">
                  of {formatBytes(maxStorageBytes)} allocated
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold border rounded-full ${statusConfig.color}`}>
                {statusConfig.text}
              </span>
              <span className="px-2.5 py-1 text-xs font-extrabold bg-brand-primary/10 text-brand-primary dark:text-brand-primary-light rounded-full border border-brand-primary/20">
                {percentageUsed}% Used
              </span>
            </div>
          </div>

          {/* Progress Bar with Gradient */}
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 mb-2">
            <div 
              className="bg-gradient-to-r from-brand-primary via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${Math.max(2, percentageUsed)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-5 px-0.5">
            <span>0 Bytes</span>
            <span>{formatBytes(remainingBytes)} free remaining</span>
            <span>{formatBytes(maxStorageBytes)} max</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Vault Files</span>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{filesCount}</div>
            <span className="text-[9px] text-slate-400">Encrypted in cloud</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Notes & Snippets</span>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{notesCount}</div>
            <span className="text-[9px] text-slate-400">Active clipboard items</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Security Engine</span>
            <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AES-256 Armed
            </div>
            <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80">Zero-Knowledge Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageAnalytics;
