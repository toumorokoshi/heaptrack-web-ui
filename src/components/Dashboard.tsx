import React, { useState } from "react";
import "./Dashboard.css";
import { Flamegraph } from "./Flamegraph";
import { TopAllocationsTable } from "./TopAllocationsTable";
import { MemoryTimelineChart } from "./MemoryTimelineChart";
import type {
  HeaptrackSummary,
  FlamegraphNode,
  AllocationSummary,
  TimelinePoint,
  ParsingError,
} from "../utils/parser";

type Tab = "summary" | "flamegraph" | "allocations" | "timeline" | "errors";

interface DashboardProps {
  summary: HeaptrackSummary;
  flamegraphData: FlamegraphNode | null;
  allocationSummaries: AllocationSummary[] | null;
  timelineData: TimelinePoint[] | null;
  errors?: ParsingError[];
  onReset: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  summary,
  flamegraphData,
  allocationSummaries,
  timelineData,
  errors = [],
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  const renderContent = () => {
    switch (activeTab) {
      case "summary":
        return (
          <div className="tab-content fade-in">
            <div className="summary-grid">
              <div className="summary-card">
                <h3>Allocations</h3>
                <div className="value">
                  {summary.allocations.toLocaleString()}
                </div>
              </div>
              <div className="summary-card">
                <h3>Frees</h3>
                <div className="value">{summary.frees.toLocaleString()}</div>
              </div>
              <div className="summary-card">
                <h3>Symbols</h3>
                <div className="value">{summary.symbols.toLocaleString()}</div>
              </div>
              <div className="summary-card">
                <h3>Traces</h3>
                <div className="value">{summary.traces.toLocaleString()}</div>
              </div>
              {summary.errors > 0 && (
                <div className="summary-card error">
                  <h3>Errors</h3>
                  <div className="value">{summary.errors.toLocaleString()}</div>
                </div>
              )}
            </div>
            <div className="profile-details-card">
              <h3>Profile Info</h3>
              <p>
                <strong>Command:</strong> <code>{summary.command}</code>
              </p>
              <p>
                <strong>Version:</strong> <code>{summary.version}</code>
              </p>
              <button className="reset-button" onClick={onReset}>
                Load Another File
              </button>
            </div>
          </div>
        );
      case "flamegraph":
        return (
          <div className="tab-content fade-in">
            <div className="flamegraph-section">
              <h3>Allocation Flamegraph</h3>
              {flamegraphData ? (
                <Flamegraph data={flamegraphData} />
              ) : (
                <p>No flamegraph data available.</p>
              )}
            </div>
          </div>
        );
      case "allocations":
        return (
          <div className="tab-content fade-in">
            <div className="top-allocations-section">
              <h3>Top Allocations</h3>
              {allocationSummaries ? (
                <TopAllocationsTable summaries={allocationSummaries} />
              ) : (
                <p>No allocation data available.</p>
              )}
            </div>
          </div>
        );
      case "timeline":
        return (
          <div className="tab-content fade-in">
            <div className="timeline-section">
              <h3>Memory Usage Timeline</h3>
              {timelineData && timelineData.length > 0 ? (
                <MemoryTimelineChart data={timelineData} />
              ) : (
                <p>No timeline data available.</p>
              )}
            </div>
          </div>
        );
      case "errors":
        return (
          <div className="tab-content fade-in">
            <div className="errors-section">
              <h3>Parsing Errors</h3>
              {errors.length > 0 ? (
                <div className="errors-list">
                  <table className="errors-table">
                    <thead>
                      <tr>
                        <th>Line</th>
                        <th>Message</th>
                        <th>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((err, i) => (
                        <tr key={i}>
                          <td>{err.line}</td>
                          <td className="error-msg">{err.message}</td>
                          <td><code>{err.content}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No parsing errors found.</p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <nav>
          <ul>
            <li
              className={activeTab === "summary" ? "active" : ""}
              onClick={() => setActiveTab("summary")}
            >
              <svg className="icon"><use href="/icons.svg#summary-icon"></use></svg>
              <span>Summary</span>
            </li>
            <li
              className={activeTab === "flamegraph" ? "active" : ""}
              onClick={() => setActiveTab("flamegraph")}
            >
              <svg className="icon"><use href="/icons.svg#flamegraph-icon"></use></svg>
              <span>Flamegraph</span>
            </li>
            <li
              className={activeTab === "allocations" ? "active" : ""}
              onClick={() => setActiveTab("allocations")}
            >
              <svg className="icon"><use href="/icons.svg#table-icon"></use></svg>
              <span>Top Allocations</span>
            </li>
            <li
              className={activeTab === "timeline" ? "active" : ""}
              onClick={() => setActiveTab("timeline")}
            >
              <svg className="icon"><use href="/icons.svg#chart-icon"></use></svg>
              <span>Memory Timeline</span>
            </li>
            {summary.errors > 0 && (
              <li
                className={activeTab === "errors" ? "active" : "has-errors"}
                onClick={() => setActiveTab("errors")}
              >
                <svg className="icon"><use href="/icons.svg#documentation-icon"></use></svg>
                <span>Errors ({summary.errors})</span>
              </li>
            )}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <button className="reset-button-small" onClick={onReset}>
             Close Profile
          </button>
        </div>
      </aside>
      <main className="dashboard-main">{renderContent()}</main>
    </div>
  );
};

