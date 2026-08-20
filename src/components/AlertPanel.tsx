import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';

export default function AlertPanel({ locations, onSelect }: { locations: any[], onSelect: (loc: any) => void }) {
  const sorted = [...locations].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <div className="flex flex-col h-full bg-slate-900 md:border-l border-t md:border-t-0 border-slate-800 text-slate-200">
      <div className="p-3 md:p-4 border-b border-slate-800 flex-shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> Active Alerts
        </h2>
        <p className="text-sm text-slate-400 mt-1">Ranking by risk score</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">No locations monitored yet.</div>
        ) : (
          sorted.map((loc, i) => (
            <div 
              key={`${loc.id || 'custom'}-${i}`}
              onClick={() => onSelect(loc)}
              className="p-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm line-clamp-1 flex-1 pr-2">{loc.name || `Lat: ${loc.lat.toFixed(2)}, Lon: ${loc.lon.toFixed(2)}`}</h3>
                <span className={clsx(
                  "px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap",
                  loc.riskScore > 70 ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
                  loc.riskScore > 40 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 
                  'bg-green-500/20 text-green-400 border border-green-500/50'
                )}>
                  {loc.riskScore}/100
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{loc.action}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
