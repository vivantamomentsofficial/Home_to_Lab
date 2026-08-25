import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, Copy, Check, Download } from 'lucide-react';

const QRCodeModal = ({ isOpen, onClose, code, directUrl, filename }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && code) {
      const targetUrl = directUrl || `${window.location.origin}/?code=${code}`;
      QRCode.toDataURL(
        targetUrl,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        }
      )
      .then((url) => setQrDataUrl(url))
      .catch((error) => console.error('QR code generation error:', error));
    }
  }, [isOpen, code, directUrl]);

  if (!isOpen) return null;

  const targetUrl = directUrl || `${window.location.origin}/?code=${code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `cloudvault-qr-${code}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center animate-scale-up">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
          <QrCode className="w-6 h-6" />
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            Scan Share Code
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 truncate px-4">
          {filename ? `File: ${filename}` : 'Scan with mobile camera to download'}
        </p>

        {/* QR Code Image */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 inline-block shadow-inner mb-4 min-w-[200px] min-h-[200px] flex items-center justify-center">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="rounded-lg w-[200px] h-[200px] block" />
          ) : (
            <div className="text-xs text-slate-400 font-semibold animate-pulse">Generating QR Code...</div>
          )}
        </div>

        {/* Code display */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-2.5 mb-4 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
          <div className="text-left px-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Code</div>
            <div className="text-lg font-black tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">
              {code}
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Copy Direct Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownloadQR}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Download QR Image"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default QRCodeModal;
