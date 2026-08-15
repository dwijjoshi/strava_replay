import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// SVGs for the achievements
const getIconSvg = (type) => {
  switch (type) {
    case 'PR_1KM':
      // lightning bolt
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    case 'PR_1MI':
      // trophy
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/><path d="M12 2a6 6 0 0 1 6 6v3.5c0 1.63-1.23 3-2.83 3.15a6.002 6.002 0 0 1-6.34 0C7.23 14.5 6 13.13 6 11.5V8a6 6 0 0 1 6-6Z"/></svg>`;
    case 'CLIMB':
      // mountain / trend-up
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3Z"/></svg>`;
    case 'MAX_SPEED':
      // gauge
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>`;
  }
};

// Create MapController to fit bounds and pan to active marker
const MapController = ({ points, currentPoint, isPlaying, is3D }) => {
  const map = useMap();
  const lastStageRef = useRef('');

  // Initial bounds fit on mount and when points change
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
      lastStageRef.current = 'intro';
    }
  }, [points, map]);

  // When playback starts or 3D mode changes, ensure map is centered on route
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [isPlaying, is3D, points, map]);

  // Cinematic stages and follow cam tracking
  useEffect(() => {
    if (points && points.length > 0 && currentPoint) {
      const totalDuration = points[points.length - 1].elapsedTime || 1;
      const progress = currentPoint.elapsedTime / totalDuration;

      // Identify stage
      let currentStage = 'track';
      if (progress < 0.01) {
        currentStage = 'intro';
      } else if (progress >= 0.95) {
        currentStage = 'outro';
      }

      // If stage changes to intro or outro, zoom out to fit bounds
      if (currentStage !== lastStageRef.current) {
        const oldStage = lastStageRef.current;
        lastStageRef.current = currentStage;
        
        if (currentStage === 'intro' || currentStage === 'outro') {
          const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }

      // If in tracking stage, keep camera centered on coordinates
      if (currentStage === 'track') {
        if (isPlaying) {
          map.setView([currentPoint.lat, currentPoint.lng], 17, {
            animate: true,
            duration: 0.3
          });
        } else {
          map.panTo([currentPoint.lat, currentPoint.lng], {
            animate: true,
            duration: 0.2
          });
        }
      }
    }
  }, [currentPoint, isPlaying, map, points]);

  return null;
};

// Beautiful custom glowing marker for the active position
const createRunnerIcon = () => {
  return L.divIcon({
    className: 'runner-marker-icon',
    html: `
      <div class="relative flex items-center justify-center" style="width: 24px; height: 24px;">
        <div class="absolute w-6 h-6 bg-orange-500 rounded-full animate-ping opacity-75"></div>
        <div class="relative w-4.5 h-4.5 bg-orange-600 rounded-full border-2 border-white shadow-xl shadow-orange-900/50"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Custom achievement marker icon creator
const createAchievementIcon = (badgeColor, type) => {
  const colorHex = badgeColor === 'bg-amber-500' ? '#f59e0b' :
                   badgeColor === 'bg-orange-500' ? '#f97316' :
                   badgeColor === 'bg-red-500' ? '#ef4444' : '#3b82f6';
  
  return L.divIcon({
    className: 'achievement-marker-icon',
    html: `
      <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
        <div class="absolute w-8 h-8 rounded-full opacity-35 animate-pulse" style="background-color: ${colorHex};"></div>
        <div class="relative w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform duration-200" style="background-color: ${colorHex};">
          ${getIconSvg(type)}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function MapView({ points, currentPointIndex, achievements, isPlaying }) {
  const [manualOverride, setManualOverride] = React.useState(false);
  const [userIs3D, setUserIs3D] = React.useState(true);

  const currentPoint = points[currentPointIndex] || points[0];
  const totalDuration = points.length > 0 ? points[points.length - 1].elapsedTime : 1;
  const progress = currentPoint ? currentPoint.elapsedTime / totalDuration : 0;

  // Auto 3D between 1% and 95% progress
  const autoIs3D = progress >= 0.01 && progress < 0.95;
  const is3D = manualOverride ? userIs3D : autoIs3D;

  // Filter achievements that the marker has reached or passed
  const activeAchievements = achievements.filter(
    (ach) => currentPointIndex >= ach.pointIndex
  );

  return (
    <div className={`w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl ${is3D ? 'is-3d-active' : ''}`}>
      <div 
        className="w-full h-full"
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Animated Tilt Container */}
        <div
          className="w-full h-full transition-all duration-1000 ease-in-out"
          style={{
            transform: is3D ? 'rotateX(40deg)' : 'rotateX(0deg)',
            transformOrigin: '50% 50%',
            position: 'absolute',
            top: is3D ? '-40%' : '0%',
            left: is3D ? '-50%' : '0%',
            width: is3D ? '200%' : '100%',
            height: is3D ? '180%' : '100%',
          }}
        >
<MapContainer
              zoomControl={false}
              scrollWheelZoom={true}
              className="w-full h-full"
            >
            {/* Esri World Imagery Satellite Tiles */}
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />

            {points.length > 0 && (
              <>
                {/* 1. Background Route (Semi-transparent White/Dashed) */}
                <Polyline
                  positions={points.map((p) => [p.lat, p.lng])}
                  color="#ffffff"
                  weight={3}
                  opacity={0.5}
                  dashArray="6, 8"
                />

                {/* 2. Traveled Route (Bright Orange Neon) */}
                <Polyline
                  positions={points.slice(0, currentPointIndex + 1).map((p) => [p.lat, p.lng])}
                  color="#f97316"
                  weight={10}
                  opacity={1}
                />

                {/* 3. Achievements Badges / Popups */}
                {activeAchievements.map((ach, idx) => (
                  <Marker
                    key={`${ach.type}-${idx}`}
                    position={[ach.lat, ach.lng]}
                    icon={createAchievementIcon(ach.badgeColor, ach.type)}
                  >
                    <Popup className="custom-popup" closeButton={false}>
                      <div className="p-2 text-center select-none">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${ach.badgeColor} text-white mb-1 shadow-sm`}>
                          {ach.name}
                        </span>
                        <p className="text-sm font-bold text-white">{ach.value}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{ach.desc}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* 4. Moving Runner Marker */}
                {currentPoint && (
                  <Marker
                    position={[currentPoint.lat, currentPoint.lng]}
                    icon={createRunnerIcon()}
                  />
                )}

                {/* 5. Map Controller for fitting bounds and tracking */}
                <MapController points={points} currentPoint={currentPoint} isPlaying={isPlaying} is3D={is3D} />
              </>
            )}
          </MapContainer>
        </div>
      </div>

      {/* Embedded controls overlay for Map Info & 3D Toggle */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-3">
        <div className="glass px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3 pointer-events-none">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Replay Engine v1.0</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Leaflet Map &bull; Esri Satellite {is3D ? '(3D)' : '(2D)'}
            </p>
          </div>
        </div>

        {/* 3D / 2D Toggle Button */}
        <button
          onClick={() => {
            setManualOverride(true);
            setUserIs3D(!is3D);
          }}
          className="glass hover:bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white shadow-lg pointer-events-auto transition-all"
        >
          {is3D ? '2D View' : '3D View'} {!manualOverride && '(Cinematic Auto)'}
        </button>
      </div>
    </div>
  );
}
