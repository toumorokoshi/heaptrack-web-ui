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

  // Helper to get symbol name
  const getSymbolName = (symbolId: number) => {
    return profile.strings[symbolId] || `symbol@0x${symbolId.toString(16)}`;
  };

  // Build nodes for each trace
  // We need to process traces in an order that respects the parent-child relationship
  // but since we have parentTraceId, we can just build the tree.

  const getNodesForTrace = (traceId: number): FlamegraphNode[] => {
    if (traceId === 0) return [];
    if (traceToNodes.has(traceId)) return traceToNodes.get(traceId)!;

    const trace = profile.traces[traceId];
    if (!trace) return [];

    const instruction = profile.instructions[trace.instructionId];
    if (!instruction) return [];

    // Instruction frames are inner-to-outer.
    // In flamegraph, we want outer-to-inner.
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

  // Assign allocation values to the innermost node of each trace
  for (const [traceId, size] of traceAllocations.entries()) {
    const nodes = getNodesForTrace(traceId);
    if (nodes.length > 0) {
      nodes[nodes.length - 1].value += size;
    }
  }

  // Link nodes according to hierarchy
  for (let i = 1; i < profile.traces.length; i++) {
    const trace = profile.traces[i];
    if (!trace) continue;

    const nodes = getNodesForTrace(i);
    if (nodes.length === 0) continue;

    // Link inlined frames within the same instruction
    for (let j = 0; j < nodes.length - 1; j++) {
      if (!nodes[j].children.includes(nodes[j + 1])) {
        nodes[j].children.push(nodes[j + 1]);
      }
    }

    // Link the outermost frame of this trace to the innermost frame of the parent trace
    const parentTraceId = trace.parentTraceId;
    let parentNode: FlamegraphNode;

    if (parentTraceId === 0) {
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

  // Propagate values up the tree
  const propagate = (node: FlamegraphNode): number => {
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
    if (traceId === 0) continue;
    const trace = profile.traces[traceId];
    if (!trace) continue;
    const instruction = profile.instructions[trace.instructionId];
    if (!instruction) continue;

    // Use the innermost frame for the primary description
    const frame = instruction.frames[0];
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
