/**
 * Haversine formula to compute distance between two lat/lng coordinates in meters.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats time duration in seconds to hh:mm:ss.
 */
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? String(h).padStart(2, '0') : null,
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ]
    .filter(Boolean)
    .join(':');
}

/**
 * Formats speed (m/s) to pace format (min/km or min/mile).
 */
export function formatPace(speedMps, imperial = false) {
  if (speedMps <= 0.1) return '--:--';
  
  // Speed is in m/s. We want min/km or min/mile.
  // 1 m/s = 3.6 km/h. Pace is minutes per km.
  // Pace (min/km) = 16.6667 / speedMps
  // Pace (min/mile) = 26.8224 / speedMps
  const factor = imperial ? 26.8224 : 16.6667;
  const paceDec = factor / speedMps;
  const mins = Math.floor(paceDec);
  const secs = Math.floor((paceDec - mins) * 60);
  
  // Cap extreme values
  if (mins > 60) return '--:--';
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parse GPX file content into structured JSON points and calculate achievements.
 */
export function parseGPX(gpxText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxText, 'application/xml');
  
  const trkpts = xmlDoc.getElementsByTagName('trkpt');
  if (trkpts.length === 0) {
    throw new Error('No track points found in the GPX file.');
  }

  const points = [];
  let cumulativeDistance = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;

  // 1. Basic Parse
  for (let i = 0; i < trkpts.length; i++) {
    const trkpt = trkpts[i];
    const lat = parseFloat(trkpt.getAttribute('lat'));
    const lng = parseFloat(trkpt.getAttribute('lon'));
    
    const eleTag = trkpt.getElementsByTagName('ele')[0];
    const elevation = eleTag ? parseFloat(eleTag.textContent) : 0;
    
    const timeTag = trkpt.getElementsByTagName('time')[0];
    const timestamp = timeTag ? new Date(timeTag.textContent) : null;

    if (elevation > maxElevation) maxElevation = elevation;
    if (elevation < minElevation) minElevation = elevation;

    points.push({
      index: i,
      lat,
      lng,
      elevation,
      timestamp,
      distance: 0, // Filled in next pass
      timeDelta: 0,
      elapsedTime: 0,
      speed: 0,
    });
  }

  // Ensure timestamps exist, fallback to 1s increments if missing
  let hasTimestamps = true;
  for (let i = 0; i < points.length; i++) {
    if (!points[i].timestamp) {
      hasTimestamps = false;
      break;
    }
  }

  if (!hasTimestamps) {
    const baseTime = new Date();
    for (let i = 0; i < points.length; i++) {
      points[i].timestamp = new Date(baseTime.getTime() + i * 1000);
    }
  }

  // Sort by timestamp just in case
  points.sort((a, b) => a.timestamp - b.timestamp);

  // Re-index after sorting
  points.forEach((p, idx) => {
    p.index = idx;
  });

  // 2. Calculate Distances, Speed, Elapsed Time
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      points[i].distance = 0;
      points[i].elapsedTime = 0;
      points[i].timeDelta = 0;
      points[i].speed = 0;
    } else {
      const prev = points[i - 1];
      const curr = points[i];
      const distDelta = haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      cumulativeDistance += distDelta;
      curr.distance = cumulativeDistance;

      const timeDelta = (curr.timestamp - prev.timestamp) / 1000; // in seconds
      curr.timeDelta = timeDelta;
      curr.elapsedTime = prev.elapsedTime + timeDelta;
      
      // Raw speed
      curr.speed = timeDelta > 0 ? distDelta / timeDelta : 0;
    }
  }

  // 3. Smooth Speeds (5-point moving average to filter GPS noise)
  const smoothedPoints = points.map((p, idx) => {
    let speedSum = 0;
    let count = 0;
    const windowSize = 2; // 2 points before, 2 points after
    
    for (let w = -windowSize; w <= windowSize; w++) {
      const targetIdx = idx + w;
      if (targetIdx >= 0 && targetIdx < points.length) {
        speedSum += points[targetIdx].speed;
        count++;
      }
    }
    
    // Cap speed at 25 m/s (~90 km/h or ~56 mph) to remove unrealistic GPS spikes
    const rawSpeed = p.speed;
    const smoothedSpeed = count > 0 ? speedSum / count : rawSpeed;
    const speed = Math.min(smoothedSpeed, 25);

    return {
      ...p,
      speed,
    };
  });

  // 4. Compute Achievements
  const achievements = computeAchievements(smoothedPoints);

  return {
    points: smoothedPoints,
    achievements,
    totalDistance: cumulativeDistance, // in meters
    totalDuration: smoothedPoints[smoothedPoints.length - 1].elapsedTime, // in seconds
    maxElevation,
    minElevation,
    elevationGain: calculateElevationGain(smoothedPoints),
  };
}

/**
 * Calculates cumulative positive elevation gain.
 */
function calculateElevationGain(points) {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevation - points[i - 1].elevation;
    if (diff > 0) {
      gain += diff;
    }
  }
  return gain;
}

/**
 * Finds achievements: Fastest 1km, Fastest 1mi, and Highest elevation gain segment (500m segment)
 */
