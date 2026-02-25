from scipy import signal
import numpy as np


def test_signal(x):
    f0 = 1
    return np.sin(x * np.pi * 2 * f0)


def ACF(signal, t, W, lag):
    a = signal[t : t + W]
    b = signal[t + lag : t + lag + W]
    return np.sum(a * b)


def detect_pitch(signal, sample_rate):
    t = 0
    W = 50
    vals = []
    lag_max = len(signal) - t - W

    for lag in range(1, lag_max + 1):
        vals.append(ACF(signal, 0, 50, lag))
    best_lag = np.argmax(vals) + 1
    return sample_rate / best_lag


sample_rate = 50
x = np.linspace(0, 2, int(sample_rate * 2) + 1)
signal = test_signal(x)

pitch = detect_pitch(signal, sample_rate)
print(pitch)
