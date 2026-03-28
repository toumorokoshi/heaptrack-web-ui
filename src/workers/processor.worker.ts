import { decompress } from "fzstd";
import { parseHeaptrack } from "../utils/parser";

export interface ProcessingRequest {
  data: ArrayBuffer;
  compressed: boolean;
}

self.onmessage = async (e: MessageEvent<ProcessingRequest>) => {
  try {
    const { data, compressed } = e.data;
    let text: string;

    if (compressed) {
      const compressedData = new Uint8Array(data);
      self.postMessage({ type: "progress", progress: 0.1, status: "Decompressing..." });
      const decompressedData = decompress(compressedData);
      
      self.postMessage({ type: "progress", progress: 0.3, status: "Decoding text..." });
      text = new TextDecoder().decode(decompressedData);
    } else {
      self.postMessage({ type: "progress", progress: 0.1, status: "Decoding text..." });
      text = new TextDecoder().decode(data);
    }

    const startProgress = compressed ? 0.4 : 0.2;
    const progressRange = 1.0 - startProgress;

    self.postMessage({ type: "progress", progress: startProgress, status: "Parsing heaptrack data..." });
    const profile = parseHeaptrack(text, (p) => {
      const totalProgress = startProgress + p * progressRange;
      self.postMessage({ type: "progress", progress: totalProgress, status: "Parsing..." });
    });

    self.postMessage({ type: "result", profile });
  } catch (error) {
    self.postMessage({ type: "error", message: (error as Error).message });
  }
};
