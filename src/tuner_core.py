import sounddevice as sd
import numpy as np

class RababString:
    def __init__(self, note, freq):
        self.note = note
        self.freq = freq
        self.tolerance = 1.5

    def detect_frequency(self, duration=1.0, samplerate=44100):
        print(f"\nRecording '{self.note}' string...")
        audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1)
        sd.wait()

        signal = audio.flatten()
        windowed = signal * np.hanning(len(signal))  
        spectrum = np.fft.rfft(windowed)
        freqs = np.fft.rfftfreq(len(windowed), 1/samplerate)
        magnitude = np.abs(spectrum)

        detected_freq = freqs[np.argmax(magnitude)]
        print(f"Detected frequency: {detected_freq:.2f} Hz")
        return detected_freq

    def tuning_status(self):
        detected_freq = self.detect_frequency()
        difference = detected_freq - self.freq
        if abs(difference) <= self.tolerance:
            return "In tune."
        elif difference < 0:
            return "Flat, tune up."
        else:
            return "Sharp, tune down."


rabab_strings = [
    RababString("Sa", 261.63),       
    RababString("Re", 293.66),       
    RababString("Ga", 329.63),      
    RababString("Ma", 349.23),     
    RababString("Pa", 392.00),      
    RababString("Dha", 440.00),     
    RababString("Ni", 493.88),       
    RababString("Sa (upper)", 523.25) 
]

