import platform

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from pydub import AudioSegment
from pydub.utils import which

from src.tuner_core import RababString, StringInstrument, FrequencyDetector


ffmpeg_path = which("ffmpeg")
ffprobe_path = which("ffprobe")

if not ffmpeg_path:
    system = platform.system()
    if system == "Darwin":  # macOS
        ffmpeg_path = "/opt/homebrew/bin/ffmpeg"
        ffprobe_path = "/opt/homebrew/bin/ffprobe"
    elif system == "Windows":
        ffmpeg_path = "C:/ffmpeg/bin/ffmpeg.exe"
        ffprobe_path = "C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe"

AudioSegment.converter = ffmpeg_path
AudioSegment.ffprobe = ffprobe_path

print(f"[DEBUG] Using ffmpeg at: {ffmpeg_path}")
print(f"[DEBUG] Using ffprobe at: {ffprobe_path}")


app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins=[
        "https://rabab-tuner.vercel.app",
        "http://localhost:3000",
    ],
)

rabab = StringInstrument(
    "Rabab",
    [
        RababString("Sa", 261.63),
        RababString("Re", 293.66),
        RababString("Ga", 329.63),
        RababString("Ma", 349.23),
        RababString("Pa", 392.00),
        RababString("Dha", 440.00),
        RababString("Ni", 493.88),
        RababString("Sa (upper)", 523.25),
    ],
)

detector = FrequencyDetector()

# Per-socket session state
client_state = {}


@socketio.on("connect")
def handle_connect():
    client_state[request.sid] = {
        "sample_rate": 44100,
        "note": "Sa",
        "processing": False,
    }
    print(f"[WS] Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    client_state.pop(request.sid, None)
    print(f"[WS] Client disconnected: {request.sid}")


@socketio.on("setup")
def handle_setup(data):
    if request.sid in client_state:
        client_state[request.sid]["sample_rate"] = data.get("sampleRate", 44100)


@socketio.on("set_note")
def handle_set_note(data):
    if request.sid in client_state:
        client_state[request.sid]["note"] = data.get("note", "Sa")


@socketio.on("audio_data")
def handle_audio_data(data):
    sid = request.sid
    state = client_state.get(sid)
    if not state:
        return

    # Backpressure: drop frame if still processing previous one
    if state["processing"]:
        return
    state["processing"] = True

    try:
        seq = data.get("seq", 0) if isinstance(data, dict) else 0
        audio_bytes = data.get("data") if isinstance(data, dict) else data

        samples = np.frombuffer(audio_bytes, dtype=np.float32)
        sample_rate = state["sample_rate"]

        detected_freq = detector.detect_from_pcm(samples, sample_rate)

        if detected_freq is None:
            emit("result", {"status": "silence", "seq": seq})
            return

        note_name = state["note"]
        target_string = rabab.get_string_by_note(note_name)
        if not target_string:
            emit("result", {"status": "silence", "seq": seq})
            return

        result = target_string.tuning_status(detected_freq)

        emit("result", {
            "note": note_name,
            "target_freq": target_string.freq,
            "detected_freq": round(detected_freq, 2),
            "status": result["status"],
            "cents": result["cents"],
            "seq": seq,
        })
    except Exception as e:
        emit("result", {"status": "error", "error": str(e), "seq": 0})
    finally:
        state["processing"] = False


@app.route("/analyze", methods=["POST"])
def analyze_audio():
    if "file" not in request.files or "note" not in request.form:
        return jsonify({"error": "Missing 'file' or 'note' field"}), 400

    note = request.form["note"]
    file = request.files["file"]
    content = file.read()

    target_string = rabab.get_string_by_note(note)
    if not target_string:
        return jsonify({"error": "Invalid note"}), 400

    try:
        detected_freq = detector.detect_from_blob(content)

        if detected_freq is None:
            return jsonify({"status": "silence"})

        result = target_string.tuning_status(detected_freq)

        return jsonify(
            {
                "note": note,
                "target_freq": target_string.freq,
                "detected_freq": round(detected_freq, 2),
                "status": result["status"],
                "cents": result["cents"],
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    socketio.run(app, host="0.0.0.0", port=port, debug=debug)
