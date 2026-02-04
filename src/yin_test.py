import numpy as np
import sounddevice as sd
import matplotlib.pyplot as plt


def get_audio_window(window_size, sample_rate):
    audio = sd.rec(window_size, samplerate = sample_rate, channels = 1, dtype="float32")
    sd.wait()
    return audio[:, 0]

def f(x):
    f_0 = 2
    envelope = lambda x: np.exp(-x)
    return np.sin(x * np.pi * 2 * f_0) * envelope(x)
def ACF(f, W, t, lag):
    return np.sum(f[t: t + W] * f[t + lag: t + W + lag])


def DF(f, W, t, lag):
    return ACF(f, W, t, 0) + ACF(f, W, t+lag, 0) - 2 * ACF(f, W, t, lag)


def CMNDF(f, W, t, lag):
    if lag == 0:
        return 1
    return lag * DF(f, W, t, lag) / sum(DF(f, W, t, j + 1) for j in range(lag))


def detect_pitch(f, W, t, sample_rate, bounds):
    CMNDF_vals = []
    for i in range(*bounds):  # the bounds are the ranges of lags that we use for the CMNDF
        CMNDF_vals.append(CMNDF(f, W, t, i))
    sample = np.argmin(CMNDF_vals) + bounds[0]
    return sample_rate/ sample


def main():
    sample_rate = 44100
    W = 2048
    max_lag = 2048
    bounds = [int(sample_rate/1000), max_lag]  # ~ up to 1000 Hz

    signal = get_audio_window(W + max_lag, sample_rate)

    time_axis = np.arange(len(signal)) / sample_rate
    plt.plot(time_axis, signal)
    plt.xlabel("Time (s)")
    plt.show()

    print(detect_pitch(signal, W, 0, sample_rate, bounds))
main()
