import { CheckCircle2, Circle, MapPin } from "lucide-react";
import "./PointsList.css";

// Liste latérale des points avec état (atteint / en cours) et distance.
export default function PointsList({ points, reachedIds, distances, onFocus }) {
  return (
    <div className="points-list">
      <h2 className="points-list__title">Points à atteindre</h2>
      <ul className="points-list__items">
        {points.map((p) => {
          const reached = reachedIds.includes(p.id);
          const d = distances[p.id];
          return (
            <li key={p.id}>
              <button
                className={`point-card ${reached ? "point-card--reached" : ""}`}
                onClick={() => onFocus(p)}
              >
                <span className="point-card__icon">
                  {reached ? (
                    <CheckCircle2 size={22} color="#16a34a" />
                  ) : (
                    <Circle size={22} color="#94a3b8" />
                  )}
                </span>
                <span className="point-card__body">
                  <span className="point-card__name">{p.name}</span>
                  <span className="point-card__meta">
                    <MapPin size={12} />
                    {d !== undefined
                      ? d < 1000
                        ? `${Math.round(d)} m`
                        : `${(d / 1000).toFixed(2)} km`
                      : "—"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
