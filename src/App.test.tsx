import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseHeaptrack } from "./utils/parser";

// Mock Worker
class MockWorker {
  onmessage: ((ev: { data: Record<string, unknown> }) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  postMessage(message: { file: File }) {
    if (this.onmessage) {
      // Send progress first
      this.onmessage({
        data: { type: "progress", progress: 0.5, status: "Mock Parsing..." },
      });

      // Simulation: decode and parse
      const { file } = message;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const profile = parseHeaptrack(text);
        if (this.onmessage) {
          this.onmessage({
            data: {
              type: "result",
              profile: profile as unknown as Record<string, unknown>,
            },
          });
        }
      };
      reader.readAsText(file);
    }
  }
  terminate() {}
}

vi.stubGlobal("Worker", MockWorker);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the upload dropzone", () => {
    render(<App />);
    expect(screen.getByText(/Analyze Memory Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your/i)).toBeInTheDocument();
  });

  it("handles file selection", async () => {
    const { container } = render(<App />);
    const file = new File(["test data"], "heaptrack.txt", {
      type: "text/plain",
    });
    const input = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(
      () => {
        expect(screen.getByText(/Profile Info/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText(/^Allocations$/i)).toBeInTheDocument();
    expect(screen.getByText(/Symbols/i)).toBeInTheDocument();
  });

  it("handles zst file selection", async () => {
    const { container } = render(<App />);
    const file = new File(["v 1.0\nX test\n+ 1\ns symbol"], "heaptrack.zst", {
      type: "application/zstd",
    });
    const input = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(
      () => {
        expect(screen.getByText(/Profile Info/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText(/Command:/i)).toBeInTheDocument();
    expect(screen.getByText(/test/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1.0/i).length).toBeGreaterThanOrEqual(1);
  });
});
