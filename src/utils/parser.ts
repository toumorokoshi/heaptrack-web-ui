export interface HeaptrackSummary {
  version: string;
  command: string;
  symbols: number;
  instructions: number;
  traces: number;
  allocations: number;
  frees: number;
}

export function parseHeaptrack(data: string): HeaptrackSummary {
  const lines = data.split("\n");
  const summary: HeaptrackSummary = {
    version: "unknown",
    command: "unknown",
    symbols: 0,
    instructions: 0,
    traces: 0,
    allocations: 0,
    frees: 0,
  };

  for (const line of lines) {
    if (line.startsWith("v ")) {
      summary.version = line.substring(2);
    } else if (line.startsWith("X ")) {
      summary.command = line.substring(2);
    } else if (line.startsWith("s ")) {
      summary.symbols++;
    } else if (line.startsWith("i ")) {
      summary.instructions++;
    } else if (line.startsWith("t ")) {
      summary.traces++;
    } else if (line.startsWith("a ")) {
      summary.allocations++;
    } else if (line.startsWith("+ ")) {
      summary.allocations++;
    } else if (line.startsWith("- ")) {
      summary.frees++;
    }
  }

  return summary;
}
