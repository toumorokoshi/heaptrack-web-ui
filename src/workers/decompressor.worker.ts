import { decompress } from "fzstd";

self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    const compressedData = new Uint8Array(e.data);
    const decompressedData = decompress(compressedData);

    // Transfer the result back as an ArrayBuffer for efficiency
    const buffer = decompressedData.buffer;
    self.postMessage(buffer, [buffer]);
  } catch (error) {
    self.postMessage({ error: (error as Error).message });
  }
};
