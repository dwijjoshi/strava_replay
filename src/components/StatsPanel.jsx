import React from 'react';
import { Timer, MapPin, Gauge, Mountain, TrendingUp } from 'lucide-react';
import { formatTime, formatPace } from '../utils/gpxParser';

export default function StatsPanel({ currentPoint, totalDistance, elevationGain }) {
  if (!currentPoint) {
    return (
      <div className="w-full glass rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col items-center justify-center min-h-[160px] text-slate-500">
        <p className="text-sm font-semibold">Upload a GPX file to display active telemetry</p>
      </div>
    );
  }

  // Unit conversion
  const distanceKm = currentPoint.distance / 1000;
  const speedKmh = currentPoint.speed * 3.6;
  const paceStr = formatPace(currentPoint.speed);
  const elevation = currentPoint.elevation;
  const elapsed = currentPoint.elapsedTime;

  return (
    <div className="w-full glass rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col gap-4">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-2">
        Live Telemetry
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Distance Card */}
        <div className="flex flex-col p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span>Distance</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-white tracking-tight">
              {distanceKm.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">KM</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-orange-500 h-full transition-all duration-200" 
              style={{ width: `${(currentPoint.distance / totalDistance) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Time Card */}
        <div className="flex flex-col p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
            <Timer className="w-3.5 h-3.5 text-orange-500" />
            <span>Elapsed Time</span>
          </div>
          <span className="text-xl font-mono font-black text-white tracking-tight mt-0.5">
            {formatTime(elapsed)}
          </span>
          <span className="text-[9px] text-slate-500 font-semibold mt-2.5">
            Duration: {formatTime(elapsed)}
          </span>
        </div>

        {/* Pace Card */}
        <div className="flex flex-col p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
            <Gauge className="w-3.5 h-3.5 text-orange-500" />
            <span>Current Pace</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-white tracking-tight">
              {paceStr}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">/KM</span>
          </div>
          <span className="text-[9px] text-slate-500 font-semibold mt-2.5">
            Instantaneous
          </span>
        </div>

        {/* Speed Card */}
        <div className="flex flex-col p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
            <Gauge className="w-3.5 h-3.5 text-orange-500" />
            <span>Speed</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-white tracking-tight">
              {speedKmh.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">KM/H</span>
          </div>
          <span className="text-[9px] text-slate-500 font-semibold mt-2.5">
            {(speedKmh * 0.621371).toFixed(1)} MPH
          </span>
        </div>

        {/* Elevation Card */}
        <div className="flex flex-col p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl col-span-2 md:col-span-1">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-1">
            <Mountain className="w-3.5 h-3.5 text-orange-500" />
            <span>Elevation</span>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-white tracking-tight">
              {Math.round(elevation)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">M</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold mt-2">
            <TrendingUp className="w-3 h-3 text-red-500" />
            <span>Gain: +{Math.round(elevationGain)}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
