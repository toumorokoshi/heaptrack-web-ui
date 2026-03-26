export interface HeaptrackProfile {
  version: string;
  command: string;
  strings: string[];
  instructions: Instruction[];
  traces: Trace[];
  allocations: AllocationEvent[];
}

export interface InstructionFrame {
  symbolId: number;
  fileId?: number;
  line?: number;
}

export interface Instruction {
  ip: string;
  moduleId: number;
  frames: InstructionFrame[];
}

export interface Trace {
  instructionId: number;
  parentTraceId: number;
}

export interface AllocationEvent {
  type: "alloc" | "free";
  address: string;
  size?: number;
  traceId?: number;
}

export interface HeaptrackSummary {
  version: string;
  command: string;
  symbols: number;
  instructions: number;
  traces: number;
  allocations: number;
  frees: number;
}

export function parseHeaptrack(data: string): HeaptrackProfile {
  const lines = data.split("\n");
  const profile: HeaptrackProfile = {
    version: "unknown",
    command: "unknown",
    strings: [""], // 1-based indexing for strings
    instructions: [null as unknown as Instruction], // 1-based indexing
    traces: [null as unknown as Trace], // 1-based indexing
    allocations: [],
  };

  let lastAlloc: { size: number; traceId: number } | null = null;

  for (const line of lines) {
    if (!line) continue;
    const parts = line.split(" ");
    const type = parts[0];

    switch (type) {
      case "v":
        profile.version = parts.slice(1).join(" ");
        break;
      case "X":
        profile.command = parts.slice(1).join(" ");
        break;
      case "s": {
        // s length string
        const lengthStr = parts[1];
        if (lengthStr !== undefined) {
          // length is provided in hex but not used for string slicing because substring(indexOf) is safer
          // const length = parseInt(lengthStr, 16);
          // Use substring to get the string, it might contain spaces
          const string = line.substring(parts[0].length + lengthStr.length + 2);
          profile.strings.push(string);
        }
        break;
      }
      case "i": {
        // i IP module_id [symbol_id file_id line]*
        const ip = parts[1];
        const moduleId = parseInt(parts[2], 16);
        const frames: InstructionFrame[] = [];
        for (let i = 3; i < parts.length; i += 3) {
          const symbolId = parseInt(parts[i], 16);
          const fileId = parts[i + 1] ? parseInt(parts[i + 1], 16) : undefined;
          const lineNum = parts[i + 2] ? parseInt(parts[i + 2], 16) : undefined;
          frames.push({ symbolId, fileId, line: lineNum });
        }
        profile.instructions.push({ ip, moduleId, frames });
        break;
      }
      case "t": {
        // t instruction_id parent_trace_id
        const instructionId = parseInt(parts[1], 16);
        const parentTraceId = parseInt(parts[2], 16);
        profile.traces.push({ instructionId, parentTraceId });
        break;
      }
      case "a": {
        // a size trace_id
        const size = parseInt(parts[1], 16);
        const traceId = parseInt(parts[2], 16);
        lastAlloc = { size, traceId };
        break;
      }
      case "+": {
        // + address
        const address = parts[1];
        if (lastAlloc) {
          profile.allocations.push({
            type: "alloc",
            address,
            size: lastAlloc.size,
            traceId: lastAlloc.traceId,
          });
          lastAlloc = null;
        }
        break;
      }
      case "-": {
        // - address
        const address = parts[1];
        profile.allocations.push({ type: "free", address });
        break;
      }
    }
  }

  return profile;
}

// Keep the old summary function for compatibility if needed, or update it
export function getSummary(profile: HeaptrackProfile): HeaptrackSummary {
  return {
    version: profile.version,
    command: profile.command,
    symbols: profile.strings.length - 1,
    instructions: profile.instructions.length - 1,
    traces: profile.traces.length - 1,
    allocations: profile.allocations.filter((a) => a.type === "alloc").length,
    frees: profile.allocations.filter((a) => a.type === "free").length,
  };
}
