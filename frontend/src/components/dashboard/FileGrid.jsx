import React from 'react';
import { 
  File, FileText, Image, Film, Music, Archive, Code, Search, 
  Grid, List, Eye, Download, Share2, Trash, Lock, MoreVertical, CheckSquare, Square
} from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'image': return Image;
    case 'video': return Film;
    case 'audio': return Music;
    case 'document': return FileText;
    case 'code': return Code;
    case 'text': return FileText;
    case 'zip': return Archive;
    default: return File;
  }
};

const FileGrid = ({
  files = [],
  viewMode = 'grid',
  searchQuery = '',
  selectedCategory = 'all',
  selectedFileIds = [],
  onSelectFile,
  onSelectAll,
  onPreviewFile,
  onDownloadFile,
  onShareFile,
  onDeleteFile,
}) => {
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedCategory === 'all') return matchesSearch;
    return matchesSearch && file.category === selectedCategory;
  });

  if (filteredFiles.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
        <File className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No files found</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          {searchQuery ? `No files matching "${searchQuery}"` : 'Upload files to populate your encrypted vault.'}
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="p-4 w-10">
                  <button 
                    onClick={onSelectAll}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {selectedFileIds.length > 0 && selectedFileIds.length === filteredFiles.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">Name</th>
                <th className="p-4">Size</th>
                <th className="p-4">Category</th>
                <th className="p-4">Date Added</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredFiles.map((file) => {
                const IconComponent = getCategoryIcon(file.category);
                const isSelected = selectedFileIds.includes(file.id);

                return (
                  <tr 
                    key={file.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                    }`}
                  >
                    <td className="p-4">
                      <button onClick={() => onSelectFile(file.id)}>
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-xs">{file.filename}</span>
                        {file.encrypted && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Encrypted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatBytes(file.size)}
                    </td>
                    <td className="p-4 text-xs capitalize text-slate-500 dark:text-slate-400">
                      {file.category || 'other'}
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPreviewFile(file)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Preview File"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadFile(file)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onShareFile(file)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Generate 6-Digit Share Code"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteFile(file.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Move to Trash"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {filteredFiles.map((file) => {
        const IconComponent = getCategoryIcon(file.category);
        const isSelected = selectedFileIds.includes(file.id);

        return (
          <div
            key={file.id}
            className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all duration-200 hover:shadow-lg ${
              isSelected 
                ? 'border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20' 
                : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title={file.filename}>
                    {file.filename}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => onSelectFile(file.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 opacity-100" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </div>

            {file.encrypted && (
              <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Lock className="w-3 h-3" /> Encrypted Vault Object
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {new Date(file.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPreviewFile(file)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDownloadFile(file)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onShareFile(file)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Share Code"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteFile(file.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Trash"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileGrid;
