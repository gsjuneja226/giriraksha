from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random
import math

app = FastAPI(title="GiriRaksha ML Engine")

class PredictionRequest(BaseModel):
    lat: float
    lon: float
    rainfall_72h: float
    soil_moisture: float

@app.post("/predict")
def predict_risk(req: PredictionRequest):
    """
    Phase 2: ML Model Prediction (Mocked Random Forest)
    In production, this would load a .pkl model trained on the NASA Landslide Catalog.
    """
    # 1. Phase 3 Mock: Query PostGIS for Lithology (Rock Type)
    # SELECT rock_type, strength_multiplier FROM lithology WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326));
    rock_types = [
        {"name": "Granite (Solid)", "multiplier": 0.5},
        {"name": "Sandstone", "multiplier": 1.0},
        {"name": "Shale / Loose Clay", "multiplier": 1.5}
    ]
    # Deterministic mock based on lat/lon
    rock = rock_types[int(req.lat * 100) % 3]

    # 2. Phase 3 Mock: Query Local GeoTIFF for High-Res 30m DEM
    # with rasterio.open('dem_30m.tif') as src:
    #     slope = calculate_gradient(src.read(), req.lat, req.lon)
    # Mocking slope between 10 and 70 degrees
    slope = 10 + (math.sin(req.lat * req.lon) + 1) * 30

    # 3. Phase 4 Mock: Google Earth Engine (NDVI)
    # earthengine.get('NDVI', lat, lon)
    # NDVI scale -1 to 1. Healthy vegetation is > 0.6
    ndvi = 0.2 + (math.cos(req.lat * 10) + 1) * 0.4
    
    # ML Prediction Logic (Mocking Scikit-Learn RandomForestClassifier.predict_proba)
    # Base risk derived from slope and rain
    base_risk = (slope * 0.4) + (req.rainfall_72h * 0.35)
    
    # Adjust for geology (Lithology)
    adjusted_risk = base_risk * rock["multiplier"]
    
    # Adjust for deforestation/human activity (NDVI)
    # Low NDVI = higher risk of soil erosion
    if ndvi < 0.3:
        adjusted_risk *= 1.3
    elif ndvi > 0.6:
        adjusted_risk *= 0.7

    probability = min(100.0, max(0.0, adjusted_risk))

    return {
        "probability_of_failure": round(probability, 2),
        "geology": {
            "rock_type": rock["name"],
            "strength_multiplier": rock["multiplier"]
        },
        "terrain": {
            "slope_degrees": round(slope, 1),
            "resolution": "30m (ALOS World 3D)"
        },
        "vegetation": {
            "ndvi": round(ndvi, 2),
            "status": "Deforested" if ndvi < 0.3 else "Healthy"
        },
        "model": "RandomForestClassifier_v1.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
