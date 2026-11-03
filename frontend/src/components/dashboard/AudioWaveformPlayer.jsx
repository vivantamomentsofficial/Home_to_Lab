import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Download, FastForward } from 'lucide-react';

const AudioWaveformPlayer = ({ audioUrl, title, onDownload, autoPlay = false }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Generate a consistent pseudo-waveform for visual beauty
  const barCount = 36;
  const waveformBars = useRef(
    Array.from({ length: barCount }, (_, i) => {
      // Create natural acoustic wave curves
      const base = Math.sin((i / barCount) * Math.PI) * 0.7 + 0.3;
      const variation = Math.sin(i * 1.5) * 0.2;
      return Math.min(Math.max(base + variation, 0.2), 1.0);
    })
  ).current;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      if (autoPlay) {
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, autoPlay]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (index) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const targetTime = (index / barCount) * duration;
    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSliderSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const newTime = (Number(e.target.value) / 100) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Top Header / Track Name */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-white truncate" title={title || 'Voice Memo'}>
            {title || 'Audio Recording'}
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Speed & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-slate-800 hover:bg-slate-700 text-brand-primary border border-slate-700/80 transition-all cursor-pointer"
            title="Change Playback Speed"
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Download Audio"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Waveform Display */}
      <div className="relative py-2 px-1">
        <div className="flex items-center justify-between gap-1 sm:gap-1.5 h-14 w-full cursor-pointer group">
          {waveformBars.map((heightMultiplier, idx) => {
            const barProgress = (idx / barCount) * 100;
            const isPlayed = barProgress <= progressPercent;
            return (
              <div
                key={idx}
                onClick={() => handleSeek(idx)}
                className="flex-1 flex items-center justify-center h-full cursor-pointer py-1"
                title={`Seek to ${formatTime((idx / barCount) * duration)}`}
              >
                <div
                  className={`w-full rounded-full transition-all duration-150 ${
                    isPlayed
                      ? 'bg-gradient-to-t from-brand-primary to-sky-400 shadow-xs shadow-brand-primary/40'
                      : 'bg-slate-750 hover:bg-slate-650'
                  } ${isPlaying && isPlayed ? 'animate-pulse' : ''}`}
                  style={{
                    height: `${Math.round(heightMultiplier * 100)}%`,
                    minHeight: '4px',
                    maxWidth: '4px'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Hidden Precision Range Slider for Scrubbing */}
        <input
          type="range"
          min="0"
          max="100"
          value={progressPercent || 0}
          onChange={handleSliderSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Scrub audio"
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-brand-primary hover:bg-brand-primary-hover active:scale-95 text-white flex items-center justify-center shadow-lg shadow-brand-primary/30 transition-all cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Restart from beginning"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {isPlaying ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Playing
              </span>
            ) : (
              'Ready'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioWaveformPlayer;
