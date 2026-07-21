import { MapPin, Navigation, CheckCircle2, AlertTriangle } from "lucide-react";
import "./StatusBanner.css";

// Bandeau de statut indiquant l'état du suivi GPS et le point le plus proche.
export default function StatusBanner({
  watching,
  error,
  nearestName,
  nearestDistance,
  reachedCount,
  total,
}) {
  const reached = nearestDistance !== null && nearestDistance <= 0;

  let icon = <MapPin size={20} />;
  let text = "En attente du signal GPS…";
  let tone = "idle";

  if (error) {
    icon = <AlertTriangle size={20} />;
    text = error;
    tone = "error";
  } else if (reached) {
    icon = <CheckCircle2 size={20} />;
    text = `Point atteint : ${nearestName ?? ""}`;
    tone = "success";
  } else if (watching && nearestName) {
    icon = <Navigation size={20} />;
    const d = nearestDistance ?? 0;
    text = `${nearestName} — ${d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`}`;
    tone = "active";
  }

  return (
    <div className={`status-banner ${tone}`}>
      <span className="status-banner__icon">{icon}</span>
      <span className="status-banner__text">{text}</span>
      <span className="status-banner__counter">
        {reachedCount}/{total}
      </span>
    </div>
  );
}
