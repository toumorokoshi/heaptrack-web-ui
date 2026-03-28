export interface ParsingError {
  line: number;
  content: string;
  message: string;
}

export interface HeaptrackProfile {
  version: string;
  command: string;
  strings: string[];
  instructions: Instruction[];
  traces: Trace[];
  allocations: AllocationEvent[];
  errors: ParsingError[];
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
  timestamp: number;
}

export interface TimelinePoint {
  timestamp: number;
  heapUsage: number;
}

export interface HeaptrackSummary {
  version: string;
  command: string;
  symbols: number;
  instructions: number;
  traces: number;
  allocations: number;
  frees: number;
  errors: number;
}

export interface FlamegraphNode {
  name: string;
  value: number;
  children: FlamegraphNode[];
}

export interface AllocationSummary {
  traceId: number;
  symbolName: string;
  filePath?: string;
  line?: number;
  totalAllocated: number;
  peakAllocation: number;
  leaked: number;
}

function safeParseInt(value: string | undefined): number {
  if (value === undefined) return NaN;
  return parseInt(value, 16);
}

export function parseHeaptrack(
  data: string,
  onProgress?: (progress: number) => void,
): HeaptrackProfile {
  const parser = new HeaptrackParser();
  let start = 0;
  let end = data.indexOf("\n");
  let lineCount = 0;
  const approxTotalLines = data.length / 50; // heuristic

  while (end !== -1) {
    const line = data.substring(start, end);
    parser.parseLine(line);
    
    lineCount++;
    if (onProgress && lineCount % 10000 === 0) {
      onProgress(Math.min(0.99, (end / data.length)));
    }

    start = end + 1;
    end = data.indexOf("\n", start);
  }

  // Handle last line if it doesn't end with \n
  if (start < data.length) {
    parser.parseLine(data.substring(start));
  }

  if (onProgress) onProgress(1.0);
  return parser.getProfile();
}

export class HeaptrackParser {
  private profile: HeaptrackProfile;
  private lastAlloc: { size: number; traceId: number } | null = null;
  private currentTimestamp = 0;
  private lineIdx = 0;

  constructor() {
    this.profile = {
      version: "unknown",
      command: "unknown",
      strings: [""], // 1-based indexing for strings
      instructions: [null as unknown as Instruction], // 1-based indexing
      traces: [null as unknown as Trace], // 1-based indexing
      allocations: [],
      errors: [],
    };
  }

