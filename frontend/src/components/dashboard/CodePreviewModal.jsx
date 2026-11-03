import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Play, Download, ZoomIn, ZoomOut, FileCode, ExternalLink } from 'lucide-react';

const detectLanguage = (filename) => {
  if (!filename) return 'Plain Text';
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    js: 'JavaScript', jsx: 'React JSX', ts: 'TypeScript', tsx: 'React TSX',
    py: 'Python', java: 'Java', c: 'C', cpp: 'C++', cs: 'C#',
    html: 'HTML', css: 'CSS', json: 'JSON', xml: 'XML',
    sql: 'SQL', sh: 'Bash Shell', php: 'PHP', go: 'Go', rs: 'Rust',
    md: 'Markdown', txt: 'Plain Text', csv: 'CSV Data'
  };
  return map[ext] || ext.toUpperCase();
};

// Safe line highlighter
const highlightCodeLine = (line, lang) => {
  if (line === undefined || line === null || line === '') {
    return <span>&nbsp;</span>;
  }

  // Safe string conversion
  const str = String(line);

  // Check for comments
  const trimmed = str.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
    return <span className="text-emerald-400/90 italic font-mono">{str}</span>;
  }

  // Escape HTML
  const safe = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Match keywords, strings, numbers
  const keywords = /\b(import|export|from|const|let|var|function|return|if|else|for|while|switch|case|break|class|public|private|static|void|int|float|double|char|boolean|new|this|async|await|try|catch|finally|def|elif|print|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|GROUP|BY|ORDER)\b/g;
  const strings = /(".*?"|'.*?'|`.*?`)/g;
  const numbers = /\b(\d+)\b/g;

  const highlighted = safe
    .replace(strings, '<span class="text-amber-300 font-medium">$1</span>')
    .replace(keywords, '<span class="text-sky-400 font-bold">$1</span>')
    .replace(numbers, '<span class="text-purple-300">$1</span>');

  return (
    <span
      className="font-mono text-slate-200"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
};

const CodePreviewModal = ({ previewText, title, content, onClose, onOpenInCompiler, onDownload }) => {
  // Support both object prop { previewText: { title, content } } and direct props { title, content }
  const fileTitle = title || previewText?.title || 'Code Preview';
  const fileContent = (content !== undefined && content !== null)
    ? String(content)
    : (previewText?.content !== undefined && previewText?.content !== null ? String(previewText.content) : '');

  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState(13); // px

  const lines = useMemo(() => {
    if (!fileContent && fileContent !== '') return ['// Empty file'];
    return fileContent.split('\n');
  }, [fileContent]);

  const language = detectLanguage(fileTitle);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Fallback copy
        try {
          const textarea = document.createElement('textarea');
          textarea.value = fileContent;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (e) {
          console.warn('Copy error:', e);
        }
      });
  };

  const handleZoomIn = () => setFontSize(prev => Math.min(prev + 1, 18));
  const handleZoomOut = () => setFontSize(prev => Math.max(prev - 1, 10));

  const handleCompilerClick = () => {
    if (onOpenInCompiler) {
      onOpenInCompiler(language, fileContent, fileTitle);
    } else {
      window.open('/compiler', '_blank');
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 cursor-pointer animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card max-w-4xl w-full h-[88vh] flex flex-col p-0 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-default animate-scale-up"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary shrink-0">
              <FileCode className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-850 dark:text-white truncate">
                  {fileTitle}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-brand-primary/15 text-brand-primary shrink-0">
                  {language}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {lines.length} lines &bull; {((fileContent.length || 0) / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Font size control */}
            <div className="hidden sm:flex items-center gap-0.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={fontSize <= 10}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 rounded cursor-pointer"
                title="Decrease font size"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1 text-slate-500">{fontSize}px</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={fontSize >= 18}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 rounded cursor-pointer"
                title="Increase font size"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Run in compiler button */}
            <button
              type="button"
              onClick={handleCompilerClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-colors cursor-pointer shadow-xs"
              title="Open and Run Code in Online Compiler"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Run Code</span>
            </button>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
              }`}
              title="Copy entire code"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            {onDownload && (
              <button
                type="button"
                onClick={onDownload}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Download File"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content Area with Line Numbers */}
        <div className="flex-1 overflow-auto bg-slate-950 font-mono text-slate-200 custom-scrollbar select-text">
          <div className="flex min-w-full" style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize * 1.6}px` }}>
            {/* Line numbers gutter */}
            <div className="shrink-0 select-none px-3.5 py-3 text-right text-slate-600 bg-slate-900/70 border-r border-slate-800/80 font-mono">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code lines */}
            <div className="flex-1 px-4 py-3 overflow-x-auto">
              {lines.map((line, i) => (
                <div key={i} className="whitespace-pre hover:bg-white/5 transition-colors">
                  {highlightCodeLine(line, language)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>UTF-8 &bull; LF &bull; Read-Only Preview</span>
          <span>{lines.length} Lines</span>
        </div>
      </div>
    </div>
  );
};

export default CodePreviewModal;
