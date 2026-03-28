import { useEffect, useRef } from "react";
import flamegraph from "d3-flame-graph";
import * as d3 from "d3";
import type { FlamegraphNode } from "../utils/parser";
import "./Flamegraph.css";

interface Props {
  data: FlamegraphNode;
}

export const Flamegraph = ({ data }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flamegraph-wrapper">
      <div ref={ref} className="flamegraph-container" />
    </div>
  );
};
