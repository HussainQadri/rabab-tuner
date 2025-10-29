import numpy as np
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
        if abs(difference) <= self.tolerance:
            return "In tune."
        elif difference < 0:
            return "Flat, tune up."
        else:
            return "Sharp, tune down."


class FrequencyDetector:
    def __init__(self):
        pass

    def detect_from_blob(self, audio_blob):
        audio = AudioSegment.from_file(io.BytesIO(audio_blob))
        samples = np.array(audio.get_array_of_samples()).astype(np.float32)
        samplerate = audio.frame_rate
        windowed = samples * np.hanning(len(samples))
        spectrum = np.fft.rfft(windowed)
        freqs = np.fft.rfftfreq(len(windowed), 1 / samplerate)
        detected = freqs[np.argmax(np.abs(spectrum))]
        return detected
