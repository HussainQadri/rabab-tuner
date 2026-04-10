import React, { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const NOTES = [
  { name: "Sa", freq: 261.63 },
  { name: "Re", freq: 293.66 },
  { name: "Ga", freq: 329.63 },
  { name: "Ma", freq: 349.23 },
  { name: "Pa", freq: 392.0 },
  { name: "Dha", freq: 440.0 },
  { name: "Ni", freq: 493.88 },
  { name: "Sa (upper)", freq: 523.25 },
];

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function GaugeMeter({ cents, inTune }) {
  // cents range: -50 to +50 mapped to angle -90 to +90
  const clampedCents = clamp(cents || 0, -50, 50);
  const angle = (clampedCents / 50) * 90;

  const accentColor = inTune ? "#22c55e" : Math.abs(clampedCents) < 15 ? "#eab308" : "#ef4444";

  // SVG arc parameters
  const cx = 150, cy = 150, r = 120;
  const startAngle = -180;
  const endAngle = 0;
  const tickCount = 21; // ticks from -50 to +50

  const polarToCart = (angleDeg, radius) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  // Arc path
  const arcStart = polarToCart(startAngle, r);
  const arcEnd = polarToCart(endAngle, r);

  // Needle angle: -180 is far left (flat), -90 is center (in tune), 0 is far right (sharp)
  const needleAngle = -90 + angle;
  const needleTip = polarToCart(needleAngle, r - 10);
  const needleBase1 = polarToCart(needleAngle - 90, 4);
  const needleBase2 = polarToCart(needleAngle + 90, 4);

  // Generate tick marks
  const ticks = [];
  for (let i = 0; i <= tickCount - 1; i++) {
    const t = i / (tickCount - 1);
    const tickAngle = startAngle + t * (endAngle - startAngle);
    const outer = polarToCart(tickAngle, r + 8);
    const isMajor = i % 5 === 0;
    const inner = polarToCart(tickAngle, r + (isMajor ? 20 : 14));
    ticks.push(
      <line
        key={i}
        x1={outer.x} y1={outer.y}
        x2={inner.x} y2={inner.y}
        stroke={isMajor ? "#6b7280" : "#374151"}
        strokeWidth={isMajor ? 2 : 1}
        strokeLinecap="round"
      />
    );
  }

  // Glow arc segments - colored portion near the needle
  const glowStart = -90;
  const glowAngle = needleAngle;
  const glowArcStart = polarToCart(Math.min(glowStart, glowAngle), r);
  const glowArcEnd = polarToCart(Math.max(glowStart, glowAngle), r);
  const glowSweep = Math.abs(glowAngle - glowStart);

  return (
    <svg viewBox="0 0 300 170" className="gauge-svg">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="needleGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none"
        stroke="#1f2937"
        strokeWidth={6}
        strokeLinecap="round"
      />

      {/* Active colored arc from center to needle */}
      {cents !== null && (
        <path
          d={`M ${glowArcStart.x} ${glowArcStart.y} A ${r} ${r} 0 ${glowSweep > 180 ? 1 : 0} 1 ${glowArcEnd.x} ${glowArcEnd.y}`}
          fill="none"
          stroke={accentColor}
          strokeWidth={6}
          strokeLinecap="round"
          filter="url(#glow)"
          opacity={0.8}
        />
      )}

      {/* Tick marks */}
      {ticks}

      {/* Center tick (in-tune marker) */}
      <line
        x1={cx} y1={cy - r - 8}
        x2={cx} y2={cy - r - 24}
        stroke={inTune ? "#22c55e" : "#9ca3af"}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
        fill={accentColor}
        filter="url(#needleGlow)"
        style={{ transition: "all 0.3s ease-out" }}
      />

      {/* Center pivot */}
      <circle cx={cx} cy={cy} r={6} fill="#111827" stroke={accentColor} strokeWidth={2} />

      {/* Labels */}
      <text x={30} y={160} fill="#6b7280" fontSize="11" fontFamily="Inter, sans-serif" textAnchor="middle">-50</text>
      <text x={cx} y={cy - r - 28} fill="#6b7280" fontSize="11" fontFamily="Inter, sans-serif" textAnchor="middle">0</text>
      <text x={270} y={160} fill="#6b7280" fontSize="11" fontFamily="Inter, sans-serif" textAnchor="middle">+50</text>
    </svg>
  );
}

export default function Tuner() {
  const [detectedFreq, setDetectedFreq] = useState(null);
  const [cents, setCents] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedNote = NOTES[selectedIdx];

  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const streamRef = useRef(null);
  const seqRef = useRef(0);
  const selectedNoteRef = useRef(selectedNote.name);

  // Keep the ref in sync with state for use in the socket callback
  useEffect(() => {
    selectedNoteRef.current = selectedNote.name;
  }, [selectedNote.name]);

  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule("/pcm-processor.js");

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, "pcm-processor");
      workletNodeRef.current = workletNode;

      // Connect Socket.IO
      const socket = io(BACKEND_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("setup", { sampleRate: audioContext.sampleRate });
        socket.emit("set_note", { note: selectedNoteRef.current });
        setStatus("listening");
      });

      socket.on("disconnect", () => {
        setStatus("connecting");
      });

      socket.on("result", (data) => {
        // Discard stale responses
        if (data.seq !== seqRef.current) return;

        if (data.status === "silence") {
          setStatus("listening");
          setDetectedFreq(null);
          setCents(null);
          return;
        }

        if (data.status === "error") {
          setStatus("error");
          return;
        }

        setDetectedFreq(data.detected_freq);
        setCents(data.cents);

        if (data.status.includes("In tune")) {
          setStatus("in_tune");
        } else if (data.status.includes("Flat")) {
          setStatus("flat");
        } else if (data.status.includes("Sharp")) {
          setStatus("sharp");
        } else {
          setStatus("listening");
        }
      });

      // Forward PCM chunks from worklet to server
      workletNode.port.onmessage = (e) => {
        if (socket.connected) {
          seqRef.current += 1;
          socket.emit("audio_data", {
            seq: seqRef.current,
            data: e.data.buffer,
          });
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
    } catch (err) {
      console.error("Audio setup failed:", err);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    startAudio();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (workletNodeRef.current) workletNodeRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startAudio]);

  // Notify backend when the selected note changes
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("set_note", { note: selectedNote.name });
    }
  }, [selectedNote.name]);

  const inTune = status === "in_tune";
  const accentColor = inTune ? "#22c55e" : status === "flat" || status === "sharp" ? (Math.abs(cents || 0) < 15 ? "#eab308" : "#ef4444") : "#6b7280";

  const statusLabel =
    status === "in_tune" ? "In Tune" :
    status === "flat" ? "Tune Up" :
    status === "sharp" ? "Tune Down" :
    status === "error" ? "No Signal" :
    status === "connecting" ? "Connecting..." :
    "Listening...";

  return (
    <div className="tuner-container">
      {/* Header */}
      <div className="tuner-header">
        <span className="tuner-brand">Rabab Tuner</span>
        <a
          className="github-icon"
          href="https://github.com/HussainQadri/rabab-tuner"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </div>

      {/* Gauge */}
      <div className={`gauge-container ${inTune ? "gauge-glow" : ""}`}>
        <GaugeMeter cents={cents} inTune={inTune} />
        <div className="gauge-note" style={{ color: accentColor }}>
          {selectedNote.name}
        </div>
      </div>

      {/* Status + frequency info */}
      <div className="tuner-info">
        <div className="status-badge" style={{ background: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}40` }}>
          {statusLabel}
        </div>
        <div className="freq-display">
          {detectedFreq ? `${detectedFreq} Hz` : "-- Hz"}
          <span className="freq-target"> / {selectedNote.freq} Hz</span>
        </div>
        {cents !== null && (
          <div className="cents-display" style={{ color: accentColor }}>
            {cents > 0 ? "+" : ""}{cents} cents
          </div>
        )}
      </div>

      {/* String selector */}
      <div className="string-selector">
        <div className="string-selector-label">Select String</div>
        <div className="strings-row">
          {NOTES.map((note, i) => (
            <button
              key={note.name}
              className={`string-btn ${selectedIdx === i ? "string-btn-active" : ""}`}
              onClick={() => { setSelectedIdx(i); setCents(null); setDetectedFreq(null); setStatus("listening"); }}
            >
              <div className="string-line-container">
                <div className={`string-line ${selectedIdx === i ? "string-line-active" : ""}`} />
              </div>
              <span className="string-label">{note.name}</span>
              <span className="string-freq">{note.freq}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
