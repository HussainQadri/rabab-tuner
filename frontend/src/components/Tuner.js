import React, { useEffect, useRef, useState } from "react";

export default function Tuner() {
  const canvasRef = useRef(null);
  const [detectedFreq, setDetectedFreq] = useState(null);
  const [status, setStatus] = useState("Listening...");
  const [color, setColor] = useState("#9ca3af");
  const [streamRef, setStreamRef] = useState(null);

  const notes = ["Sa", "Re", "Ga", "Ma", "Pa", "Dha", "Ni", "Sa (upper)"];
  const frequencies = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  const [selectedNote, setSelectedNote] = useState("Sa");

  useEffect(() => {
    const setupWave = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStreamRef(stream);

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const canvas = canvasRef.current;
      const c = canvas.getContext("2d");
      const data = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);

        const w = canvas.width;
        const h = canvas.height;
        const barWidth = (w / data.length) * 2.5;
        let x = 0;

        c.fillStyle = "#0e1117";
        c.fillRect(0, 0, w, h);

        for (let i = 0; i < data.length; i++) {
          const barHeight = (data[i] / 255) * h;
          const hue = 200 + (barHeight / h) * 160;
          c.fillStyle = `hsl(${hue}, 100%, 60%)`;
          c.fillRect(x, h - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };
      draw();
    };

    setupWave();
  }, []);

  useEffect(() => {
    if (!streamRef) return;
    let isRunning = true;

    const recordAndSend = async () => {
      if (!isRunning) return;

      const recorder = new MediaRecorder(streamRef, { mimeType: "audio/webm;codecs=opus" });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");
        formData.append("note", selectedNote);

        try {
          const res = await fetch("https://rabab-tuner.onrender.com/analyze", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setDetectedFreq(data.detected_freq);

            if (data.status.includes("In tune")) {
              setColor("#22c55e");
              setStatus("Perfectly in tune ");
            } else if (data.status.includes("Flat")) {
              setColor("#3b82f6");
              setStatus("Tune up");
            } else if (data.status.includes("Sharp")) {
              setColor("#ef4444");
              setStatus("Tune down");
            } else {
              setColor("#9ca3af");
              setStatus("Listening...");
            }
          } else {
            setColor("#9ca3af");
            setStatus("Server error");
          }
        } catch {
          setColor("#9ca3af");
          setStatus("Server error");
        }

        if (isRunning) setTimeout(recordAndSend, 1500);
      };

      recorder.start();
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 1000);
    };

    recordAndSend();
    return () => {
      isRunning = false;
    };
  }, [streamRef, selectedNote]);

  return (
    <div
      className="tuner"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "1rem",
        }}
      >
        {notes.map((n) => (
          <button
            key={n}
            onClick={() => setSelectedNote(n)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: selectedNote === n ? "#3b82f6" : "#1f2937",
              color: "#e5e7eb",
              fontWeight: 500,
            }}
          >
            {n}
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} width={400} height={150}></canvas>

      <div
        style={{
          textAlign: "center",
          marginTop: "1.5rem",
          transition: "color 0.4s ease",
          color,
        }}
      >
        <div style={{ fontSize: "1rem", opacity: 0.8 }}>Tuning: {selectedNote}</div>
        <div style={{ fontSize: "1rem", opacity: 0.8 }}>Target: {frequencies[notes.indexOf(selectedNote)]}</div>
        <div style={{ fontSize: "1.1rem", opacity: 0.8 }}>{status}</div>
        {detectedFreq && (
          <div style={{ fontSize: "1.8rem", fontWeight: 600, marginTop: "0.4rem" }}>
            {detectedFreq} Hz
          </div>
        )}
        <div
          style={{
            width: "140px",
            height: "4px",
            background: color,
            borderRadius: "2px",
            margin: "10px auto 0",
            boxShadow: `0 0 12px ${color}80`,
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        ></div>
      </div>
    </div>
  );
}
