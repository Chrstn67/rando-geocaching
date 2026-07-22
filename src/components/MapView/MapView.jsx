import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

// Fonction pour créer une icône SVG d'épingle
const createPinSVG = (
  color,
  strokeColor,
  isReached = false,
  isNearest = false,
) => {
  // Effet de lueur pour le point le plus proche
  let glowFilter = "";
  if (isNearest && !isReached) {
    glowFilter = `
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `;
  }

  // Cercle d'onde pour l'épingle atteinte
  let reachedRing = "";
  if (isReached) {
    reachedRing = `
      <circle cx="16" cy="16" r="8" fill="none" stroke="${color}" stroke-width="2" opacity="0.5">
        <animate attributeName="r" from="8" to="16" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    `;
  }

  // Classes d'animation
  const floatClass = isReached ? "" : "pin-float";
  const pulseClass = isNearest && !isReached ? "pin-pulse" : "";

  // Icône de coche pour les points atteints
  const checkIcon = isReached
    ? `<path d="M11 15L15 19L21 11" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : "";

  return `
    <div class="pin-wrapper ${floatClass} ${pulseClass}">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
        ${glowFilter}
        <g filter="${isNearest && !isReached ? "url(#glow)" : ""}">
          <ellipse cx="16" cy="40" rx="8" ry="2" fill="rgba(0,0,0,0.15)"/>
          <path d="M16 2 C8 2 2 8.5 2 16 C2 26 16 40 16 40 C16 40 30 26 30 16 C30 8.5 24 2 16 2Z"
                fill="${color}"
                stroke="${strokeColor}"
                stroke-width="1.5"/>
          <circle cx="16" cy="15" r="5" fill="white" opacity="0.9"/>
          <circle cx="16" cy="15" r="3" fill="${color}"/>
          ${reachedRing}
          ${checkIcon}
          <ellipse cx="12" cy="10" rx="4" ry="3" fill="rgba(255,255,255,0.4)" transform="rotate(-30, 12, 10)"/>
        </g>
      </svg>
    </div>
  `;
};

// Création des icônes avec divIcon (HTML injecté dans le DOM)
const createPointIcon = (reached, isNearest = false) => {
  let color, strokeColor;

  if (reached) {
    color = "#22c55e";
    strokeColor = "#16a34a";
  } else if (isNearest) {
    color = "#f59e0b";
    strokeColor = "#d97706";
  } else {
    color = "#3b82f6";
    strokeColor = "#2563eb";
  }

  return L.divIcon({
    html: createPinSVG(color, strokeColor, reached, isNearest),
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
    className: "custom-pin-icon",
  });
};

// Carte Leaflet affichant les points
export default function MapView({
  points,
  userPosition,
  reachedIds,
  nearestId,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});
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

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Ajout / mise à jour des marqueurs et cercles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!Array.isArray(points)) return;

    // Supprimer les anciens marqueurs si les points ont changé
    const currentIds = points.map((p) => p.id);
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentIds.includes(Number(id))) {
        if (markersRef.current[id]) {
          map.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
        if (circlesRef.current[id]) {
          map.removeLayer(circlesRef.current[id]);
          delete circlesRef.current[id];
        }
      }
    });

    points.forEach((p) => {
      if (!p.coords || !Array.isArray(p.coords) || p.coords.length < 2) {
        console.warn(`Point ${p.id} n'a pas de coordonnées valides`);
        return;
      }

      const reached = reachedIds.includes(p.id);
      const isNearest = nearestId === p.id && !reached;
      const lat = p.coords[0];
      const lng = p.coords[1];

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        console.warn(`Point ${p.id} a des coordonnées invalides`);
        return;
      }

      // Créer ou mettre à jour le marqueur
      if (!markersRef.current[p.id]) {
        const icon = createPointIcon(reached, isNearest);
        const marker = L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(
            `<div class="custom-popup-content">
              <strong>${p.name}</strong><br/>
              ${p.description || ""}<br/>
              <small>Rayon : ${p.radius || 50} m</small>
              ${reached ? '<br/><span style="color:#16a34a;font-weight:bold;">✓ Atteint !</span>' : ""}
            </div>`,
            { className: "custom-popup" },
          );
        markersRef.current[p.id] = marker;
      } else {
        const marker = markersRef.current[p.id];
        marker.setIcon(createPointIcon(reached, isNearest));
        marker.setLatLng([lat, lng]);
        marker.setPopupContent(
          `<div class="custom-popup-content">
            <strong>${p.name}</strong><br/>
            ${p.description || ""}<br/>
            <small>Rayon : ${p.radius || 50} m</small>
            ${reached ? '<br/><span style="color:#16a34a;font-weight:bold;">✓ Atteint !</span>' : ""}
          </div>`,
        );
      }

      // Créer ou mettre à jour le cercle
      if (circlesRef.current[p.id]) {
        circlesRef.current[p.id].remove();
      }

      const circle = L.circle([lat, lng], {
        radius: p.radius || 50,
        color: reached ? "#22c55e" : isNearest ? "#f59e0b" : "#3b82f6",
        fillColor: reached ? "#22c55e" : isNearest ? "#fbbf24" : "#60a5fa",
        fillOpacity: 0.1,
        weight: 2,
        dashArray: reached || isNearest ? undefined : "6 4",
        className: isNearest && !reached ? "nearest-circle" : "",
      }).addTo(map);
      circlesRef.current[p.id] = circle;
    });
  }, [points, reachedIds, nearestId]);

  // Recentre la carte sur un point
  useEffect(() => {
    const handler = (e) => {
      const map = mapRef.current;
      if (!map) return;
      const detail = e.detail;
      if (
        detail &&
        typeof detail.lat === "number" &&
        typeof detail.lng === "number"
      ) {
        map.flyTo([detail.lat, detail.lng], 16, { duration: 0.8 });
      }
    };
    window.addEventListener("map:focus", handler);
    return () => window.removeEventListener("map:focus", handler);
  }, []);

  // Mise à jour de la position utilisateur
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userPosition) return;

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
