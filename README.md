# Rabab Tuner

A web-based chromatic tuner built specifically for the [Rabab](https://en.wikipedia.org/wiki/Rubab_(instrument)) — a traditional stringed instrument from Afghanistan and surrounding regions. Select a note on the interactive wireframe, play your string, and get real-time pitch feedback with cent-accurate precision.

**Live app:** [rabab-tuner.vercel.app](https://rabab-tuner.vercel.app/)

## How It Works

1. The React frontend captures ~1 second of microphone audio via the Web Audio API
2. The audio blob is sent to a Flask backend over `/analyze`
3. The backend converts the audio, applies an FFT-based pitch detection pipeline (windowed DFT → peak frequency), and returns the detected frequency, cent deviation, and tuning status
4. The frontend displays the result on an analog-style gauge meter and color-coded status badge, then automatically records the next sample

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
- FFmpeg installed and available on PATH (used by pydub for audio decoding)

### Backend

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The dev server runs at `http://localhost:3000`. By default, the frontend sends audio to the deployed backend at `rabab-tuner.onrender.com` — update the fetch URL in `Tuner.js` to `http://localhost:5000/analyze` for local development.

## API

### `POST /analyze`

Accepts a multipart form with:

| Field | Type | Description |
|-------|------|-------------|
| `file` | audio blob | Recorded audio (e.g. `audio/webm`) |
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