  public parseLine(line: string): void {
    this.lineIdx++;
    if (!line) return;
    const parts = line.split(" ");
    const type = parts[0];

    try {
      switch (type) {
        case "v":
          this.profile.version = parts.slice(1).join(" ");
          break;
        case "X":
          this.profile.command = parts.slice(1).join(" ");
          break;
        case "c": {
          const timestamp = safeParseInt(parts[1]);
          if (isNaN(timestamp)) {
            throw new Error(`Invalid timestamp: ${parts[1]}`);
          }
          this.currentTimestamp = timestamp;
          break;
        }
        case "s": {
          const lengthStr = parts[1];
          if (lengthStr !== undefined) {
            const string = line.substring(parts[0].length + lengthStr.length + 2);
            this.profile.strings.push(string);
          } else {
            throw new Error("Missing string length");
          }
          break;
        }
        case "i": {
          const ip = parts[1];
          if (!ip) throw new Error("Missing instruction pointer");
          const moduleId = safeParseInt(parts[2]);
          if (isNaN(moduleId)) throw new Error(`Invalid module ID: ${parts[2]}`);

          const frames: InstructionFrame[] = [];
          for (let i = 3; i < parts.length; i += 3) {
            const symbolId = safeParseInt(parts[i]);
            if (isNaN(symbolId)) throw new Error(`Invalid symbol ID: ${parts[i]}`);
            
            const fileId = parts[i + 1] ? safeParseInt(parts[i + 1]) : undefined;
            const lineNum = parts[i + 2] ? safeParseInt(parts[i + 2]) : undefined;
            frames.push({ symbolId, fileId, line: lineNum });
          }
          this.profile.instructions.push({ ip, moduleId, frames });
          break;
        }
        case "t": {
          const instructionId = safeParseInt(parts[1]);
          const parentTraceId = safeParseInt(parts[2]);
          if (isNaN(instructionId)) throw new Error(`Invalid instruction ID: ${parts[1]}`);
          if (isNaN(parentTraceId)) throw new Error(`Invalid parent trace ID: ${parts[2]}`);
          
          this.profile.traces.push({ instructionId, parentTraceId });
          break;
        }
        case "a": {
          const size = safeParseInt(parts[1]);
          const traceId = safeParseInt(parts[2]);
          if (isNaN(size)) throw new Error(`Invalid size: ${parts[1]}`);
          if (isNaN(traceId)) throw new Error(`Invalid trace ID: ${parts[2]}`);
          
          this.lastAlloc = { size, traceId };
          break;
        }
        case "+": {
          const address = parts[1];
          if (!address) throw new Error("Missing allocation address");
          if (this.lastAlloc) {
            this.profile.allocations.push({
              type: "alloc",
              address,
              size: this.lastAlloc.size,
              traceId: this.lastAlloc.traceId,
              timestamp: this.currentTimestamp,
            });
          } else {
            this.profile.errors.push({
              line: this.lineIdx,
              content: line,
              message: "Allocation (+) without preceding size record (a)",
            });
          }
          break;
        }
        case "-": {
          const address = parts[1];
          if (!address) throw new Error("Missing free address");
          this.profile.allocations.push({
            type: "free",
            address,
            timestamp: this.currentTimestamp,
          });
          break;
        }
      }
    } catch (err) {
      this.profile.errors.push({
        line: this.lineIdx,
        content: line,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  public getProfile(): HeaptrackProfile {
    return this.profile;
  }
}

export function getTimelineData(profile: HeaptrackProfile): TimelinePoint[] {
  const timeline: TimelinePoint[] = [];
  let currentHeapUsage = 0;
  const addressToSize = new Map<string, number>();

  for (const alloc of profile.allocations) {
    if (alloc.type === "alloc") {
      const size = alloc.size || 0;
      addressToSize.set(alloc.address, size);
      currentHeapUsage += size;
    } else {
      const size = addressToSize.get(alloc.address) || 0;
      currentHeapUsage -= size;
      addressToSize.delete(alloc.address);
    }

    if (
      timeline.length > 0 &&
      timeline[timeline.length - 1].timestamp === alloc.timestamp
    ) {
      timeline[timeline.length - 1].heapUsage = currentHeapUsage;
    } else {
      timeline.push({
        timestamp: alloc.timestamp,
        heapUsage: currentHeapUsage,
      });
    }
  }

  return timeline;
}

export function getSummary(profile: HeaptrackProfile): HeaptrackSummary {
  return {
    version: profile.version,
    command: profile.command,
    symbols: Math.max(0, profile.strings.length - 1),
    instructions: Math.max(0, profile.instructions.length - 1),
    traces: Math.max(0, profile.traces.length - 1),
    allocations: profile.allocations.filter((a) => a.type === "alloc").length,
    frees: profile.allocations.filter((a) => a.type === "free").length,
    errors: profile.errors.length,
  };
}

export function getFlamegraphData(profile: HeaptrackProfile): FlamegraphNode {
  const traceAllocations = new Map<number, number>();
  for (const alloc of profile.allocations) {
    if (
      alloc.type === "alloc" &&
      alloc.traceId !== undefined &&
      alloc.size !== undefined
    ) {
      traceAllocations.set(
        alloc.traceId,
        (traceAllocations.get(alloc.traceId) || 0) + alloc.size,
      );
    }
  }

  const root: FlamegraphNode = { name: "all", value: 0, children: [] };
  const traceToNodes = new Map<number, FlamegraphNode[]>();

  const getSymbolName = (symbolId: number) => {
    return profile.strings[symbolId] || `symbol@0x${symbolId.toString(16)}`;
  };

  const getNodesForTrace = (traceId: number): FlamegraphNode[] => {
    if (traceId <= 0 || traceId >= profile.traces.length) return [];
    if (traceToNodes.has(traceId)) return traceToNodes.get(traceId)!;

    const trace = profile.traces[traceId];
    if (!trace) return [];

    const instruction =
      trace.instructionId > 0 && trace.instructionId < profile.instructions.length
        ? profile.instructions[trace.instructionId]
        : null;
    if (!instruction) return [];

    const nodes: FlamegraphNode[] = instruction.frames
      .slice()
      .reverse()
      .map((frame) => ({
        name: getSymbolName(frame.symbolId),
        value: 0,
        children: [],
      }));

    traceToNodes.set(traceId, nodes);
    return nodes;
  };

  for (const [traceId, size] of traceAllocations.entries()) {
    const nodes = getNodesForTrace(traceId);
    if (nodes.length > 0) {
      nodes[nodes.length - 1].value += size;
    }
  }

  for (let i = 1; i < profile.traces.length; i++) {
    const trace = profile.traces[i];
    if (!trace) continue;

    const nodes = getNodesForTrace(i);
    if (nodes.length === 0) continue;

    for (let j = 0; j < nodes.length - 1; j++) {
      if (!nodes[j].children.includes(nodes[j + 1])) {
        nodes[j].children.push(nodes[j + 1]);
      }
    }

    const parentTraceId = trace.parentTraceId;
    let parentNode: FlamegraphNode;

    if (parentTraceId === i) {
      parentNode = root;
    } else if (parentTraceId <= 0) {
      parentNode = root;
    } else {
      const parentNodes = getNodesForTrace(parentTraceId);
      if (parentNodes.length > 0) {
        parentNode = parentNodes[parentNodes.length - 1];
      } else {
        parentNode = root;
      }
    }

    if (!parentNode.children.includes(nodes[0])) {
      parentNode.children.push(nodes[0]);
    }
  }

  const visited = new Set<FlamegraphNode>();
  const propagate = (node: FlamegraphNode): number => {
    if (visited.has(node)) return 0;
    visited.add(node);

    const childrenValue = node.children.reduce(
      (sum, child) => sum + propagate(child),
      0,
    );
    node.value += childrenValue;
    return node.value;
  };

  propagate(root);

  return root;
}

export function getAllocationSummaries(
  profile: HeaptrackProfile,
): AllocationSummary[] {
  const addressToInfo = new Map<string, { size: number; traceId: number }>();
  const traceStats = new Map<
    number,
    { total: number; current: number; peak: number }
  >();

  for (const alloc of profile.allocations) {
    if (alloc.type === "alloc") {
      const { address, size = 0, traceId = 0 } = alloc;
      addressToInfo.set(address, { size, traceId });

      let stats = traceStats.get(traceId);
      if (!stats) {
        stats = { total: 0, current: 0, peak: 0 };
        traceStats.set(traceId, stats);
      }
      stats.total += size;
      stats.current += size;
      if (stats.current > stats.peak) {
        stats.peak = stats.current;
      }
    } else if (alloc.type === "free") {
      const info = addressToInfo.get(alloc.address);
      if (info) {
        const stats = traceStats.get(info.traceId);
        if (stats) {
          stats.current -= info.size;
        }
        addressToInfo.delete(alloc.address);
      }
    }
  }

  const summaries: AllocationSummary[] = [];
  for (const [traceId, stats] of traceStats.entries()) {
    if (traceId <= 0 || traceId >= profile.traces.length) continue;
    const trace = profile.traces[traceId];
    if (!trace) continue;
    const instruction =
      trace.instructionId > 0 && trace.instructionId < profile.instructions.length
        ? profile.instructions[trace.instructionId]
        : null;
    if (!instruction) continue;

    const frame = instruction.frames[0];
    if (!frame) continue;

    const symbolName =
      profile.strings[frame.symbolId] ||
      `symbol@0x${frame.symbolId.toString(16)}`;
    const filePath =
      frame.fileId !== undefined ? profile.strings[frame.fileId] : undefined;

    summaries.push({
      traceId,
      symbolName,
      filePath,
      line: frame.line,
      totalAllocated: stats.total,
      peakAllocation: stats.peak,
      leaked: stats.current,
    });
  }

  return summaries;
}

