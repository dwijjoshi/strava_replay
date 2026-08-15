import React from 'react';
import { Zap, Award, TrendingUp, Gauge, Navigation } from 'lucide-react';

export default function AchievementsPanel({ achievements, onAchievementClick, currentPointIndex }) {
  const getIcon = (type) => {
    switch (type) {
      case 'PR_1KM':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'PR_1MI':
        return <Award className="w-5 h-5 text-orange-500" />;
      case 'CLIMB':
        return <TrendingUp className="w-5 h-5 text-red-500" />;
      case 'MAX_SPEED':
        return <Gauge className="w-5 h-5 text-blue-500" />;
      default:
        return <Award className="w-5 h-5 text-slate-500" />;
    }
  };

  if (!achievements || achievements.length === 0) {
    return null;
  }

  return (
    <div className="w-full glass rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/60 pb-2">
          Route Achievements
        </h2>
        <p className="text-[10px] text-slate-500 mt-1">
          Click any achievement to jump the replay marker directly to that effort.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {achievements.map((ach, idx) => {
          const isPassed = currentPointIndex >= ach.pointIndex;
          
          return (
            <div
              key={`${ach.type}-${idx}`}
              onClick={() => onAchievementClick(ach.pointIndex)}
              className={`group flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                isPassed
                  ? 'bg-slate-900/80 border-orange-500/20 hover:border-orange-500/40 hover:bg-slate-850'
                  : 'bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/25 opacity-60 hover:opacity-90'
              }`}
            >
              {/* Left: Icon inside rounded bg */}
              <div className={`p-2.5 rounded-lg shrink-0 flex items-center justify-center transition-all ${
                isPassed ? 'bg-slate-850' : 'bg-slate-900'
              }`}>
                {getIcon(ach.type)}
              </div>

              {/* Middle: Details */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-orange-500 transition-colors">
                  {ach.name}
                </p>
                <p className="text-base font-black text-white tracking-tight mt-0.5">
                  {ach.value}
                </p>
                <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                  {ach.desc}
                </p>
              </div>

              {/* Right: Jump Indicator */}
              <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Navigation className="w-3.5 h-3.5 text-orange-500 rotate-45" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
