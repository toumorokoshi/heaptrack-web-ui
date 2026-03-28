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

    if (compressed) {
      self.postMessage({ type: "progress", progress: 0, status: "Decompressing & Parsing..." });
      
      const decompressor = new Decompress((chunk) => {
        processText(decoder.decode(chunk, { stream: true }));
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bytesProcessed += value.length;
        decompressor.push(value);
        
        // Update progress occasionally
        if (bytesProcessed % (1024 * 1024) === 0 || bytesProcessed === totalBytes) {
          self.postMessage({ 
            type: "progress", 
            progress: (bytesProcessed / totalBytes) * 0.9, 
            status: "Processing compressed data..." 
          });
        }
      }
      // Signal end of decompression
      decompressor.push(new Uint8Array(0), true);
    } else {
      self.postMessage({ type: "progress", progress: 0, status: "Parsing..." });
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bytesProcessed += value.length;
        processText(decoder.decode(value, { stream: true }));

        if (bytesProcessed % (1024 * 1024) === 0 || bytesProcessed === totalBytes) {
          self.postMessage({ 
            type: "progress", 
            progress: (bytesProcessed / totalBytes) * 0.9, 
            status: "Processing..." 
          });
        }
      }
    }

    // Final chunk
    processText(decoder.decode(new Uint8Array(0), { stream: false }));
    if (remainder) {
      parser.parseLine(remainder);
    }

    self.postMessage({ type: "progress", progress: 1.0, status: "Finalizing..." });
    self.postMessage({ type: "result", profile: parser.getProfile() });
  } catch (error) {
    self.postMessage({ type: "error", message: (error as Error).message });
  }
};
