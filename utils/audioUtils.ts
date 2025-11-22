/**
 * Decodes a File object into an AudioBuffer.
 */
export const fileToAudioBuffer = async (file: File, context: AudioContext): Promise<AudioBuffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer);
};

/**
 * Converts a File to a Base64 string (for Gemini API).
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:audio/mp3;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Extracts a portion of an AudioBuffer and returns a new AudioBuffer.
 */
export const sliceAudioBuffer = (
  buffer: AudioBuffer,
  startSeconds: number,
  endSeconds: number,
  context: AudioContext
): AudioBuffer => {
  const rate = buffer.sampleRate;
  const startOffset = Math.max(0, Math.floor(startSeconds * rate));
  const endOffset = Math.min(buffer.length, Math.ceil(endSeconds * rate));
  const frameCount = endOffset - startOffset;

  if (frameCount <= 0) {
    // Return a minimal empty buffer if calculation fails to avoid crash
    return context.createBuffer(buffer.numberOfChannels, 1, rate);
  }

  const newBuffer = context.createBuffer(buffer.numberOfChannels, frameCount, rate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const oldData = buffer.getChannelData(channel);
    const newData = newBuffer.getChannelData(channel);
    // Copy the specific range
    for (let i = 0; i < frameCount; i++) {
      newData[i] = oldData[i + startOffset];
    }
  }

  return newBuffer;
};

/**
 * Encodes an AudioBuffer to a WAV format Blob.
 * This allows us to generate a downloadable file client-side.
 */
export const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // Write WAV Header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this encoder)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Interleave channels
  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      // clamp
      sample = Math.max(-1, Math.min(1, channels[i][pos]));
      // scale to 16-bit signed int
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArr], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
};
