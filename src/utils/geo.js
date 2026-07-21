// Distance haversine entre deux coordonnées GPS, en mètres.
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // rayon terrestre en mètres
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Vérifie si la position actuelle est dans le rayon d'un point.
export function isAtPoint(lat, lng, point) {
  const d = distanceMeters(lat, lng, point.lat, point.lng);
  return d <= (point.radius ?? 50);
}

// Retourne le point le plus proche et la distance associée.
export function nearestPoint(lat, lng, points) {
  let best = null;
  let bestDist = Infinity;
  for (const p of points) {
    const d = distanceMeters(lat, lng, p.lat, p.lng);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return { point: best, distance: bestDist };
}
