import React, { useState, useMemo } from "react";
import "./TopAllocationsTable.css";
import type { AllocationSummary } from "../utils/parser";

interface TopAllocationsTableProps {
  summaries: AllocationSummary[];
}

type SortKey = "totalAllocated" | "peakAllocation" | "leaked" | "symbolName";
type SortOrder = "asc" | "desc";

export const TopAllocationsTable: React.FC<TopAllocationsTableProps> = ({
  summaries,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("totalAllocated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const sortedSummaries = useMemo(() => {
    return [...summaries].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [summaries, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)).toLocaleString() +
      " " +
      sizes[i]
    );
  };

  const renderHeader = (label: string, key: SortKey) => (
    <th
      onClick={() => toggleSort(key)}
      className={sortKey === key ? "active-sort" : ""}
    >
      <div className="header-content">
        {label}
        {sortKey === key && (
          <span className="sort-indicator">
            {sortOrder === "asc" ? " ↑" : " ↓"}
          </span>
        )}
      </div>
    </th>
  );

  return (
    <div className="top-allocations-container">
      <table className="top-allocations-table">
        <thead>
          <tr>
            {renderHeader("Function", "symbolName")}
            {renderHeader("Total Allocated", "totalAllocated")}
            {renderHeader("Peak Allocation", "peakAllocation")}
            {renderHeader("Leaked", "leaked")}
          </tr>
        </thead>
        <tbody>
          {sortedSummaries.map((summary) => (
            <tr key={summary.traceId}>
              <td className="monospace">
                <div className="symbol-name" title={summary.symbolName}>
                  {summary.symbolName}
                </div>
                <div className="file-path">
                  {summary.filePath && (
                    <>
                      {summary.filePath}:{summary.line}
                    </>
                  )}
                </div>
              </td>
              <td className="monospace value">
                {formatBytes(summary.totalAllocated)}
              </td>
              <td className="monospace value">
                {formatBytes(summary.peakAllocation)}
              </td>
              <td className="monospace value">
                {formatBytes(summary.leaked)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
