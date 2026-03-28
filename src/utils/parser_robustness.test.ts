import { describe, it, expect } from "vitest";
import { parseHeaptrack, getSummary } from "./parser";

describe("parseHeaptrack robustness", () => {
  it("should handle missing parts in a line", () => {
    const data = `v 1
X cmd
a 100
+ 10`;
    const profile = parseHeaptrack(data);
    expect(profile.errors).toHaveLength(2);
    expect(profile.errors[0].message).toContain("Invalid trace ID: undefined");
    expect(profile.errors[1].message).toBe("Allocation (+) without preceding size record (a)");
  });

  it("should handle invalid hex values", () => {
    const data = `v 1
X cmd
c xyz
a 100 1
+ 10`;
    const profile = parseHeaptrack(data);
    expect(profile.errors).toHaveLength(1);
    expect(profile.errors[0].message).toContain("Invalid timestamp: xyz");
  });

  it("should handle out of bounds indices gracefully in summary", () => {
    const data = `v 1
X cmd
t 1 99
a 100 1
+ 10`;
    const profile = parseHeaptrack(data);
    const summary = getSummary(profile);
    expect(summary.traces).toBe(1);
    expect(profile.traces[1].parentTraceId).toBe(0x99);
  });

  it("should handle + without a", () => {
    const data = `v 1
X cmd
+ 10`;
    const profile = parseHeaptrack(data);
    expect(profile.allocations).toHaveLength(0);
    expect(profile.errors).toHaveLength(1);
    expect(profile.errors[0].message).toBe("Allocation (+) without preceding size record (a)");
  });

  it("should handle malformed instruction frames", () => {
    const data = `v 1
X cmd
i addr xyz`; // Invalid module ID
    const profile = parseHeaptrack(data);
    expect(profile.errors).toHaveLength(1);
    expect(profile.errors[0].message).toContain("Invalid module ID: xyz");
  });

  it("should report line numbers correctly", () => {
    const data = `v 1
X cmd
invalid line
c 100`;
    parseHeaptrack(data);
    // 'invalid line' is not a recognized type, so it's ignored currently.
    // Let's test a recognized type with invalid data.
    const data2 = `v 1
X cmd
c invalid
+ 123`;
    const profile2 = parseHeaptrack(data2);
    expect(profile2.errors).toHaveLength(2);
    expect(profile2.errors[0].line).toBe(3);
    expect(profile2.errors[1].line).toBe(4); // + without a
  });
});

import { getFlamegraphData, getAllocationSummaries } from "./parser";

describe("parser downstream robustness", () => {
  it("getFlamegraphData should handle out-of-bounds trace ID", () => {
    const data = `v 1
X cmd
a 100 99
+ 10`;
    const profile = parseHeaptrack(data);
    const flameData = getFlamegraphData(profile);
    expect(flameData.value).toBe(0); // Trace 0x99 (153) is missing
  });

  it("getAllocationSummaries should handle missing instructions", () => {
    const data = `v 1
X cmd
t 1 0
a 100 1
+ 10`;
    const profile = parseHeaptrack(data);
    const summaries = getAllocationSummaries(profile);
    expect(summaries).toHaveLength(0); // Trace 1 has missing instruction
  });

  it("getFlamegraphData should handle parentTraceId cycle (to itself)", () => {
    const data = `v 1
X cmd
s 1 sym
i addr 1 1
t 1 1
a 100 1
+ 10`;
    const profile = parseHeaptrack(data);
    const flameData = getFlamegraphData(profile);
    // This could potentially cause infinite recursion if not careful.
    // My current implementation of getNodesForTrace uses traceToNodes map to prevent recursion.
    // Since it points to itself and not root (0), it's unreachable from root.
    expect(flameData.children).toHaveLength(0);
  });
});
