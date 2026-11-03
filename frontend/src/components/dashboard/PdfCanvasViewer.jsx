import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, Download, ExternalLink, Smartphone, Monitor } from 'lucide-react';

// Configure PDF.js worker from local public static asset
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch (err) {
    console.warn('Failed to set PDF workerSrc:', err);
  }
}

const PdfCanvasViewer = ({ fileUrl, fileName, storagePath, onDownload }) => {
  // Auto-detect mobile devices: on mobile default to canvas, on desktop default to native iframe
  const isMobileDevice = typeof window !== 'undefined' && (
    window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' default for seamless cross-platform rendering
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [canvasError, setCanvasError] = useState(null);
  const [rotation, setRotation] = useState(0);

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const containerRef = useRef(null);

  // Load PDF with PDF.js for canvas rendering
  useEffect(() => {
    if (!fileUrl) return;
    let isCancelled = false;

    const loadPdfData = async () => {
      try {
        setLoading(true);
        setCanvasError(null);

        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to load PDF data.');
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
          enableXfa: true,
          isEvalSupported: false,
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);

        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 32;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.0 });
          const calculatedScale = Math.min(Math.max(containerWidth / viewport.width, 0.6), 1.8);
          setScale(calculatedScale);
        }

        setLoading(false);
      } catch (err) {
        console.warn('PDF.js canvas parsing notice:', err);
        if (!isCancelled) {
          setCanvasError(err.message || 'Canvas rendering error');
          setLoading(false);
          // If canvas mode encounters issue on desktop, seamlessly default to native view
          if (!isMobileDevice) {
            setViewMode('native');
          }
        }
      }
    };

    loadPdfData();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [fileUrl, isMobileDevice]);

  // Render page onto canvas
  useEffect(() => {
    if (viewMode !== 'canvas' || !pdfDocRef.current || !canvasRef.current || loading) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, scale, rotation, loading, viewMode]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.4));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      
      {/* Viewer Header / Toolbar */}
      <div className="p-2 sm:p-2.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
        
        {/* Left Side: View Mode Toggle (Interactive Canvas / Standard Reader) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode(prev => prev === 'canvas' ? 'native' : 'canvas')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title={viewMode === 'canvas' ? 'Switch to Standard Browser Reader' : 'Switch to Interactive Canvas View'}
          >
            {viewMode === 'canvas' ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">Standard Reader</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-brand-primary" />
                <span className="hidden sm:inline">Interactive View</span>
              </>
            )}
          </button>
        </div>

        {/* Center / Right: Canvas Controls if in Canvas Mode */}
        {viewMode === 'canvas' && !canvasError ? (
          <div className="flex items-center gap-2">
            {/* Page Nav */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || loading}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[60px] text-center">
                {loading ? '...' : `${currentPage}/${numPages}`}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= numPages || loading}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={loading || scale <= 0.4}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={loading || scale >= 3.0}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                disabled={loading}
                className="p-1 sm:p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                title="Rotate 90deg"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Download Document"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Open in Full Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Body: Native iframe View OR Canvas View */}
      <div className="flex-1 w-full h-full min-h-[500px] overflow-hidden relative">
        {viewMode === 'native' ? (
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=0`}
            title={fileName || 'PDF Document'}
            className="w-full h-full min-h-[500px] border-0 rounded-b-2xl bg-white"
          />
        ) : (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-3 sm:p-6 custom-scrollbar relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
                <span className="text-xs font-semibold">Rendering PDF pages...</span>
              </div>
            ) : canvasError ? (
              <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Interactive renderer encountered an issue loading this layout.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('native')}
                    className="btn-primary py-2 px-4 text-xs font-bold"
                  >
                    Switch to Standard Reader
                  </button>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-2 px-4 text-xs font-bold"
                    >
                      Open in New Tab
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 transition-all duration-150 max-w-full">
                <canvas ref={canvasRef} className="block max-w-full h-auto mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PdfCanvasViewer;
