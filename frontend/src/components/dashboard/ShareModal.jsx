import React, { useState } from 'react';
import { 
  X, Share2, Copy, Check, Lock, Flame, Clock, QrCode, ShieldCheck, KeyRound, Download, RefreshCw 
} from 'lucide-react';
import QRCode from 'qrcode';

const ShareModal = ({
  isOpen,
  onClose,
  itemTitle = 'Item',
  onGenerateCode,
  shareResult = null,
  isLoading = false,
}) => {
  const [expiryOption, setExpiryOption] = useState('30m');
  const [enablePin, setEnablePin] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (enablePin && (!pinCode || pinCode.length < 4)) {
      alert('Please enter a 4-digit PIN for access protection.');
      return;
    }
    const result = await onGenerateCode({
      expiryOption,
      enablePin,
      pinCode,
      selfDestruct,
    });

    if (result && result.code) {
      try {
        const url = `${window.location.origin}/?code=${result.code}`;
        const qrUrl = await QRCode.toDataURL(url, { width: 240, margin: 2 });
        setQrDataUrl(qrUrl);
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    }
  };

  const handleCopyLink = () => {
    if (!shareResult?.code) return;
    const url = `${window.location.origin}/?code=${shareResult.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Share via 6-Digit Code</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">{itemTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {!shareResult ? (
            <>
              {/* Expiry Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" /> Expiry Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '10m', label: '10 Mins' },
                    { id: '30m', label: '30 Mins' },
                    { id: '1h', label: '1 Hour' },
                    { id: '6h', label: '6 Hours' },
                    { id: '24h', label: '24 Hours' },
                    { id: '7d', label: '7 Days' },
                  ].map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => setExpiryOption(exp.id)}
                      className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                        expiryOption === exp.id
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Protection Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Require 4-Digit PIN Protection</span>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">Recipient must enter PIN before accessing content</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePin}
                    onChange={(e) => setEnablePin(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
                {enablePin && (
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter 4 to 6 digit PIN (e.g., 1234)"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 text-xs font-mono tracking-widest bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                  />
                )}
              </div>

              {/* Self-Destruct Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Burn After Read (Self-Destruct)</span>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Code expires automatically after first view/download</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selfDestruct}
                  onChange={(e) => setSelfDestruct(e.target.checked)}
                  className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Generating Code...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" /> Generate Access Code
                  </>
                )}
              </button>
            </>
          ) : (
            /* Result Code Generated View */
            <div className="text-center space-y-5 py-2">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Share Access Code Created</h4>
                <div className="mt-2 text-4xl font-mono font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 select-all">
                  {shareResult.code}
                </div>
              </div>

              {qrDataUrl && (
                <div className="flex flex-col items-center justify-center gap-2">
                  <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" />
                  <span className="text-[11px] text-slate-400">Scan QR Code to download instantly</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" /> Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Share Link
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="py-3 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
