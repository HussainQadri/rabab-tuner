import sounddevice as sd
import numpy as np
from yin_test import yin

SAMPLE_RATE = 44100
CHUNK_DURATION = 0.1
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION)


print("Listening... (Ctrl+C to stop)\n")

def callback(indata, frames, time, status):
    samples = indata[:, 0].astype(np.float64)
    samples = samples - np.mean(samples)

    rms = np.sqrt(np.mean(samples ** 2))
    if rms < 0.001:
        print(".", end="", flush=True)
        return

    try:
        pitch = yin(samples, SAMPLE_RATE)
        print(f"\r{pitch:>7.2f} Hz  (RMS: {rms:.6f})", flush=True)
    except Exception:
        pass

with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype='float32',
                     blocksize=CHUNK_SAMPLES, callback=callback):
    try:
        while True:
            sd.sleep(100)
    except KeyboardInterrupt:
        print("\nStopped.")
