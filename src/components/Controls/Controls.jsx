import { Play, Square, Bell } from "lucide-react";
import "./Controls.css";

// Boutons de contrôle : démarrer/arrêter le suivi GPS et tester l'alerte.
export default function Controls({ watching, onStart, onStop, onTestAlert }) {
  return (
    <div className="controls">
      {watching ? (
        <button className="controls__btn controls__btn--stop" onClick={onStop}>
          <Square size={18} />
          Arrêter
        </button>
      ) : (
        <button
          className="controls__btn controls__btn--start"
          onClick={onStart}
        >
          <Play size={18} />
          Démarrer la chasse
        </button>
      )}
      <button
        className="controls__btn controls__btn--test"
        onClick={onTestAlert}
      >
        <Bell size={18} />
        Tester l'alerte
      </button>
    </div>
  );
}
