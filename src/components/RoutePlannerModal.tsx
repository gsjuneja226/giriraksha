'use client';

import { useState } from 'react';
import { X, MapPin, Loader2, Navigation, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

interface RouteRiskPoint {
  lat: number;
  lon: number;
  distanceKm: number;
  riskScore?: number;
  action?: string;
}

export default function RoutePlannerModal({
  isOpen,
  onClose,
  onRouteCalculated
}: {
  isOpen: boolean;
  onClose: () => void;
  onRouteCalculated?: (routeData: any) => void;
}) {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [startCoords, setStartCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [endCoords, setEndCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [riskPoints, setRiskPoints] = useState<RouteRiskPoint[]>([]);
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingEnd, setSearchingEnd] = useState(false);
  const [startResults, setStartResults] = useState<any[]>([]);
  const [endResults, setEndResults] = useState<any[]>([]);

  if (!isOpen) return null;

  const searchLocation = async (query: string, isStart: boolean) => {
    if (query.trim().length < 3) return;
    isStart ? setSearchingStart(true) : setSearchingEnd(true);

    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
      isStart ? setStartResults(res.data) : setEndResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      isStart ? setSearchingStart(false) : setSearchingEnd(false);
    }
  };

  const selectLocation = (item: any, isStart: boolean) => {
    const coords = { lat: parseFloat(item.lat), lon: parseFloat(item.lon) };
    const name = item.display_name.split(',')[0];

    if (isStart) {
      setStartCoords(coords);
      setStartQuery(name);
      setStartResults([]);
    } else {
      setEndCoords(coords);
      setEndQuery(name);
      setEndResults([]);
    }
  };

  const calculateRoute = async () => {
    if (!startCoords || !endCoords) return;

    setLoading(true);
    setRiskPoints([]);

    try {
      // 1. Get route from OSRM
      const routeRes = await axios.get(
        `/api/route-plan?startLat=${startCoords.lat}&startLon=${startCoords.lon}&endLat=${endCoords.lat}&endLon=${endCoords.lon}`
      );

      setRouteResult(routeRes.data);

      // 2. Analyze risk at sample points along the route (limit to 10 for performance)
      const samples = routeRes.data.samplePoints.slice(0, 10);
      const riskResults: RouteRiskPoint[] = [];

      for (const point of samples) {
        try {
          const riskRes = await axios.get(`/api/risk?lat=${point.lat}&lon=${point.lon}`);
          riskResults.push({
            ...point,
            riskScore: riskRes.data.riskScore,
            action: riskRes.data.action
          });
        } catch {
          riskResults.push({ ...point, riskScore: undefined });
        }
      }

      setRiskPoints(riskResults);
      onRouteCalculated?.({
        route: routeRes.data.route,
        riskPoints: riskResults
      });

    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || 'Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maxRisk = riskPoints.length > 0 ? Math.max(...riskPoints.filter(p => p.riskScore !== undefined).map(p => p.riskScore!)) : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-blue-900/20 flex-shrink-0">
          <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <Navigation className="w-5 h-5" /> Safe Route Planner
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Start Location */}
          <div className="relative">
            <label className="text-sm font-medium text-slate-300 mb-1 block">🟢 Start</label>
            <input
              type="text"
              value={startQuery}
              onChange={(e) => {
                setStartQuery(e.target.value);
                searchLocation(e.target.value, true);
              }}
              placeholder="Search start location..."
              className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            {startResults.length > 0 && (
              <div className="absolute mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-xl max-h-40 overflow-y-auto z-50">
                {startResults.map((r, i) => (
                  <div key={i} onClick={() => selectLocation(r, true)}
                    className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs text-slate-300 border-b border-slate-700/50 last:border-0">
                    {r.display_name}
                  </div>
                ))}
              </div>
            )}
            {startCoords && <span className="text-xs text-green-400 mt-1 block">✓ {startCoords.lat.toFixed(3)}, {startCoords.lon.toFixed(3)}</span>}
          </div>

          {/* End Location */}
          <div className="relative">
            <label className="text-sm font-medium text-slate-300 mb-1 block">🔴 Destination</label>
            <input
              type="text"
              value={endQuery}
              onChange={(e) => {
                setEndQuery(e.target.value);
                searchLocation(e.target.value, false);
              }}
              placeholder="Search destination..."
              className="w-full bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            {endResults.length > 0 && (
              <div className="absolute mt-1 w-full bg-slate-800 border border-slate-700 rounded shadow-xl max-h-40 overflow-y-auto z-50">
                {endResults.map((r, i) => (
                  <div key={i} onClick={() => selectLocation(r, false)}
                    className="px-3 py-2 hover:bg-slate-700 cursor-pointer text-xs text-slate-300 border-b border-slate-700/50 last:border-0">
                    {r.display_name}
                  </div>
                ))}
              </div>
            )}
            {endCoords && <span className="text-xs text-red-400 mt-1 block">✓ {endCoords.lat.toFixed(3)}, {endCoords.lon.toFixed(3)}</span>}
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculateRoute}
            disabled={loading || !startCoords || !endCoords}
            className={clsx(
              'w-full py-2.5 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-all',
              startCoords && endCoords
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            )}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing Route Risk...</>
            ) : (
              'Calculate Safe Route'
            )}
          </button>

          {/* Route Summary */}
          {routeResult && (
            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Distance</span>
                <span className="text-white font-semibold">{routeResult.route.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Est. Duration</span>
                <span className="text-white font-semibold">{routeResult.route.durationMin} min</span>
              </div>
              {maxRisk > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Max Risk Score</span>
                  <span className={clsx(
                    'font-bold',
                    maxRisk > 70 ? 'text-red-400' : maxRisk > 40 ? 'text-yellow-400' : 'text-green-400'
                  )}>{maxRisk}/100</span>
                </div>
              )}
            </div>
          )}

          {/* Risk Points Along Route */}
          {riskPoints.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-300">Risk Along Route</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {riskPoints.map((point, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-800 rounded px-3 py-2 text-xs">
                    <span className="text-slate-500 w-12">{point.distanceKm}km</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all',
                          (point.riskScore ?? 0) > 70 ? 'bg-red-500' :
                          (point.riskScore ?? 0) > 40 ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ width: `${point.riskScore ?? 0}%` }}
                      />
                    </div>
                    <span className={clsx(
                      'font-bold w-10 text-right',
                      (point.riskScore ?? 0) > 70 ? 'text-red-400' :
                      (point.riskScore ?? 0) > 40 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {point.riskScore ?? '?'}
                    </span>
                  </div>
                ))}
              </div>

              {maxRisk > 70 && (
                <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800 rounded text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>HIGH RISK SEGMENTS DETECTED.</strong> Consider an alternate route or check with local authorities before traveling.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
