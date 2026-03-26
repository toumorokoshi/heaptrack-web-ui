import { render, screen, fireEvent } from "@testing-library/react";
import { TopAllocationsTable } from "./TopAllocationsTable";
import { describe, it, expect } from "vitest";
import type { AllocationSummary } from "../utils/parser";

const mockSummaries: AllocationSummary[] = [
  {
    traceId: 1,
    symbolName: "func1",
    totalAllocated: 1000,
    peakAllocation: 800,
    leaked: 500,
    filePath: "file1.cpp",
    line: 10,
  },
  {
    traceId: 2,
    symbolName: "func2",
    totalAllocated: 2000,
    peakAllocation: 1500,
    leaked: 200,
    filePath: "file2.cpp",
    line: 20,
  },
];

describe("TopAllocationsTable", () => {
  it("renders the table with data", () => {
    render(<TopAllocationsTable summaries={mockSummaries} />);

    expect(screen.getByText("func1")).toBeInTheDocument();
    expect(screen.getByText("func2")).toBeInTheDocument();
    expect(screen.getByText("file1.cpp:10")).toBeInTheDocument();
    expect(screen.getByText("file2.cpp:20")).toBeInTheDocument();

    // Verify values are formatted (roughly)
    expect(screen.getByText(/1,000 B/i)).toBeInTheDocument();
    expect(screen.getByText(/1.95 KB/i)).toBeInTheDocument();
  });

  it("sorts by column when header is clicked", () => {
    render(<TopAllocationsTable summaries={mockSummaries} />);

    // Default sort is totalAllocated descending, so func2 should be first
    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveTextContent("func2");
    expect(rows[1]).toHaveTextContent("func1");

    // Click on leaked column
    fireEvent.click(screen.getByText(/Leaked/i));

    // Sort should be leaked descending, func1 (500) should be first
    const rowsAfterSort = screen.getAllByRole("row").slice(1);
    expect(rowsAfterSort[0]).toHaveTextContent("func1");
    expect(rowsAfterSort[1]).toHaveTextContent("func2");

    // Click again to toggle asc
    fireEvent.click(screen.getByText(/Leaked/i));
    const rowsAfterToggle = screen.getAllByRole("row").slice(1);
    expect(rowsAfterToggle[0]).toHaveTextContent("func2");
    expect(rowsAfterToggle[1]).toHaveTextContent("func1");
  });
});
