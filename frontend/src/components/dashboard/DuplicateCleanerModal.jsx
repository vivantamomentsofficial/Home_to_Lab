import React, { useState, useMemo } from 'react';
import { X, Trash2, Copy, CheckCircle, AlertTriangle, ShieldCheck, Sparkles, Filter, RefreshCw, FileText } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Normalize filename by removing common duplicate suffixes like (1), _final, _copy, - copy, etc.
const getBaseFileName = (filename = '') => {
  const dotIndex = filename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? filename.slice(dotIndex).toLowerCase() : '';
  const name = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename;

  const normalized = name
    .toLowerCase()
    .replace(/[_\s-]?\(?\d+\)?$/, '') // file (1), file-1, file 2
    .replace(/[_\s-]?final(_final)*/gi, '') // file_final, file_final_final
    .replace(/[_\s-]?copy(\s*\d*)*/gi, '') // file_copy, file - copy
    .replace(/[_\s-]?v\d+$/gi, '') // file_v1, file_v2
    .trim();

  return `${normalized}${ext}`;
};

const DuplicateCleanerModal = ({ isOpen, onClose, files = [], onDeleteDuplicates }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [strategy, setStrategy] = useState('keep-newest'); // 'keep-newest' | 'keep-oldest'
  const [isDeleting, setIsDeleting] = useState(false);

  // Analyze duplicates
  const duplicateGroups = useMemo(() => {
    if (!files || files.length === 0) return [];

    const activeFiles = files.filter(f => !f.is_deleted);
    const groups = new Map();

    // 1. Group by content_hash or normalized base name
    for (const f of activeFiles) {
      let key = null;
      if (f.content_hash) {
        key = `hash_${f.content_hash}`;
      } else {
        const baseName = getBaseFileName(f.filename);
        // Use combination of base name + size or base name
        key = `name_${baseName}_${f.size || 0}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(f);
    }

    // Keep only groups that have > 1 file
    const result = [];
    for (const [key, list] of groups.entries()) {
      if (list.length > 1) {
        // Sort files by created_at
        const sorted = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        result.push({
          id: key,
          files: sorted,
          baseName: getBaseFileName(list[0].filename),
          fileSize: list[0].size || 0
        });
      }
    }

    return result;
  }, [files]);

  // Update selected IDs when duplicate groups or strategy change
  useMemo(() => {
    const toSelect = new Set();
    duplicateGroups.forEach(group => {
      const sorted = group.files;
      if (strategy === 'keep-newest') {
        // Keep the last one, select all older ones for deletion
        for (let i = 0; i < sorted.length - 1; i++) {
          toSelect.add(sorted[i].id);
        }
      } else {
        // Keep the first (oldest), select all newer ones
        for (let i = 1; i < sorted.length; i++) {
          toSelect.add(sorted[i].id);
        }
      }
    });
    setSelectedIds(toSelect);
  }, [duplicateGroups, strategy]);

  if (!isOpen) return null;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllDuplicates = () => {
    const toSelect = new Set();
    duplicateGroups.forEach(group => {
      const sorted = group.files;
      const keepIndex = strategy === 'keep-newest' ? sorted.length - 1 : 0;
      sorted.forEach((f, idx) => {
        if (idx !== keepIndex) toSelect.add(f.id);
      });
    });
    setSelectedIds(toSelect);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Calculate potential storage savings
  const totalReclaimableBytes = useMemo(() => {
    let bytes = 0;
    files.forEach(f => {
      if (selectedIds.has(f.id)) {
        bytes += (f.size || 0);
      }
    });
    return bytes;
  }, [files, selectedIds]);

  const handleConfirmClean = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteDuplicates(Array.from(selectedIds));
      onClose();
    } catch (err) {
      console.error('Failed to clean duplicates:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4">
      <div className="glass-card max-w-2xl w-full p-4 sm:p-6 shadow-2xl animate-scale-up flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-850 dark:text-white flex items-center gap-2">
                Duplicate File Cleaner
                {duplicateGroups.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    {duplicateGroups.length} sets found
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Detect redundant copies like <span className="font-mono text-slate-500">lab1.pdf</span>, <span className="font-mono text-slate-500">lab1_final.pdf</span> and reclaim free quota
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Storage Reclaim Banner */}
        {duplicateGroups.length > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-sky-500/10 via-brand-primary/10 to-amber-500/10 border border-sky-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-brand-primary/20 rounded-lg text-brand-primary font-bold">
                <Copy className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-white">
                  Reclaimable Space: {formatBytes(totalReclaimableBytes)}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedIds.size} file(s) selected for cleanup across {duplicateGroups.length} duplicate group(s)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Keep:</span>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="input-field py-1 px-2 text-xs rounded-lg"
              >
                <option value="keep-newest">Keep Latest Version</option>
                <option value="keep-oldest">Keep Original (Oldest)</option>
              </select>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">No Duplicate Files Found</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Your vault is completely clean! No redundant copies or duplicate assignment files were detected.
              </p>
            </div>
          ) : (
            duplicateGroups.map((group, gIdx) => {
              const keepIndex = strategy === 'keep-newest' ? group.files.length - 1 : 0;
              return (
                <div
                  key={group.id || gIdx}
                  className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2.5"
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-primary" />
                      Group: {group.baseName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {group.files.length} copies &bull; {formatBytes(group.fileSize)} each
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {group.files.map((file, idx) => {
                      const isKeep = idx === keepIndex;
                      const isChecked = selectedIds.has(file.id);

                      return (
                        <div
                          key={file.id}
                          onClick={() => !isKeep && toggleSelect(file.id)}
                          className={`p-2 rounded-lg text-xs flex items-center justify-between gap-3 transition-colors ${
                            isKeep
                              ? 'bg-emerald-500/10 border border-emerald-500/30'
                              : isChecked
                              ? 'bg-amber-500/10 border border-amber-500/30 cursor-pointer'
                              : 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {!isKeep ? (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelect(file.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded text-brand-primary cursor-pointer w-3.5 h-3.5"
                              />
                            ) : (
                              <span className="w-3.5 h-3.5 flex items-center justify-center text-emerald-500">
                                &#x2713;
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px] sm:max-w-md" title={file.filename}>
                                {file.filename}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Uploaded {new Date(file.created_at).toLocaleDateString()} at {new Date(file.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isKeep ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                                KEEP
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isChecked ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-slate-400'
                              }`}>
                                {isChecked ? 'REMOVE' : 'IGNORE'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2 text-xs">
            {duplicateGroups.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleSelectAllDuplicates}
                  className="text-slate-500 hover:text-brand-primary cursor-pointer underline text-[11px]"
                >
                  Select all recommended
                </button>
                <span className="text-slate-400">&bull;</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-500 hover:text-brand-primary cursor-pointer underline text-[11px]"
                >
                  Deselect all
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-4 text-xs font-bold"
            >
              Close
            </button>
            {duplicateGroups.length > 0 && (
              <button
                type="button"
                disabled={selectedIds.size === 0 || isDeleting}
                onClick={handleConfirmClean}
                className="btn-danger bg-red-600 hover:bg-red-700 text-white py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs border-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Cleaning...' : `Clean ${selectedIds.size} Files (${formatBytes(totalReclaimableBytes)})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateCleanerModal;
