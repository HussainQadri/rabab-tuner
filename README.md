# Rabab Tuner

A real-time web tuner built specifically for the [Rabab](https://en.wikipedia.org/wiki/Rubab_(instrument)) — a traditional stringed instrument from Afghanistan and surrounding regions. Select a string, play it, and get live frequency, cents, and tuning feedback.

**Live app:** [rabab-tuner.vercel.app](https://rabab-tuner.vercel.app/)

## How It Works

1. The React frontend captures microphone input with the Web Audio API and an AudioWorklet.
2. Roughly 200 ms chunks of mono, 32-bit floating-point PCM are streamed to the Flask backend over a Socket.IO WebSocket connection.
3. The backend removes DC offset, applies a 200 Hz high-pass filter, rejects quiet input, and detects pitch from 200–600 Hz with the YIN algorithm.
4. The detected pitch is compared with the selected string and returned with its cent deviation and tuning direction.
5. The frontend renders the result on an analog-style gauge with live frequency and status displays.

### Supported Notes

The tuner covers the full octave used in rabab tuning (sargam).

| Note | Frequency (Hz) |
|------|----------------|
| Sa | 261.63 |
| Re | 293.66 |
| Ga | 329.63 |
| Ma | 349.23 |
| Pa | 392.00 |
| Dha | 440.00 |
| Ni | 493.88 |
| Sa (upper) | 523.25 |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm
- FFmpeg and ffprobe on `PATH` if you want to use the optional `POST /analyze` endpoint

### 1. Start the backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The backend listens on `http://localhost:5000`. Set `PORT` to use another port or set `FLASK_DEBUG=1` to enable Flask debug mode.

On Windows, activate the virtual environment with `.venv\Scripts\activate`.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000` and allow microphone access. The frontend connects to `http://localhost:5000` by default.

To use a backend at another origin, set the URL before starting or building the frontend:

```bash
REACT_APP_BACKEND_URL=https://your-backend.example npm start
```

Microphone capture requires a secure context in production; it works over plain HTTP on `localhost`.

## Backend Interfaces

### Real-time Socket.IO interface

The web app uses a WebSocket-only Socket.IO connection. Client events are:

| Event | Payload | Description |
|-------|---------|-------------|
| `setup` | `{ "sampleRate": 48000 }` | Sets the browser audio context's sample rate |
| `set_note` | `{ "note": "Dha" }` | Selects the target string |
| `audio_data` | `{ "seq": 42, "data": <binary> }` | Sends a chunk of Float32 PCM samples |

The server responds to each processed `audio_data` chunk with a `result` event:

```json
{
  "note": "Dha",
  "target_freq": 440.0,
  "detected_freq": 438.52,
  "status": "In tune.",
  "cents": -5.8,
  "seq": 42
}
```

Quiet chunks return `{ "status": "silence", "seq": 42 }`. If a client sends audio faster than the backend can analyze it, frames received while the previous one is processing are dropped.

### `POST /analyze`

The backend also exposes a single-file analysis endpoint. It accepts a multipart form with:

| Field | Type | Description |
|-------|------|-------------|
| `file` | audio file | Encoded audio supported by FFmpeg (for example, WebM or WAV) |
| `note` | string | Target note name (e.g. `Sa`, `Dha`) |

Returns:

```json
{
  "note": "Dha",
  "target_freq": 440.0,
  "detected_freq": 438.52,
  "status": "Flat, tune up.",
  "cents": -5.8
}
```

If the input is too quiet, the endpoint returns `{ "status": "silence" }`. Missing fields and invalid note names return HTTP 400.
