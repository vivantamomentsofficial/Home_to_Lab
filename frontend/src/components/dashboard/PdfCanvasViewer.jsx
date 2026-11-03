import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, Download, ExternalLink, AlertCircle } from 'lucide-react';

// Configure PDF.js worker from local static asset
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  } catch (err) {
    console.warn('Failed to set PDF workerSrc:', err);
  }
}

const PdfCanvasViewer = ({ fileUrl, fileName, storagePath, onDownload }) => {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch arrayBuffer from url or blob
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch PDF binary data.');
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

        // Calculate auto-fit scale based on container width
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 32;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.0 });
          const calculatedScale = Math.min(Math.max(containerWidth / viewport.width, 0.6), 1.8);
          setScale(calculatedScale);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF with PDF.js:', err);
        if (!isCancelled) {
          setError(err.message || 'Unable to render PDF document.');
          setLoading(false);
        }
      }
    };

    if (fileUrl) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [fileUrl]);

  // Render current page when currentPage, scale, or rotation changes
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfDocRef.current || !canvasRef.current || loading) return;

      try {
        // Cancel any pending render task to prevent collision
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
  }, [currentPage, scale, rotation, loading]);

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

  // If PDF.js fails (e.g. strict worker policy or password-protected PDF), seamlessly embed using native <object>
  if (error) {
    return (
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
        {fileUrl ? (
          <object
            data={fileUrl}
            type="application/pdf"
            className="w-full h-full min-h-[500px] rounded-2xl border-0"
          >
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl h-full">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-850 dark:text-white mb-1">
                  Unable to display PDF preview directly
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                  This document might be password-protected or uses features not supported by in-browser rendering.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {onDownload && (
                    <button
                      type="button"
                      onClick={onDownload}
                      className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </button>
                  )}
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary py-2 px-4 text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" /> Open in New Tab
                    </a>
                  )}
                </div>
              </div>
            </div>
          </object>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-xs text-slate-500">Document URL is not available.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
      {/* Floating Toolbar */}
      <div className="p-2 sm:p-2.5 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
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
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-1 min-w-[70px] text-center">
            {loading ? '...' : `${currentPage} / ${numPages}`}
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

        {/* Zoom & Rotation Controls */}
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
          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 min-w-[42px] text-center hidden sm:inline">
            {Math.round(scale * 100)}%
          </span>
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

      {/* Main Document Viewing Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3 sm:p-6 custom-scrollbar relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            <span className="text-xs font-semibold">Rendering PDF pages...</span>
          </div>
        ) : (
          <div className="shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 transition-all duration-150">
            <canvas ref={canvasRef} className="block max-w-none" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfCanvasViewer;
