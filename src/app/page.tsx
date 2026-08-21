'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import AlertPanel from '@/components/AlertPanel';
import fallbackData from '@/data/demo_fallback.json';
import { Loader2, ShieldAlert, Navigation2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import clsx from 'clsx';
import { useLanguage } from '@/components/LanguageContext';
import ReportHazardModal from '@/components/ReportHazardModal';
import SubscribeAlertModal from '@/components/SubscribeAlertModal';
import RoutePlannerModal from '@/components/RoutePlannerModal';

// Dynamically import Map component (disables SSR)
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500"><Loader2 className="animate-spin w-8 h-8" /></div>
});

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const [mode, setMode] = useState<'demo' | 'explore'>('demo');
  const [locations, setLocations] = useState<any[]>(fallbackData);
  const [selectedCenter, setSelectedCenter] = useState<[number, number] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  const [forecastOffset, setForecastOffset] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [communityReports, setCommunityReports] = useState<any[]>([]);

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
    <main id="main-app" className="flex h-screen w-full flex-col bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between z-10 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              {t('appTitle')}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-semibold text-white hover:bg-slate-700"
          >
            {language === 'en' ? 'हिंदी' : 'EN'}
          </button>

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
        <div className="absolute top-4 left-4 right-4 md:right-auto z-[400] md:w-full md:max-w-sm print:hidden">
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
          
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-md bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-lg border border-slate-700 shadow-xl flex flex-col gap-2 text-xs print:hidden">
            <div className="flex justify-between text-slate-300 font-semibold">
              <span>Past (3 Days)</span>
              <span>Today</span>
              <span>Forecast (+1 Day)</span>
            </div>
            <input 
              type="range" 
              min="-1" max="1" 
              value={sliderValue} 
              onChange={(e) => {
                setSliderValue(Number(e.target.value));
                setForecastOffset(Number(e.target.value));
              }}
              className="w-full accent-blue-500"
            />
          </div>
          
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 hidden md:flex flex-col gap-2 shadow-lg print:hidden">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> 
              Last updated: {mounted ? lastUpdated.toLocaleTimeString() : '...'}
            </div>
            <button 
              onClick={() => {
                // html2canvas crashes on Tailwind v4's modern color functions (oklch/lab).
                // The most robust client-side solution is invoking the native print dialog.
                window.print();
              }}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded w-full text-center"
            >
              {t('exportPdf')}
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 h-[40vh] md:h-full flex-shrink-0 relative z-[400] bg-slate-900 flex flex-col print:hidden">
          <div className="flex-1 overflow-auto">
            <AlertPanel 
              locations={locations} 
              onSelect={(loc) => setSelectedCenter([loc.lat, loc.lon])} 
            />
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2">
            <button 
              onClick={() => setShowRouteModal(true)}
              className="w-full py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded text-sm hover:bg-slate-700"
            >
              📍 {t('routePlanning')}
            </button>
            <button 
              onClick={() => setShowAlertModal(true)}
              className="w-full py-2 bg-emerald-900/40 border border-emerald-800 text-emerald-400 rounded text-sm hover:bg-emerald-900/60"
            >
              💬 {t('subscribeAlerts')}
            </button>
            <button 
              onClick={() => setShowReportModal(true)}
              className="w-full py-2 bg-amber-900/40 border border-amber-800 text-amber-400 rounded text-sm hover:bg-amber-900/60"
            >
              ⚠️ {t('reportHazard')}
            </button>
          </div>
        </div>
      </div>

      {/* --- PRINT ONLY REPORT LAYOUT --- */}
      <div className="hidden print:block w-full p-8 bg-white text-black font-sans min-h-screen">
        <div className="flex items-center justify-between border-b-2 border-slate-300 pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">GiriRaksha Risk Assessment Report</h1>
            <p className="text-sm text-slate-500 mt-1">Generated: {mounted ? new Date().toLocaleString() : '...'}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-slate-700">Official Insights</h2>
            <p className="text-sm text-slate-500">Status: Automated Analysis</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold mb-4">Summary of Monitored Locations</h3>
          {locations.length === 0 ? (
            <p className="italic text-slate-500">No locations currently monitored.</p>
          ) : (
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="p-3 border border-slate-200">Location</th>
                  <th className="p-3 border border-slate-200">Risk Score</th>
                  <th className="p-3 border border-slate-200">Slope</th>
                  <th className="p-3 border border-slate-200">Rainfall (4d)</th>
                  <th className="p-3 border border-slate-200">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, i) => (
                  <tr key={i} className={loc.riskScore > 70 ? "bg-red-50" : loc.riskScore > 40 ? "bg-yellow-50" : ""}>
                    <td className="p-3 border border-slate-200 font-medium">
                      {loc.name || `${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`}
                    </td>
                    <td className="p-3 border border-slate-200">
                      <span className={`font-bold ${loc.riskScore > 70 ? 'text-red-700' : loc.riskScore > 40 ? 'text-yellow-700' : 'text-green-700'}`}>
                        {loc.riskScore}/100
                      </span>
                    </td>
                    <td className="p-3 border border-slate-200">{loc.slope}°</td>
                    <td className="p-3 border border-slate-200">{loc.rainfall}mm</td>
                    <td className="p-3 border border-slate-200 font-semibold">{loc.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h3 className="text-lg font-bold mb-2">Automated Geological Insights</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
            <li><strong>High-Risk Zones:</strong> {locations.filter(l => l.riskScore > 70).length} critical zones detected requiring immediate intervention or monitoring.</li>
            <li><strong>Precipitation Impact:</strong> Areas with high rainfall accumulation over the past 4 days show exponentially higher failure probabilities when combined with slopes &gt; 30°.</li>
            <li><strong>Data Source:</strong> Risk values are derived from Open-Meteo precipitation models, SRTM elevation data, and GiriRaksha ML heuristics.</li>
          </ul>
        </div>
      </div>
      {/* --- END PRINT ONLY REPORT --- */}

      {/* Modals */}
      <ReportHazardModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        lat={selectedCenter?.[0] ?? null}
        lon={selectedCenter?.[1] ?? null}
        onReportSubmitted={(report) => {
          setCommunityReports(prev => [report, ...prev]);
        }}
      />

      <SubscribeAlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        lat={selectedCenter?.[0] ?? null}
        lon={selectedCenter?.[1] ?? null}
        locationName={locations[0]?.name}
      />

      <RoutePlannerModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        onRouteCalculated={(data) => {
          // Add risk points from route as locations on the map
          if (data.riskPoints) {
            const routeLocations = data.riskPoints
              .filter((p: any) => p.riskScore !== undefined)
              .map((p: any, i: number) => ({
                ...p,
                name: `Route Point (${p.distanceKm}km)`,
                slope: 0,
                rainfall: 0,
                soilMoisture: 0,
              }));
            setLocations(prev => [...routeLocations, ...prev]);
          }
        }}
      />
    </main>
  );
}
