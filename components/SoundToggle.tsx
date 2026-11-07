"use client";

import { useEffect, useState } from "react";
import { isSoundOn, onSoundChange, setSound, sfx } from "@/lib/sound";
import styles from "./Nav.module.css";

/** Pixel speaker in the navigation that switches the sound effects on/off. */
export default function SoundToggle() {
  // Start "on" to match the server render, then sync with the saved choice.
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(isSoundOn());
    const off = onSoundChange(setOn);
    return () => {
      off();
    };
  }, []);

  const toggle = () => {
    const next = !on;
    setSound(next);
    if (next) sfx.on();
  };

  return (
    <button
      type="button"
      className={styles.sound}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound effects off" : "Turn sound effects on"}
      title={on ? "Sound on" : "Sound off"}
    >
      <svg viewBox="0 0 16 12" width="20" height="15" shapeRendering="crispEdges" aria-hidden="true">
        {/* speaker body */}
        <rect x="0" y="4" width="3" height="4" fill="currentColor" />
        <rect x="3" y="3" width="1" height="6" fill="currentColor" />
        <rect x="4" y="2" width="1" height="8" fill="currentColor" />
        <rect x="5" y="1" width="1" height="10" fill="currentColor" />
        {on ? (
          <g className={styles.waves} fill="currentColor">
            <rect x="8" y="5" width="1" height="2" />
            <rect x="10" y="3" width="1" height="1" />
            <rect x="11" y="4" width="1" height="4" />
            <rect x="10" y="8" width="1" height="1" />
            <rect x="13" y="1" width="1" height="1" />
            <rect x="14" y="2" width="1" height="8" />
            <rect x="13" y="10" width="1" height="1" />
          </g>
        ) : (
          <g fill="currentColor">
            <rect x="9" y="3" width="1" height="1" />
            <rect x="10" y="4" width="1" height="1" />
            <rect x="11" y="5" width="2" height="2" />
            <rect x="13" y="7" width="1" height="1" />
            <rect x="14" y="8" width="1" height="1" />
            <rect x="13" y="4" width="1" height="1" />
            <rect x="14" y="3" width="1" height="1" />
            <rect x="10" y="7" width="1" height="1" />
            <rect x="9" y="8" width="1" height="1" />
          </g>
        )}
      </svg>
    </button>
  );
}
