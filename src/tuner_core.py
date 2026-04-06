import numpy as np
from scipy.signal import butter, sosfilt
from src.yin import compute_yin
from pydub import AudioSegment
import io


class Instrument:
    def __init__(self, name):
        self.name = name


class StringInstrument(Instrument):
    def __init__(self, name, strings):
        super().__init__(name)
        self.strings = strings

    def get_string_by_note(self, note_name):
        for string in self.strings:
            if string.note.lower() == note_name.lower():
                return string
        return None


class RababString:
    def __init__(self, note, freq, tolerance=5):
        self.note = note
        self.freq = freq
        self.tolerance = tolerance

    def tuning_status(self, detected_freq):
        difference = detected_freq - self.freq
        cents = 1200 * np.log2(detected_freq / self.freq) if detected_freq > 0 else 0
        if abs(difference) <= self.tolerance:
            status = "In tune."
        elif difference < 0:
            status = "Flat, tune up."
        else:
            status = "Sharp, tune down."
        return {"status": status, "cents": round(cents, 1)}


class FrequencyDetector:
    def __init__(self):
        pass

    def prepare_audio(self, audio_blob):
        audio = AudioSegment.from_file(io.BytesIO(audio_blob))

        audio = audio.set_channels(1)

        sample_rate = audio.frame_rate
        samples = np.array(audio.get_array_of_samples()).astype(np.float64)

        max_val = float(2 ** (audio.sample_width * 8 - 1))
        samples = samples / max_val

        samples = samples - np.mean(samples)

        sos = butter(4, 200, btype='high', fs=sample_rate, output='sos')
        samples = sosfilt(sos, samples)

        return samples, sample_rate

    def detect_from_blob(self, audio_blob):
        samples, samplerate = self.prepare_audio(audio_blob)
        rms = np.sqrt(np.mean(samples ** 2))
        if rms < 0.01:
            return None
        frequency = compute_yin(samples, samplerate, W=None, threshold=0.15, freq_max=600, freq_min=200)
        return frequency
