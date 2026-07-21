import { useCallback, useRef, useState, useEffect } from "react";

// Gère vibration + sonnerie avec fichiers audio importés
export function useAlerts() {
  const audioRefs = useRef({
    proximity: null,
    victory: null,
    test: null,
  });
  const lastAlert = useRef(0);
  const proximityInterval = useRef(null);
  const victoryCount = useRef(0);
  const victoryTimeout = useRef(null);
  const [isProximityActive, setIsProximityActive] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [isVictoryPlaying, setIsVictoryPlaying] = useState(false);

  // Fonction pour charger les fichiers audio
  const loadAudioFiles = useCallback((audioFiles) => {
    try {
      if (audioFiles.proximity) {
        audioRefs.current.proximity = new Audio(audioFiles.proximity);
        audioRefs.current.proximity.loop = true;
        audioRefs.current.proximity.preload = "auto";
        audioRefs.current.proximity.volume = 0.5;
      }

      if (audioFiles.victory) {
        audioRefs.current.victory = new Audio(audioFiles.victory);
        audioRefs.current.victory.loop = false;
        audioRefs.current.victory.preload = "auto";
        audioRefs.current.victory.volume = 0.8;
      }

      if (audioFiles.test) {
        audioRefs.current.test = new Audio(audioFiles.test);
        audioRefs.current.test.loop = false;
        audioRefs.current.test.preload = "auto";
        audioRefs.current.test.volume = 0.7;
      }

      setAudioLoaded(true);
    } catch (error) {
      console.error("Erreur lors du chargement des fichiers audio:", error);
    }
  }, []);

  // Vibration
  const vibrate = useCallback((pattern = [200, 100, 200, 100, 400]) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Démarrer le son de proximité en boucle
  const startProximitySound = useCallback(() => {
    try {
      const audio = audioRefs.current.proximity;
      if (!audio || !audioLoaded) {
        playFallbackProximity();
        return;
      }

      if (audio.paused) {
        audio.currentTime = 0;
        audio.loop = true;
        audio.play().catch(() => {
          playFallbackProximity();
        });
      }
      setIsProximityActive(true);
    } catch (error) {
      console.warn("Erreur lecture proximité:", error);
      playFallbackProximity();
    }
  }, [audioLoaded]);

  // Arrêter le son de proximité
  const stopProximitySound = useCallback(() => {
    setIsProximityActive(false);

    if (audioRefs.current.proximity) {
      audioRefs.current.proximity.pause();
      audioRefs.current.proximity.currentTime = 0;
    }

    if (proximityInterval.current) {
      clearInterval(proximityInterval.current);
      proximityInterval.current = null;
    }
  }, []);

  // Fallback pour le son de proximité (synthèse en boucle)
  const playFallbackProximity = useCallback(() => {
    try {
      if (!window._audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        window._audioCtx = new Ctx();
      }
      const ctx = window._audioCtx;
      if (ctx.state === "suspended") ctx.resume();

      let isPlaying = true;

      const playBeep = () => {
        if (!isPlaying || !isProximityActive) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.value = 660;

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        osc.start(now);
        osc.stop(now + 0.2);

        proximityInterval.current = setTimeout(() => {
          playBeep();
        }, 800);
      };

      playBeep();

      return () => {
        isPlaying = false;
        if (proximityInterval.current) {
          clearTimeout(proximityInterval.current);
        }
      };
    } catch {
      return null;
    }
  }, [isProximityActive]);

  // Son de victoire (joue 3 fois)
  const playVictorySound = useCallback(() => {
    try {
      // Arrêter le son de proximité
      stopProximitySound();

      // Réinitialiser le compteur
      victoryCount.current = 0;
      setIsVictoryPlaying(true);

      const audio = audioRefs.current.victory;
      if (audio && audioLoaded) {
        // Fonction pour jouer le son de victoire récursivement
        const playVictory = () => {
          if (victoryCount.current >= 3) {
            setIsVictoryPlaying(false);
            victoryCount.current = 0;
            return;
          }

          audio.currentTime = 0;
          audio.loop = false;

          const playPromise = audio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                victoryCount.current++;
                // Programmer la prochaine lecture après la fin du son
                victoryTimeout.current = setTimeout(() => {
                  playVictory();
                }, 500); // Attendre 500ms entre chaque lecture
              })
              .catch(() => {
                // Fallback en cas d'erreur
                playFallbackVictory();
              });
          }
        };

        playVictory();
      } else {
        playFallbackVictory();
      }
    } catch (error) {
      console.warn("Erreur lecture victoire:", error);
      playFallbackVictory();
    }
  }, [audioLoaded, stopProximitySound]);

  // Fallback pour le son de victoire (synthèse - joue 3 fois)
  const playFallbackVictory = useCallback(() => {
    try {
      if (!window._audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        window._audioCtx = new Ctx();
      }
      const ctx = window._audioCtx;
      if (ctx.state === "suspended") ctx.resume();

      setIsVictoryPlaying(true);
      victoryCount.current = 0;

      const playVictoryMelody = () => {
        if (victoryCount.current >= 3) {
          setIsVictoryPlaying(false);
          victoryCount.current = 0;
          return;
        }

        const notes = [523, 659, 784, 1047];

        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "square";
          osc.frequency.value = freq;

          osc.connect(gain);
          gain.connect(ctx.destination);

          const startTime = ctx.currentTime + i * 0.15;
          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);

          osc.start(startTime);
          osc.stop(startTime + 0.2);
        });

        victoryCount.current++;
        // Programmer la prochaine lecture
        victoryTimeout.current = setTimeout(() => {
          playVictoryMelody();
        }, 500);
      };

      playVictoryMelody();
    } catch {
      setIsVictoryPlaying(false);
      victoryCount.current = 0;
    }
  }, []);

  // Son de test (joue une fois complètement)
  const playTestSound = useCallback(() => {
    try {
      // Arrêter le son de test s'il est en cours
      if (audioRefs.current.test) {
        audioRefs.current.test.pause();
        audioRefs.current.test.currentTime = 0;
      }

      const audio = audioRefs.current.test;
      if (audio && audioLoaded) {
        audio.currentTime = 0;
        audio.loop = false;
        audio.volume = 0.7;

        audio.play().catch(() => {
          playFallbackTest();
        });
      } else {
        playFallbackTest();
      }
    } catch (error) {
      console.warn("Erreur lecture test:", error);
      playFallbackTest();
    }
  }, [audioLoaded]);

  // Fallback pour le son de test (synthèse - joue une fois)
  const playFallbackTest = useCallback(() => {
    try {
      if (!window._audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        window._audioCtx = new Ctx();
      }
      const ctx = window._audioCtx;
      if (ctx.state === "suspended") ctx.resume();

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + start;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.start(t);
        osc.stop(t + duration);
      };

      playTone(880, 0, 0.3);
      playTone(880, 0.4, 0.3);
      playTone(1175, 0.8, 0.5);
    } catch {
      // Silencieux
    }
  }, []);

  // Alerte immédiate pour le test
  const trigger = useCallback(() => {
    const now = Date.now();
    if (now - lastAlert.current < 5000) return;
    lastAlert.current = now;

    vibrate([200, 100, 200, 100, 400]);
    playTestSound();
  }, [vibrate, playTestSound]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (proximityInterval.current) {
        clearInterval(proximityInterval.current);
        proximityInterval.current = null;
      }

      if (victoryTimeout.current) {
        clearTimeout(victoryTimeout.current);
        victoryTimeout.current = null;
      }

      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });

      if (window._audioCtx) {
        window._audioCtx.close();
        window._audioCtx = null;
      }
    };
  }, []);

  return {
    trigger,
    loadAudioFiles,
    startProximitySound,
    stopProximitySound,
    playVictorySound,
    isProximityActive,
    audioLoaded,
    isVictoryPlaying,
  };
}
