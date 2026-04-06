import numpy as np


def difference_function(signal, W):
    df = np.zeros(W)
    for tau in range(W):
        diff = signal[:W] - signal[tau:tau + W]
        df[tau] = np.sum(diff * diff)
    return df


def cmndf(df):
    # len(df) is the number of lags, we iterate through them
    cmndf_vals = np.zeros(len(df))
    cmndf_vals[0] = 1
    running_sum = 0
    for tau in range(1, len(df)):
        running_sum += df[tau]
        cmndf_vals[tau] = df[tau] / (running_sum / tau)
    return cmndf_vals


def absolute_threshold(cmndf_vals, threshold=0.1, tau_min=2):
    for tau in range(tau_min, len(cmndf_vals)):
        if cmndf_vals[tau] < threshold:
            # found a decreasing 'valley', find the bottom of this valley
            while tau + 1 < len(cmndf_vals) and cmndf_vals[tau + 1] < cmndf_vals[tau]:
                tau += 1
            return tau
    # no values found below threshold, return global minimum instead
    return np.argmin(cmndf_vals[tau_min:]) + tau_min


def parabolic_interpolation(cmndf_vals, tau):
    if tau < 1 or tau >= len(cmndf_vals) - 1:
        return float(tau)
    alpha = cmndf_vals[tau - 1]
    beta = cmndf_vals[tau]
    gamma = cmndf_vals[tau + 1]
    peak = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma)
    return tau + peak


def compute_yin(signal, sample_rate, W=None, threshold=0.15, freq_max=600, freq_min=200):
    if W is None:
        W = int(sample_rate / freq_min) * 4
    tau_min = max(2, int(sample_rate / freq_max))
    df = difference_function(signal, W)
    cmndf_vals = cmndf(df)
    tau = absolute_threshold(cmndf_vals, threshold, tau_min)
    tau = parabolic_interpolation(cmndf_vals, tau)
    return sample_rate / tau


