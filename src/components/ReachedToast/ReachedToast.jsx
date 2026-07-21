import { useEffect } from "react";
import { PartyPopper } from "lucide-react";
import "./ReachedToast.css";

// Notification temporaire affichée quand un point est atteint.
export default function ReachedToast({ pointName, onDismiss }) {
  useEffect(() => {
    if (!pointName) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [pointName, onDismiss]);

  if (!pointName) return null;

  return (
    <div className="reached-toast" role="status">
      <span className="reached-toast__icon">
        <PartyPopper size={26} />
      </span>
      <span className="reached-toast__body">
        <span className="reached-toast__title">Point atteint !</span>
        <span className="reached-toast__name">{pointName}</span>
      </span>
    </div>
  );
}
