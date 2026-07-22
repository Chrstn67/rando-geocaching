import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Décale des coordonnées d'un offset aléatoire mais reproductible (basé sur l'id)
// pour centrer le cercle d'indice à côté du vrai point
const fakeOffset = (id) => {
  const seed = id * 9301 + 49297;
  const dx = ((seed % 233) / 233 - 0.5) * 0.004; // ± ~200m en longitude
  const dy = (((seed * 7) % 197) / 197 - 0.5) * 0.003; // ± ~150m en latitude
  return { dx, dy };
};

// SVG d'épingle (uniquement pour les points atteints)
const createPinSVG = (color, strokeColor) => `
  <div class="pin-wrapper">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <ellipse cx="16" cy="40" rx="8" ry="2" fill="rgba(0,0,0,0.15)"/>
      <path d="M16 2 C8 2 2 8.5 2 16 C2 26 16 40 16 40 C16 40 30 26 30 16 C30 8.5 24 2 16 2Z"
            fill="${color}"
            stroke="${strokeColor}"
            stroke-width="1.5"/>
      <circle cx="16" cy="15" r="5" fill="white" opacity="0.9"/>
      <circle cx="16" cy="15" r="3" fill="${color}"/>
      <path d="M11 15L15 19L21 11" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="12" cy="10" rx="4" ry="3" fill="rgba(255,255,255,0.4)" transform="rotate(-30, 12, 10)"/>
    </svg>
  </div>
`;

const createReachedIcon = () =>
  L.divIcon({
    html: createPinSVG("#22c55e", "#16a34a"),
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
    className: "custom-pin-icon",
  });

export default function MapView({
  points,
  userPosition,
  reachedIds,
  nearestId,
  proximityActive, // true quand le son de proximité joue
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({}); // épingles (atteints seulement)
  const circlesRef = useRef({}); // cercles d'indice (proximité seulement)
  const userMarkerRef = useRef(null);
  const userCircleRef = useRef(null);

  // Initialisation de la carte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([48.54243541967581, 7.498936308618651], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 100);

    return () => {
      clearTimeout(timer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Marqueurs et cercles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !Array.isArray(points)) return;

    // Nettoyer les points supprimés
    const currentIds = points.map((p) => p.id);
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.includes(Number(id))) {
        markersRef.current[id]?.remove();
        delete markersRef.current[id];
      }
    });
    Object.keys(circlesRef.current).forEach((id) => {
      if (!currentIds.includes(Number(id))) {
        circlesRef.current[id]?.remove();
        delete circlesRef.current[id];
      }
    });

    points.forEach((p) => {
      if (!p.coords || p.coords.length < 2) return;
      const [lat, lng] = p.coords;
      if (typeof lat !== "number" || typeof lng !== "number") return;

      const reached = reachedIds.includes(p.id);
      const isNearest = nearestId === p.id && !reached;

      // --- Épingle : seulement si atteint ---
      if (reached) {
        if (!markersRef.current[p.id]) {
          const marker = L.marker([lat, lng], { icon: createReachedIcon() })
            .addTo(map)
            .bindPopup(
              `<div class="custom-popup-content">
                <strong>${p.name}</strong>
                <br/><span style="color:#16a34a;font-weight:bold;">✓ Atteint !</span>
              </div>`,
              { className: "custom-popup" },
            );
          markersRef.current[p.id] = marker;
        }
      } else {
        if (markersRef.current[p.id]) {
          markersRef.current[p.id].remove();
          delete markersRef.current[p.id];
        }
      }

      // --- Cercle d'indice : seulement si point le plus proche ET son de proximité actif ---
      if (isNearest && proximityActive) {
        if (!circlesRef.current[p.id]) {
          const { dx, dy } = fakeOffset(p.id);
          const circle = L.circle([lat + dy, lng + dx], {
            radius: 120,
            color: "#f59e0b",
            fillColor: "#fbbf24",
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "8 6",
            className: "nearest-circle",
          }).addTo(map);
          circlesRef.current[p.id] = circle;
        }
      } else {
        if (circlesRef.current[p.id]) {
          circlesRef.current[p.id].remove();
          delete circlesRef.current[p.id];
        }
      }
    });
  }, [points, reachedIds, nearestId, proximityActive]);

  // Recentre la carte sur un point
  useEffect(() => {
    const handler = (e) => {
      const map = mapRef.current;
      if (!map) return;
      const { lat, lng } = e.detail || {};
      if (typeof lat === "number" && typeof lng === "number") {
        map.flyTo([lat, lng], 16, { duration: 0.8 });
      }
    };
    window.addEventListener("map:focus", handler);
    return () => window.removeEventListener("map:focus", handler);
  }, []);

  // Position utilisateur
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;

    const latlng = [userPosition.lat, userPosition.lng];

    if (!userMarkerRef.current) {
      const userIcon = L.divIcon({
        className: "user-location-icon",
        html: '<div class="user-location-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      userMarkerRef.current = L.marker(latlng, { icon: userIcon }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng(latlng);
    }

    if (userCircleRef.current) userCircleRef.current.remove();
    userCircleRef.current = L.circle(latlng, {
      radius: userPosition.accuracy || 50,
      color: "#6366f1",
      fillColor: "#818cf8",
      fillOpacity: 0.1,
      weight: 1,
    }).addTo(map);
  }, [userPosition]);

  return <div className="map-view" ref={containerRef} />;
}
