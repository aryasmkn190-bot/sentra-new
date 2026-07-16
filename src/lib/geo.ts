/** Point-in-polygon (ray casting). polygon: [[lat,lng], ...] */
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect =
      xi > lng !== xj > lng && lat < ((yj - yi) * (lng - xi)) / (xj - xi) + yi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Jarak haversine dalam km */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** ETA sederhana: 15 menit persiapan + 4 menit/km. Ganti dgn Google Distance Matrix di produksi. */
export function estimateEtaMinutes(km: number): number {
  return Math.min(45, Math.round(15 + km * 4));
}
