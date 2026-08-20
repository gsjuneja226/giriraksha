# GiriRaksha - Landslide-Risk Early-Warning System

GiriRaksha is a full-stack, production-ready web application built for predicting landslide risks on hill roads across India. It uses real-time terrain, rainfall, and soil moisture data to compute a dynamic risk score for any given point on a map.

## 🚀 Key Features
- **Two Modes**: 
  - *Quick Demo*: Instantly loads 6 pre-configured, known landslide-prone corridors (e.g., Shimla-Kufri, Kullu-Manali) for rapid presentation. Works completely offline using a fallback dataset.
  - *Explore Any Location*: Click anywhere on the map or search a specific place in India to dynamically compute risk.
- **Keyless Architecture**: Relies purely on free, open-source APIs with zero API keys required.
- **Dynamic Terrain Analysis**: Computes terrain slope dynamically by fetching elevation data from 5 surrounding points and calculating the gradient.
- **Road Snapping**: Automatically snaps clicked points to the nearest actual road geometry using OpenStreetMap.
- **Real-time Caching**: Implements an LRU cache (10 min TTL) for all API calls to respect rate limits and improve performance.

## ⚙️ How the Risk Algorithm Works
The app calculates a risk score (0 to 100) using the following formula:
`Risk Score = (Slope * 0.4) + (Rainfall * 0.35) + (Soil Moisture * 0.25)`

- **Slope**: Calculated by fetching elevation data for the center point and 4 cardinal points (~100m away). It computes the gradient (`dz/dx` and `dz/dy`), giving the slope in degrees. Normalized up to 60 degrees.
- **Rainfall**: Uses past 3 days of cumulative rainfall plus a 1-day forecast. Normalized up to 200mm.
- **Soil Moisture**: Raw 0 to 1 ratio from the top soil layer (0-1cm).

## 🛠 Tech Stack
- **Frontend**: Next.js (React), Tailwind CSS, TypeScript
- **Map**: Leaflet.js with React-Leaflet (OpenStreetMap Tiles)
- **Backend/API Proxy**: Next.js API Routes (Proxy + Caching)
- **Data Sources**: 
  - *Open-Meteo Elevation API* (Slope calculation)
  - *Open-Meteo Forecast API* (Rainfall & Soil Moisture)
  - *OpenStreetMap Nominatim* (Geocoding/Search)
  - *OpenStreetMap Overpass* (Road geometry)

## 📦 Running the Application Locally
1. Navigate to the project directory:
   ```bash
   cd giri-raksha
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:3000`.

## ⚠️ Known Limitations
- **Slope Calculation**: Slope is estimated using ~100m-spaced elevation samples from Open-Meteo's API (based on 90m DEM data). It is accurate enough for a demo or broad regional estimates, but not survey-grade.
- **Risk Formula**: The risk algorithm is illustrative and designed to demonstrate the data pipeline. It has not been validated against historical geological landslide data.
- **API Rate Limits**: Nominatim and Overpass are public APIs. The app uses server-side caching and debounce, but excessive rapid usage from a single IP might result in temporary throttling.

## 🛡 Fallback Mechanism
If the live APIs fail, timeout (3 seconds), or the device loses internet connection, the application automatically falls back to a bundled `demo_fallback.json` dataset. It attempts to snap to the nearest pre-calculated corridor, ensuring the application remains robust during live presentations.
