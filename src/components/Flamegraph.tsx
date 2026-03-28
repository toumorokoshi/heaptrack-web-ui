import { useEffect, useRef, useState } from "react";
import flamegraph from "d3-flame-graph";
import * as d3 from "d3";
import type { FlamegraphNode } from "../utils/parser";
import "./Flamegraph.css";

interface Props {
  data: FlamegraphNode;
}

export const Flamegraph = ({ data }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (ref.current && data) {
      ref.current.innerHTML = "";

      const chart = flamegraph()
        .width(ref.current.offsetWidth || 960)
        .cellHeight(18)
        .transitionDuration(750)
        .minFrameSize(5)
        .transitionEase(d3.easeCubic)
        .sort(true);

      chartRef.current = chart;
      (d3.select(ref.current).datum(data) as any).call(chart);

      // Handle window resize
      const handleResize = () => {
        if (ref.current) {
          chart.width(ref.current.offsetWidth);
          (d3.select(ref.current).datum(data) as any).call(chart);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [data]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.search(searchTerm);
    }
  }, [searchTerm]);

  const clearSearch = () => {
    setSearchTerm("");
    if (chartRef.current) {
      chartRef.current.clear();
    }
  };

  return (
    <div className="flamegraph-wrapper">
      <div className="flamegraph-controls">
        <div className="search-box">
          <svg className="search-icon"><use href="/icons.svg#search-icon"></use></svg>
          <input
            type="text"
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={clearSearch}>
              &times;
            </button>
          )}
        </div>
        <div className="flamegraph-actions">
           <button className="action-button" onClick={() => chartRef.current?.resetZoom()}>
              Reset Zoom
           </button>
        </div>
      </div>
      <div ref={ref} className="flamegraph-container" />
    </div>
  );
};
