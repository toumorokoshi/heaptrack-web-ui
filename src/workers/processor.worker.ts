import { Decompress } from "fzstd";
import { HeaptrackParser } from "../utils/parser";

export interface ProcessingRequest {
  file: File;
  compressed: boolean;
}

self.onmessage = async (e: MessageEvent<ProcessingRequest>) => {
  try {
    const { file, compressed } = e.data;
    const parser = new HeaptrackParser();
    const decoder = new TextDecoder();
    let remainder = "";
    let bytesProcessed = 0;
    const totalBytes = file.size;

    const processText = (text: string) => {
      const lines = (remainder + text).split("\n");
      remainder = lines.pop() || "";
      for (const line of lines) {
        parser.parseLine(line);
      }
    };

    const stream = file.stream();
    const reader = stream.getReader();
    let lastProgressUpdate = 0;

    const updateProgress = (force = false) => {
      const now = Date.now();
      if (force || now - lastProgressUpdate > 100) {
        // Update every 100ms
        lastProgressUpdate = now;
        self.postMessage({
          type: "progress",
          progress: (bytesProcessed / totalBytes) * 0.9,
          status: compressed ? "Decompressing & Parsing..." : "Parsing...",
        });
      }
    };

    if (compressed) {
      const decompressor = new Decompress((chunk) => {
        processText(decoder.decode(chunk, { stream: true }));
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bytesProcessed += value.length;
        decompressor.push(value);
        updateProgress();
      }
      decompressor.push(new Uint8Array(0), true);
    } else {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bytesProcessed += value.length;
        processText(decoder.decode(value, { stream: true }));
        updateProgress();
      }
    }

    // Finalize
    processText(decoder.decode(new Uint8Array(0), { stream: false }));
    if (remainder) {
      parser.parseLine(remainder);
    }

    self.postMessage({
      type: "progress",
      progress: 0.95,
      status: "Finalizing...",
    });
    const profile = parser.getProfile();
    self.postMessage({ type: "progress", progress: 1.0, status: "Done" });
    self.postMessage({ type: "result", profile });
  } catch (error) {
    self.postMessage({ type: "error", message: (error as Error).message });
  }
};
