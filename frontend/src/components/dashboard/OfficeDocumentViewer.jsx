import React, { useState } from 'react';
import { Download, ExternalLink, RefreshCw, FileSpreadsheet, FileText, Presentation, AlertCircle } from 'lucide-react';

const OfficeDocumentViewer = ({ fileUrl, fileName, storagePath, onDownload }) => {
  const [engine, setEngine] = useState('google'); // 'google' | 'office'
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';

  // Determine icon & friendly type
  const isSheet = ['xlsx', 'xls', 'csv', 'ods'].includes(ext);
  const isPresentation = ['pptx', 'ppt', 'odp'].includes(ext);
  const typeLabel = isSheet ? 'Spreadsheet' : isPresentation ? 'Presentation' : 'Document';

  // Embed URLs
  const encodedUrl = encodeURIComponent(fileUrl);
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

  const currentViewerUrl = engine === 'google' ? googleViewerUrl : officeViewerUrl;

  const handleReload = () => {
    setIsLoading(true);
    setHasError(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 font-bold flex items-center gap-1.5">
            {isSheet ? (
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            ) : isPresentation ? (
              <Presentation className="w-4 h-4 text-amber-500" />
            ) : (
              <FileText className="w-4 h-4 text-sky-500" />
            )}
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider">{typeLabel} Preview</span>
          </div>

          {/* Engine Selector */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => { setEngine('google'); handleReload(); }}
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
              onClick={() => { setEngine('office'); handleReload(); }}
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
          <button
            type="button"
            onClick={handleReload}
            title="Reload Viewer"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Direct Link"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-[11px]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open in Tab</span>
          </a>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="btn-primary py-1 px-2.5 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Frame Container */}
      <div className="relative flex-1 w-full min-h-[500px] h-[70vh] bg-slate-950 flex flex-col items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-xs gap-3">
            <div className="w-9 h-9 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium text-slate-300">
              Loading {engine === 'google' ? 'Google Docs Viewer' : 'Office Online'}...
            </p>
            <span className="text-[11px] text-slate-500">Converting {ext.toUpperCase()} document for web rendering</span>
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Preview Service Unavailable</h4>
            <p className="text-xs text-slate-400">
              The preview engine could not embed this document directly. You can try switching to the other viewer engine, open in a new tab, or download the original file.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setEngine(engine === 'google' ? 'office' : 'google')}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Try {engine === 'google' ? 'Office' : 'Google'} Engine
              </button>
              {onDownload && (
                <button
                  type="button"
                  onClick={onDownload}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>
              )}
            </div>
          </div>
        ) : (
          <iframe
            key={`${engine}-${fileUrl}`}
            src={currentViewerUrl}
            title={fileName || 'Document Preview'}
            className="w-full h-full border-0 bg-white"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default OfficeDocumentViewer;
