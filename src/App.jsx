import { useEffect, useMemo, useState } from "react";
import { Compass } from "lucide-react";
import MapView from "./components/MapView/MapView";
import StatusBanner from "./components/StatusBanner/StatusBanner";
import PointsList from "./components/PointsList/PointsList";
import Controls from "./components/Controls/Controls";
import ReachedToast from "./components/ReachedToast/ReachedToast";
import { POINTS } from "./constants/points";
import { distanceMeters } from "./utils/geo";
import { useGeolocation } from "./hooks/useGeolocation";
import { useAlerts } from "./hooks/useAlerts";
import "./App.css";

// Import de tes fichiers audio - METS LES DANS src/assets/
import proximitySound from "./assets/proximity.mp3";
import victorySound from "./assets/victory.mp3";
import testSound from "./assets/test.mp3";

export default function App() {
  const { position, error, watching, start, stop } = useGeolocation();
  const {
    trigger,
    loadAudioFiles,
    startProximitySound,
    stopProximitySound,
    playVictorySound,
    isProximityActive,
    isVictoryPlaying,
  } = useAlerts();
  const [reachedIds, setReachedIds] = useState([]);
  const [toastName, setToastName] = useState(null);
  const [nearestId, setNearestId] = useState(null);

  // Charger les fichiers audio au montage
  useEffect(() => {
    loadAudioFiles({
      proximity: proximitySound,
      victory: victorySound,
      test: testSound,
    });
  }, [loadAudioFiles]);

  // Distances de chaque point depuis la position actuelle.
  const distances = useMemo(() => {
    const out = {};
    if (position && Array.isArray(POINTS)) {
      for (const p of POINTS) {
        if (p.coords && Array.isArray(p.coords) && p.coords.length >= 2) {
          out[p.id] = distanceMeters(
            position.lat,
            position.lng,
            p.coords[0],
            p.coords[1],
          );
        }
      }
    }
    return out;
  }, [position]);

  // Point le plus proche NON ATTEINT + distance.
  const nearest = useMemo(() => {
    if (!position) return { id: null, name: null, distance: null };
    let id = null;
    let name = null;
    let dist = Infinity;
    for (const p of POINTS) {
      const d = distances[p.id];
      // Ignorer les points déjà atteints
      if (d !== undefined && d < dist && !reachedIds.includes(p.id)) {
        dist = d;
        id = p.id;
        name = p.name;
      }
    }
    setNearestId(id);
    return { id, name, distance: dist === Infinity ? null : dist };
  }, [position, distances, reachedIds]);

  // Gestion du son de proximité
  useEffect(() => {
    // Si on n'a pas de position ou de point le plus proche, arrêter le son
    if (!position || !nearest.id) {
      stopProximitySound();
      return;
    }

    const distance = nearest.distance;

    // Si on a atteint le point, ne pas jouer le son de proximité
    if (reachedIds.includes(nearest.id)) {
      stopProximitySound();
      return;
    }

    // Si le son de victoire est en train de jouer, ne pas jouer le son de proximité
    if (isVictoryPlaying) {
      stopProximitySound();
      return;
    }

    // Tant que la distance est <= 25 mètres ET > 0, jouer le son de proximité
    if (distance !== null && distance <= 25 && distance > 0) {
      if (!isProximityActive) {
        startProximitySound();
      }
    } else {
      if (isProximityActive) {
        stopProximitySound();
      }
    }
  }, [
    position,
    nearest,
    reachedIds,
    startProximitySound,
    stopProximitySound,
    isProximityActive,
    isVictoryPlaying,
  ]);

  // Détection d'arrivée sur un point (distance < rayon)
  useEffect(() => {
    if (!position) return;

    for (const p of POINTS) {
      const d = distances[p.id];
      if (d === undefined) continue;

      // Vérifier si on est dans le rayon du point
      // et que le point n'a pas déjà été atteint
      const radius = p.radius || 50;
      if (d <= radius && !reachedIds.includes(p.id)) {
        // Marquer comme atteint
        setReachedIds((prev) => [...prev, p.id]);
        setToastName(p.name);

        // Arrêter le son de proximité
        stopProximitySound();

        // Jouer le son de victoire (3 fois)
        playVictorySound();

        // Vibration de victoire
        if ("vibrate" in navigator) {
          navigator.vibrate([100, 50, 100, 50, 200, 100, 300]);
        }
      }
    }
  }, [position, distances, reachedIds, stopProximitySound, playVictorySound]);

  const focusPoint = (p) => {
    if (p && p.coords && Array.isArray(p.coords) && p.coords.length >= 2) {
      window.dispatchEvent(
        new CustomEvent("map:focus", {
          detail: {
            lat: p.coords[0],
            lng: p.coords[1],
          },
        }),
      );
    }
  };

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__logo">
          <Compass size={26} />
        </span>
        <div className="app__heading">
          <h1>Rando-Caching</h1>
          <p>Atteins les points, ton téléphone vibre et sonne quand tu y es.</p>
        </div>
      </header>

      <main className="app__main">
        <section className="app__map-section">
          <StatusBanner
            watching={watching}
            error={error}
            nearestName={nearest.name}
            nearestDistance={nearest.distance}
            reachedCount={reachedIds.length}
            total={POINTS.length}
          />
          <div className="app__map-wrap">
            <MapView
              points={POINTS}
              userPosition={position}
              reachedIds={reachedIds}
              nearestId={nearestId}
            />
          </div>
          <Controls
            watching={watching}
            onStart={start}
            onStop={stop}
            onTestAlert={trigger}
          />
        </section>

        <aside className="app__sidebar">
          <PointsList
            points={POINTS}
            reachedIds={reachedIds}
            distances={distances}
            onFocus={focusPoint}
          />
        </aside>
      </main>

      <ReachedToast
        pointName={toastName}
        onDismiss={() => setToastName(null)}
      />
    </div>
  );
}
