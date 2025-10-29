import React, { useEffect, useRef, useState } from "react";

export default function Tuner() {
  const canvasRef = useRef(null);
  const [result, setResult] = useState("Listening...");
  const [streamRef, setStreamRef] = useState(null);

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
      let hue = 0;

      const draw = () => {
        requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(data);
        c.fillStyle = "#0e1117";
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.lineWidth = 2;
        c.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        hue = (hue + 1) % 360;
        c.beginPath();
        const slice = canvas.width / analyser.frequencyBinCount;
        let x = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          const v = data[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
          x += slice;
        }
        c.lineTo(canvas.width, canvas.height / 2);
        c.stroke();
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
        formData.append("note", "Sa");

        try {
          const res = await fetch("https://rabab-tuner.onrender.com/analyze", {
            method: "POST",
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            setResult(`${data.note} → ${data.detected_freq} Hz → ${data.status}`);
          } else {
            setResult("Server error");
          }
        } catch {
          setResult("Server error");
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
  }, [streamRef]);

  return (
    <div
      className="tuner"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <canvas ref={canvasRef} width={400} height={150}></canvas>
      <p className="tuner-text" style={{ marginTop: "1rem" }}>{result}</p>
    </div>
  );
}
