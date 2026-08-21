'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import clsx from 'clsx';
import { AlertTriangle, MapPin, Loader2, CloudRain, Droplets } from 'lucide-react';

// Fix leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = (score: number) => {
  let color = 'bg-green-500';
  if (score > 40) color = 'bg-yellow-500';
  if (score > 70) color = 'bg-red-500';
  
  const size = score > 70 ? 'w-8 h-8' : score > 40 ? 'w-6 h-6' : 'w-4 h-4';
  
  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="rounded-full shadow-lg border-2 border-white flex items-center justify-center ${color} ${size} transition-all duration-300 animate-pulse"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

import { get, set } from 'idb-keyval';

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    
    // Cache the successful response in IndexedDB for offline use
    await set(url, data);
    return data;
  } catch (error) {
    console.warn("Fetch failed, attempting to read from IndexedDB fallback...", error);
    const cachedData = await get(url);
    if (cachedData) {
      return { ...cachedData, isFallback: true, offlineSource: 'IndexedDB' };
    }
    throw error;
  }
};

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 12);
    }
  }, [center, map]);
  return null;
}

export default function Map({
  locations,
  selectedCenter,
  onLocationSelect
}: {
  locations: any[];
  selectedCenter: [number, number] | null;
  onLocationSelect: (lat: number, lon: number) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[28.6139, 77.2090]} // Default to India/Delhi
        zoom={5}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        className="rounded-xl overflow-hidden shadow-2xl border border-slate-700/50"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapEvents onLocationSelect={onLocationSelect} />
        {selectedCenter && <MapUpdater center={selectedCenter} />}
        
        {locations.map((loc, idx) => (
          <Marker 
            key={`${loc.id || 'loc'}-${idx}`} 
            position={[loc.lat, loc.lon]}
            icon={createCustomIcon(loc.riskScore)}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[220px]">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {loc.name || 'Custom Location'}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx("px-2 py-1 rounded text-xs font-bold text-white", loc.riskScore > 70 ? 'bg-red-500' : loc.riskScore > 40 ? 'bg-yellow-500 text-yellow-900' : 'bg-green-500')}>
                    Risk: {loc.riskScore}/100
                  </span>
                  {loc.isFallback && <span className="text-[10px] bg-slate-200 text-slate-800 px-1 rounded">Offline Data</span>}
                </div>
                
                <div className="space-y-2 text-sm text-slate-700 mb-3">
                  <div className="flex justify-between border-b pb-1">
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500"/> Slope</span>
                    <span className="font-semibold">{loc.slope}°</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="flex items-center gap-1"><CloudRain className="w-3 h-3 text-blue-500"/> Rainfall (4d)</span>
                    <span className="font-semibold">{loc.rainfall}mm</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-cyan-500"/> Soil Moisture</span>
                    <span className="font-semibold">{loc.soilMoisture * 100}%</span>
                  </div>
                </div>
                
                <div className={clsx("p-2 rounded text-xs border", loc.riskScore > 70 ? 'bg-red-50 border-red-200 text-red-800' : loc.riskScore > 40 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800')}>
                  <strong>Action:</strong> {loc.action}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
