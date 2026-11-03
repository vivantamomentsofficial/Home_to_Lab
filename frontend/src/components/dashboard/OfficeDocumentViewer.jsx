import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, RefreshCw, FileSpreadsheet, FileText, Presentation, AlertCircle, Eye } from 'lucide-react';

const OfficeDocumentViewer = ({ fileUrl, fileName, storagePath, onDownload }) => {
  const [engine, setEngine] = useState('google'); // 'google' | 'office'
  const [isLoading, setIsLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';

  const isSheet = ['xlsx', 'xls', 'csv', 'ods'].includes(ext);
  const isPresentation = ['pptx', 'ppt', 'odp'].includes(ext);
  const typeLabel = isSheet ? 'Spreadsheet' : isPresentation ? 'Presentation' : 'Document';

  const encodedUrl = encodeURIComponent(fileUrl || '');
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

  const currentViewerUrl = engine === 'google' ? googleViewerUrl : officeViewerUrl;

  useEffect(() => {
    setIsLoading(true);
    setTimedOut(false);
    // If iframe doesn't finish loading in 6 seconds (e.g. localhost or remote blocker), show direct options
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimedOut(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [engine, fileUrl]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Viewer Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 font-bold flex items-center gap-1.5">
            {isSheet ? (
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            ) : isPresentation ? (
              <Presentation className="w-4 h-4 text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-sky-500" />
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider">{typeLabel} ({ext.toUpperCase()})</span>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => { setEngine('google'); setIsLoading(true); setTimedOut(false); }}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                engine === 'google'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Google Docs Viewer
            </button>
            <button
              type="button"
              onClick={() => { setEngine('office'); setIsLoading(true); setTimedOut(false); }}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                engine === 'office'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Office Online Viewer
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={currentViewerUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Full Web Viewer"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Fullscreen</span>
          </a>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="btn-primary py-1 px-3 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative flex-1 w-full min-h-[480px] h-[72vh] bg-slate-950 flex flex-col items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xs gap-3">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-slate-300">
              Rendering {engine === 'google' ? 'Google Docs Viewer' : 'Office Online'}...
            </p>
            <span className="text-[11px] text-slate-500">Preparing document for in-browser viewing</span>
          </div>
        )}

        <iframe
          key={`${engine}-${fileUrl}`}
          src={currentViewerUrl}
          title={fileName || 'Document Preview'}
          className="w-full h-full border-0 bg-white"
          onLoad={() => setIsLoading(false)}
        />

        {/* Quick Helper Floating Bar at bottom */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full flex items-center gap-3 text-xs text-slate-300 shadow-xl">
          <span className="text-[11px] text-slate-400">Preview not loading?</span>
          <button
            type="button"
            onClick={() => setEngine(engine === 'google' ? 'office' : 'google')}
            className="text-sky-400 hover:underline font-bold text-[11px] cursor-pointer"
          >
            Switch to {engine === 'google' ? 'Office' : 'Google'}
          </button>
          <span className="text-slate-600">&bull;</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline font-bold text-[11px] flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Direct Open
          </a>
        </div>
      </div>
    </div>
  );
};

export default OfficeDocumentViewer;
