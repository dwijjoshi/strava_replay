import React, { useRef } from 'react';
import { Play, Pause, FastForward, Upload, FileText, CheckCircle2, RotateCcw, Video, Square } from 'lucide-react';
import { formatTime } from '../utils/gpxParser';

export default function PlaybackControls({
  isPlaying,
  onPlayPause,
  currentTime,
  totalDuration,
  speedMultiplier,
  onSpeedChange,
  onScrub,
  onFileUpload,
  loading,
  fileName,
  onReset,
  isRecording,
  onStartRecording,
  onStopRecording,
}) {
  const fileInputRef = useRef(null);

  const handleSliderChange = (e) => {
    onScrub(parseFloat(e.target.value));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.gpx')) {
      onFileUpload(file);
    }
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="w-full glass rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col gap-4">
      {/* Upper Area: File Upload / Info & Reset */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Upload dropzone / status */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 border border-dashed rounded-xl p-3.5 flex items-center justify-center gap-3 cursor-pointer select-none transition-all duration-200 ${
            fileName
              ? 'border-emerald-500/40 bg-emerald-950/10 hover:bg-emerald-950/20'
              : 'border-slate-700 bg-slate-900/40 hover:border-orange-500/40 hover:bg-orange-950/5'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".gpx"
            className="hidden"
          />

          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-300">Parsing GPX file...</span>
            </div>
          ) : fileName ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-200 truncate">{fileName}</p>
                  <p className="text-[10px] text-slate-400">Successfully loaded GPX track</p>
                </div>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono shrink-0">
                Change File
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Upload className="w-4.5 h-4.5 text-orange-500 shrink-0" />
              <p className="text-xs font-bold text-slate-300">
                Drag & drop GPX file here or <span className="text-orange-500 hover:underline">browse</span>
              </p>
            </div>
          )}
        </div>

        {/* Reset button if track loaded */}
        {totalDuration > 0 && (
          <button
            onClick={onReset}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Replay
          </button>
        )}
      </div>

      {totalDuration > 0 && (
        <>
          {/* Middle Area: Progress Seek Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="relative group">
              {/* Custom Track Background for Slider styling */}
              <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-800 rounded-lg transform -translate-y-1/2 pointer-events-none"></div>
              {/* Highlighted portion of Track */}
              <div
                className="absolute top-1/2 left-0 h-1.5 bg-orange-500 rounded-lg transform -translate-y-1/2 pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              ></div>
              
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={currentTime}
                onChange={handleSliderChange}
                className="w-full h-6 appearance-none bg-transparent cursor-pointer focus:outline-none relative z-10 
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-4 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:border-2 
                  [&::-webkit-slider-thumb]:border-orange-500 
                  [&::-webkit-slider-thumb]:shadow-md 
                  [&::-webkit-slider-thumb]:transition-transform 
                  [&::-webkit-slider-thumb]:hover:scale-125"
              />
            </div>

            {/* Time counters */}
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          {/* Lower Area: Controls & Speed Multiplier */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-1">
            {/* Play/Pause Button */}
            {/* Play/Pause & Record Group */}
            <div className="flex items-center gap-3">
              <button
                onClick={onPlayPause}
                className={`p-3.5 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 ${
                  isPlaying
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/20'
                    : 'bg-white text-slate-950 shadow-white/5'
                }`}
                title={isPlaying ? 'Pause Replay' : 'Play Replay'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              {/* Record Screen/Replay Button */}
              <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={`p-3.5 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/20 animate-pulse'
                    : 'bg-slate-905 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
                title={isRecording ? 'Stop Recording Replay' : 'Record Replay as Video'}
              >
                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Video className="w-5 h-5" />}
              </button>
            </div>

            {/* Speed Multiplier Options */}
            <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
              {[1, 2, 4, 8, 16].map((multiplier) => (
                <button
                  key={multiplier}
                  onClick={() => onSpeedChange(multiplier)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    speedMultiplier === multiplier
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {multiplier}x
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