function computeAchievements(points) {
  const result = [];
  
  if (points.length < 5) return result;

  // 1. FASTEST 1KM
  // We look for a sliding window where distance difference >= 1000m.
  let best1kDuration = Infinity;
  let best1kStartIndex = -1;
  let best1kEndIndex = -1;

  // 2. FASTEST 1MI (1609.34m)
  let best1miDuration = Infinity;
  let best1miStartIndex = -1;
  let best1miEndIndex = -1;

  // 3. HIGHEST ELEVATION GAIN (500m segment)
  let maxEleGain = -Infinity;
  let maxEleGainStartIndex = -1;
  let maxEleGainEndIndex = -1;

  // 4. MAX SPEED
  let maxSpeedVal = 0;
  let maxSpeedIdx = -1;

  let r1k = 0;
  let r1mi = 0;
  let rEle = 0;

  for (let l = 0; l < points.length; l++) {
    // Max Speed Check
    if (points[l].speed > maxSpeedVal) {
      maxSpeedVal = points[l].speed;
      maxSpeedIdx = l;
    }

    // --- 1KM sliding window ---
    while (r1k < points.length && points[r1k].distance - points[l].distance < 1000) {
      r1k++;
    }
    if (r1k < points.length) {
      const duration = points[r1k].elapsedTime - points[l].elapsedTime;
      if (duration < best1kDuration && duration > 0) {
        best1kDuration = duration;
        best1kStartIndex = l;
        best1kEndIndex = r1k;
      }
    }

    // --- 1MI sliding window ---
    while (r1mi < points.length && points[r1mi].distance - points[l].distance < 1609.34) {
      r1mi++;
    }
    if (r1mi < points.length) {
      const duration = points[r1mi].elapsedTime - points[l].elapsedTime;
      if (duration < best1miDuration && duration > 0) {
        best1miDuration = duration;
        best1miStartIndex = l;
        best1miEndIndex = r1mi;
      }
    }

    // --- Elevation Gain sliding window (500m segment) ---
    while (rEle < points.length && points[rEle].distance - points[l].distance < 500) {
      rEle++;
    }
    if (rEle < points.length) {
      const gain = points[rEle].elevation - points[l].elevation;
      if (gain > maxEleGain) {
        maxEleGain = gain;
        maxEleGainStartIndex = l;
        maxEleGainEndIndex = rEle;
      }
    }
  }

  // Add Fastest 1km
  if (best1kStartIndex !== -1) {
    const startPt = points[best1kStartIndex];
    const endPt = points[best1kEndIndex];
    // Achievement is highlighted at the endpoint of the effort
    result.push({
      type: 'PR_1KM',
      name: 'Fastest 1K',
      value: formatPace(1000 / best1kDuration) + ' /km',
      desc: `Pace: ${formatPace(1000 / best1kDuration)}/km (${Math.round(best1kDuration)}s)`,
      pointIndex: best1kEndIndex,
      startIndex: best1kStartIndex,
      lat: endPt.lat,
      lng: endPt.lng,
      badgeColor: 'bg-amber-500',
      icon: 'zap',
    });
  }

  // Add Fastest 1mi
  if (best1miStartIndex !== -1) {
    const startPt = points[best1miStartIndex];
    const endPt = points[best1miEndIndex];
    result.push({
      type: 'PR_1MI',
      name: 'Fastest 1 Mile',
      value: formatPace(1609.34 / best1miDuration, true) + ' /mi',
      desc: `Pace: ${formatPace(1609.34 / best1miDuration, true)}/mi (${Math.round(best1miDuration)}s)`,
      pointIndex: best1miEndIndex,
      startIndex: best1miStartIndex,
      lat: endPt.lat,
      lng: endPt.lng,
      badgeColor: 'bg-orange-500',
      icon: 'award',
    });
  }

  // Add Highest Elevation Gain (500m segment)
  if (maxEleGainStartIndex !== -1 && maxEleGain > 0) {
    const endPt = points[maxEleGainEndIndex];
    result.push({
      type: 'CLIMB',
      name: 'KOM Climb (500m)',
      value: `+${Math.round(maxEleGain)}m`,
      desc: `Gain: +${Math.round(maxEleGain)}m over 500m segment`,
      pointIndex: maxEleGainEndIndex,
      startIndex: maxEleGainStartIndex,
      lat: endPt.lat,
      lng: endPt.lng,
      badgeColor: 'bg-red-500',
      icon: 'trending-up',
    });
  }

  // Add Max Speed
  if (maxSpeedIdx !== -1 && maxSpeedVal > 1) {
    const pt = points[maxSpeedIdx];
    const speedKmh = maxSpeedVal * 3.6;
    result.push({
      type: 'MAX_SPEED',
      name: 'Max Speed',
      value: `${speedKmh.toFixed(1)} km/h`,
      desc: `Top Speed: ${speedKmh.toFixed(1)} km/h (${(speedKmh * 0.621371).toFixed(1)} mph)`,
      pointIndex: maxSpeedIdx,
      lat: pt.lat,
      lng: pt.lng,
      badgeColor: 'bg-blue-500',
      icon: 'gauge',
    });
  }

  // Sort by pointIndex so they appear in sequence
  return result.sort((a, b) => a.pointIndex - b.pointIndex);
}
