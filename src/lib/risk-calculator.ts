export function getRiskAction(score: number): string {
  if (score <= 40) return "Monitor routinely";
  if (score <= 70) return "Increase monitoring, alert local authorities";
  return "Recommend road closure or heavy vehicle restriction";
}

export function calculateRisk(slopeDegrees: number, rainfallMm: number, soilMoistureRatio: number) {
  const slopeNormalized = Math.min(slopeDegrees / 60, 1.0);
  const rainfallNormalized = Math.min(rainfallMm / 200, 1.0);
  const soilMoistureNormalized = Math.min(Math.max(soilMoistureRatio, 0), 1.0);

  const riskScore = (slopeNormalized * 0.4) + (rainfallNormalized * 0.35) + (soilMoistureNormalized * 0.25);
  
  // Return out of 100
  return Math.round(riskScore * 100 * 10) / 10;
}
