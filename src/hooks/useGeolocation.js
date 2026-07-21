import { useEffect, useRef, useState } from "react";

// Suit la position GPS de l'utilisateur via l'API du navigateur.
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [watching, setWatching] = useState(false);
  const watchId = useRef(null);

  const start = () => {
    if (watchId.current !== null) return;
    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas supportée par ce navigateur.");
      return;
    }
    setWatching(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message || "Erreur de géolocalisation.");
        setWatching(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
    );
  };

  const stop = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setWatching(false);
    }
  };

  useEffect(() => () => stop(), []);

  return { position, error, watching, start, stop };
}
