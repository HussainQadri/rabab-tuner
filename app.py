from flask import Flask, request, jsonify
from flask_cors import CORS
from pydub import AudioSegment
from src.tuner_core import RababString, StringInstrument, FrequencyDetector

AudioSegment.converter = "C:/ffmpeg/bin/ffmpeg.exe"

app = Flask(__name__)
CORS(app)

rabab = StringInstrument("Rabab", [
    RababString("Sa", 261.63),
    RababString("Re", 293.66),
    RababString("Ga", 329.63),
    RababString("Ma", 349.23),
    RababString("Pa", 392.00),
    RababString("Dha", 440.00),
    RababString("Ni", 493.88),
    RababString("Sa (upper)", 523.25),
])

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
        detector = FrequencyDetector()
        detected_freq = detector.detect_from_blob(content)
        status = target_string.tuning_status(detected_freq)

        return jsonify({
            "note": note,
            "target_freq": target_string.freq,
            "detected_freq": round(detected_freq, 2),
            "status": status
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
