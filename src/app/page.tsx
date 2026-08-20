'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import AlertPanel from '@/components/AlertPanel';
import fallbackData from '@/data/demo_fallback.json';
import { Loader2, ShieldAlert, Navigation2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';

// Dynamically import Map component (disables SSR)
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500"><Loader2 className="animate-spin w-8 h-8" /></div>
});

export default function Home() {
  const [mode, setMode] = useState<'demo' | 'explore'>('demo');
  const [locations, setLocations] = useState<any[]>(fallbackData);
  const [selectedCenter, setSelectedCenter] = useState<[number, number] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode === 'demo') {
      setLocations(fallbackData);
      setSelectedCenter([31.0864, 77.2673]); // Shimla
    } else {
      setLocations([]);
      setSelectedCenter([28.6139, 77.2090]); // Delhi
    }
  }, [mode]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (locations.length > 0 && !isAnalyzing) {
        refreshLocations();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [locations, isAnalyzing]);

  const refreshLocations = async () => {
    setLastUpdated(new Date());
    if (mode === 'demo') return; // Demo data is static unless overridden
    
    // Refresh all explore mode locations quietly
    const refreshed = await Promise.all(
      locations.map(async (loc) => {
        try {
          const res = await axios.get(`/api/risk?lat=${loc.lat}&lon=${loc.lon}`);
          return { ...res.data, name: loc.name || 'Custom Location' };
        } catch (e) {
          return loc; // keep old on fail
        }
      })
    );
    setLocations(refreshed);
  };

  const handleLocationSelect = async (lat: number, lon: number, name?: string) => {
    if (mode === 'demo') {
      // In demo mode, just switch to explore mode implicitly, or force them to switch.
      // Let's just switch them to explore mode if they click elsewhere.
      setMode('explore');
    }

    setIsAnalyzing(true);
    setSelectedCenter([lat, lon]);

    try {
      // 1. Try to snap to nearest road
      const roadRes = await axios.get(`/api/road?lat=${lat}&lon=${lon}`);
      const finalLat = roadRes.data.roadLat || lat;
      const finalLon = roadRes.data.roadLon || lon;

      // 2. Fetch risk for snapped point
      const riskRes = await axios.get(`/api/risk?lat=${finalLat}&lon=${finalLon}`);
      
      const newLoc = { 
        ...riskRes.data, 
        name: name || (roadRes.data.found ? 'Snapped to nearest road' : 'Custom Pin')
      };

      setLocations(prev => {
        // Prevent duplicates based on lat/lon rounding
        const exists = prev.findIndex(p => Math.abs(p.lat - finalLat) < 0.001 && Math.abs(p.lon - finalLon) < 0.001);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = newLoc;
          return next;
        }
        return [newLoc, ...prev];
      });

    } catch (e) {
      console.error(e);
      // Fallback behavior handles in API anyway, but if network completely fails:
      alert("Failed to analyze location. Please check your connection.");
    } finally {
      setIsAnalyzing(false);
      setLastUpdated(new Date());
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsAnalyzing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationSelect(position.coords.latitude, position.coords.longitude, "My Location");
      },
      (error) => {
        setIsAnalyzing(false);
        console.error(error);
        alert("Unable to retrieve your location. Please check your browser permissions.");
      },
      { timeout: 10000 }
    );
  };

  return (
    <main className="flex h-screen w-full flex-col bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              GiriRaksha
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">Real-time Landslide Risk Early-Warning System</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button 
              onClick={() => setMode('demo')}
              className={clsx("px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all", mode === 'demo' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200')}
            >
              <span className="hidden sm:inline">Quick Demo</span>
              <span className="sm:hidden">Demo</span>
            </button>
            <button 
              onClick={() => setMode('explore')}
              className={clsx("px-2 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all", mode === 'explore' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200')}
            >
              <span className="hidden sm:inline">Explore Map</span>
              <span className="sm:hidden">Explore</span>
            </button>
          </div>
          {mode === 'explore' && (
            <>
              <button 
                onClick={handleGeolocation}
                className="bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 shadow-sm"
              >
                <Navigation2 className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Locate Me</span>
              </button>
              {locations.length > 0 && (
                <button 
                  onClick={() => setLocations([])}
                  className="bg-red-900/40 border border-red-800 text-red-400 hover:text-red-300 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all shadow-sm"
                >
                  <span className="hidden sm:inline">Clear Pins</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        
        {/* Overlay Search Bar */}
        <div className="absolute top-4 left-4 right-4 md:right-auto z-[400] md:w-full md:max-w-sm">
          <SearchBar onLocationSelect={handleLocationSelect} />
        </div>

        {/* Analyzing Overlay */}
        {isAnalyzing && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[400] bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 flex items-center gap-2 animate-bounce whitespace-nowrap">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs sm:text-sm font-semibold">Analyzing terrain & weather...</span>
          </div>
        )}

        {/* Map Area */}
        <div className="flex-1 relative min-h-[50vh] md:min-h-0">
          <Map 
            locations={locations} 
            selectedCenter={selectedCenter} 
            onLocationSelect={handleLocationSelect} 
          />
          
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hidden md:flex items-center gap-2 shadow-lg">
            <RefreshCw className="w-3 h-3" /> 
            Last updated: {mounted ? lastUpdated.toLocaleTimeString() : '...'}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 h-[40vh] md:h-full flex-shrink-0 relative z-[400]">
          <AlertPanel 
            locations={locations} 
            onSelect={(loc) => setSelectedCenter([loc.lat, loc.lon])} 
          />
        </div>
      </div>
    </main>
  );
}
