import { describe, it, expect } from "vitest";
import { parseHeaptrack, getFlamegraphData } from "./parser";

describe("parseHeaptrack", () => {
  it("should parse basic heaptrack data", () => {
    const data = `v 10500 3
X lelouch run -v
s 18 /home/yusuke/bin/lelouch
s f linux-vdso.so.1
s e _dl_start_user
i 7e3a9863719f 1 3
t 1 0
a 12000 1
+ 0
- 0`;
    const profile = parseHeaptrack(data);

    expect(profile.version).toBe("10500 3");
    expect(profile.command).toBe("lelouch run -v");
    expect(profile.strings).toEqual([
      "",
      "/home/yusuke/bin/lelouch",
      "linux-vdso.so.1",
      "_dl_start_user",
    ]);
    expect(profile.instructions).toHaveLength(2);
    expect(profile.instructions[1]).toEqual({
      ip: "7e3a9863719f",
      moduleId: 1,
      frames: [{ symbolId: 3, fileId: undefined, line: undefined }],
    });
    expect(profile.traces).toHaveLength(2);
    expect(profile.traces[1]).toEqual({ instructionId: 1, parentTraceId: 0 });
    expect(profile.allocations).toHaveLength(2);
    expect(profile.allocations[0]).toEqual({
      type: "alloc",
      address: "0",
      size: 0x12000,
      traceId: 1,
    });
    expect(profile.allocations[1]).toEqual({
      type: "free",
      address: "0",
    });
  });

  it("should handle inlined instructions", () => {
    const data = `s 1 symbol1
s 1 file1
s 1 symbol2
s 1 file2
i addr 1 1 2 78 3 4 79`;
    const profile = parseHeaptrack(data);
    expect(profile.instructions[1].frames).toHaveLength(2);
    expect(profile.instructions[1].frames[0]).toEqual({
      symbolId: 1,
      fileId: 2,
      line: 120,
    });
    expect(profile.instructions[1].frames[1]).toEqual({
      symbolId: 3,
      fileId: 4,
      line: 121,
    });
  });
});

describe("getFlamegraphData", () => {
  it("should build a hierarchical tree from profile", () => {
    const data = `v 1
X cmd
s 1 root_func
s 1 child_func
i 100 1 1
i 200 1 2
t 1 0
t 2 1
a 100 2
+ 0`;
    const profile = parseHeaptrack(data);
    const flameData = getFlamegraphData(profile);

    expect(flameData.name).toBe("all");
    expect(flameData.value).toBe(0x100);
    expect(flameData.children).toHaveLength(1);
    expect(flameData.children[0].name).toBe("root_func");
    expect(flameData.children[0].children).toHaveLength(1);
    expect(flameData.children[0].children[0].name).toBe("child_func");
    expect(flameData.children[0].children[0].value).toBe(0x100);
  });

  it("should handle inlined frames in flamegraph", () => {
    const data = `v 1
X cmd
s 1 outer
s 1 inner
i 100 1 2 0 0 1 0 0
t 1 0
a 50 1
+ 0`;
    // i IP module inner outer
    const profile = parseHeaptrack(data);
    const flameData = getFlamegraphData(profile);

    expect(flameData.children).toHaveLength(1);
    expect(flameData.children[0].name).toBe("outer");
    expect(flameData.children[0].children).toHaveLength(1);
    expect(flameData.children[0].children[0].name).toBe("inner");
    expect(flameData.children[0].children[0].value).toBe(0x50);
  });
});
