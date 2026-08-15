import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Activity, RefreshCw } from 'lucide-react';
import MapView from './components/MapView';
import PlaybackControls from './components/PlaybackControls';
import StatsPanel from './components/StatsPanel';
import AchievementsPanel from './components/AchievementsPanel';
import { parseGPX } from './utils/gpxParser';

export default function App() {
  const [gpxData, setGpxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  
  // Replay State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(2); // Default to 2x for a good speed

  const animationRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Load sample GPX on mount
  useEffect(() => {
    loadSampleGPX();
  }, []);

  const loadSampleGPX = async () => {
    setLoading(true);
    try {
      const response = await fetch('/sample.gpx');
      if (!response.ok) throw new Error('Failed to load sample GPX');
      const text = await response.text();
      const parsed = parseGPX(text);
      setGpxData(parsed);
      setFileName('Golden Gate Park Morning Run (Sample)');
      resetReplay(parsed);
    } catch (err) {
      console.error('Error fetching sample GPX:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file) => {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = parseGPX(text);
        setGpxData(parsed);
        setFileName(file.name);
        resetReplay(parsed);
      } catch (err) {
        alert(`Error parsing GPX: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const resetReplay = (data = gpxData) => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentPointIndex(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    lastTimeRef.current = null;
  };

  // Binary search to find closest point at currentTime
  const findPointIndexAtTime = (points, time) => {
    if (!points || points.length === 0) return 0;
    if (time <= 0) return 0;
    if (time >= points[points.length - 1].elapsedTime) return points.length - 1;

    let low = 0;
    let high = points.length - 1;
    let ans = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].elapsedTime <= time) {
        ans = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return ans;
  };

  // Sync index when currentTime changes
  useEffect(() => {
    if (gpxData && gpxData.points) {
      const idx = findPointIndexAtTime(gpxData.points, currentTime);
      setCurrentPointIndex(idx);
    }
  }, [currentTime, gpxData]);

  // Playback Animation Frame Loop
  useEffect(() => {
    const animate = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }
      const elapsedRealTimeSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying && gpxData) {
        setCurrentTime((prevTime) => {
          // Map standard duration (e.g. 1 hour) to play back in 25 seconds at 1x speed multiplier.
          const targetPlaybackDuration = 25; // seconds
          const playbackSpeedFactor = gpxData.totalDuration / targetPlaybackDuration;
          const increment = elapsedRealTimeSec * playbackSpeedFactor * speedMultiplier;
          const nextTime = prevTime + increment;

          if (nextTime >= gpxData.totalDuration) {
            setIsPlaying(false);
            return gpxData.totalDuration;
          }
          return nextTime;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      lastTimeRef.current = null;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gpxData, speedMultiplier]);

  const handlePlayPause = () => {
    if (currentTime >= (gpxData?.totalDuration || 0)) {
      // Loop replay around if at the end
      setCurrentTime(0);
      setCurrentPointIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Screen Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const handleStartRecording = async () => {
    try {
      // Capture browser screen/tab stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        audio: false
      });
      
      streamRef.current = stream;
      
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Save as MP4 file extension as requested
        a.download = `${fileName ? fileName.replace(/\.[^/.]+$/, "") : 'activity-replay'}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        mediaRecorderRef.current = null;
        streamRef.current = null;
      };
      
      setIsRecording(true);
      recorder.start();
      
      // Auto-stop recording if sharing is stopped externally
      stream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      };
    } catch (err) {
      console.error('Error starting recording:', err);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleScrub = (time) => {
    setCurrentTime(time);
    lastTimeRef.current = null;
  };

  const handleAchievementClick = (pointIndex) => {
    if (gpxData && gpxData.points[pointIndex]) {
      const time = gpxData.points[pointIndex].elapsedTime;
      setCurrentTime(time);
      // Auto-pause when user inspects an achievement so they can look at the stats
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="border-b border-slate-900 bg-[#090f1a]/85 backdrop-blur-md sticky top-0 z-[2000] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-orange-600 to-amber-500 p-2 rounded-xl shadow-lg shadow-orange-950/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white m-0 leading-none">
                REPLAY
              </h1>
              <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-1">
                Strava Activity Replay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSampleGPX}
              className="text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load Sample Route
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors hidden sm:inline"
            >
              Docs
            </a>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Map Viewer Column (2/3 width on Desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-[400px] lg:min-h-[500px]">
            <MapView
              points={gpxData?.points || []}
              currentPointIndex={currentPointIndex}
              achievements={gpxData?.achievements || []}
              isPlaying={isPlaying}
            />
          </div>

          {/* Controls & Achievements Column (1/3 width on Desktop) */}
          <div className="flex flex-col gap-6">
            <PlaybackControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              currentTime={currentTime}
              totalDuration={gpxData?.totalDuration || 0}
              speedMultiplier={speedMultiplier}
              onSpeedChange={setSpeedMultiplier}
              onScrub={handleScrub}
              onFileUpload={handleFileUpload}
              loading={loading}
              fileName={fileName}
              onReset={() => resetReplay()}
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />

            {/* Achievements Summary Panel */}
            {gpxData && (
              <AchievementsPanel
                achievements={gpxData.achievements}
                currentPointIndex={currentPointIndex}
                onAchievementClick={handleAchievementClick}
              />
            )}
          </div>
        </div>

        {/* Telemetry Stats Dock (Full Width below map/sidebar) */}
        <div className="w-full">
          <StatsPanel
            currentPoint={gpxData?.points[currentPointIndex]}
            totalDistance={gpxData?.totalDistance || 0}
            elevationGain={gpxData?.elevationGain || 0}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 bg-[#070b14] mt-8 text-center text-xs text-slate-500 font-medium">
        <p>&copy; {new Date().getFullYear()} Replay App &bull; Built with React, Tailwind CSS, and Leaflet.js</p>
      </footer>
    </div>
  );
}
