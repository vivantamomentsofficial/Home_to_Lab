import React, { useState, useEffect } from 'react';
import { UploadCloud, File, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GlobalDropzone = ({ onFileDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev + 1);
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsDragging(false);
          return 0;
        }
        return next;
      });
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        if (onFileDrop) {
          onFileDrop(files);
        } else {
          // Default action: Store dropped file in session & navigate to home quick upload
          try {
            window.droppedFilesCache = files;
          } catch (err) {
            console.error('Failed to cache dropped files:', err);
          }
          navigate('/');
          setTimeout(() => {
            document.getElementById('code-input-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onFileDrop, navigate]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl transition-all duration-300 animate-fadeIn p-6 overflow-hidden select-none">
      {/* Visual Ripple Rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-indigo-500/30 animate-ripple pointer-events-none"></div>
      <div className="absolute w-[700px] h-[700px] rounded-full border border-indigo-400/20 animate-ripple pointer-events-none" style={{ animationDelay: '0.6s' }}></div>
      <div className="absolute w-[900px] h-[900px] rounded-full border border-cyan-400/15 animate-ripple pointer-events-none" style={{ animationDelay: '1.2s' }}></div>

      <div className="relative z-10 max-w-xl w-full border-4 border-dashed border-indigo-400/90 dark:border-indigo-400 rounded-3xl p-12 text-center bg-white/10 dark:bg-slate-900/70 shadow-2xl backdrop-blur-xl transform scale-102 transition-transform">
        <div className="relative inline-flex mb-6">
          <div className="p-6 rounded-3xl bg-indigo-500/20 text-indigo-300 shadow-inner ring-8 ring-indigo-500/20 animate-bounce">
            <UploadCloud className="w-16 h-16 text-indigo-300" />
          </div>
          <div className="absolute -top-1 -right-1 p-2 rounded-full bg-cyan-500/30 border border-cyan-300/40 text-cyan-200 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3 font-display">
          Drop Files to Share Instantly
        </h2>
        <p className="text-indigo-200 text-base max-w-md mx-auto mb-6 leading-relaxed font-medium">
          Release anywhere to generate an instant 6-digit access code or upload to your encrypted vault.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold tracking-wide border border-indigo-400/40 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-cyan-300" /> AES-256 Client-Side Encrypted & Anti-Malware Protected
        </div>
      </div>
    </div>
  );
};

export default GlobalDropzone;
