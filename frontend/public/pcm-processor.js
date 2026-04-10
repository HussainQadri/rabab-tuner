class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // ~200ms of audio at the current sample rate
    this.bufferSize = Math.floor(sampleRate * 0.2);
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length === 0) return true;

    const channelData = input[0];
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.writeIndex++] = channelData[i];
      if (this.writeIndex >= this.bufferSize) {
        this.port.postMessage(this.buffer.slice());
        this.writeIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
