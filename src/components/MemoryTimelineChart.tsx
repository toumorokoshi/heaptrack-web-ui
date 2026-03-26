import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TimelinePoint } from "../utils/parser";
import "./MemoryTimelineChart.css";

interface Props {
  data: TimelinePoint[];
}

export const MemoryTimelineChart = ({ data }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const margin = { top: 20, right: 30, bottom: 40, left: 70 };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.offsetWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.timestamp) as [number, number])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.heapUsage) || 0])
      .nice()
      .range([height, 0]);

    const area = d3
      .area<TimelinePoint>()
      .x((d) => x(d.timestamp))
      .y0(y(0))
      .y1((d) => y(d.heapUsage))
      .curve(d3.curveMonotoneX);

    const line = d3
      .line<TimelinePoint>()
      .x((d) => x(d.timestamp))
      .y((d) => y(d.heapUsage))
      .curve(d3.curveMonotoneX);

    // Add gradient
    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--accent-color, #a855f7)")
      .attr("stop-opacity", 0.6);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--accent-color, #a855f7)")
      .attr("stop-opacity", 0.1);

    // Add the area
    g.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area)
      .style("fill", "url(#area-gradient)");

    // Add the line
    g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line)
      .style("fill", "none")
      .style("stroke", "var(--accent-color, #a855f7)")
      .style("stroke-width", 2);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat((d) => formatTime(d as number)))
      .attr("class", "axis x-axis");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatBytes(d as number)))
      .attr("class", "axis y-axis");

    // Add gridlines
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(() => ""));

    // Add tooltips
    const tooltip = d3.select(container).append("div").attr("class", "tooltip").style("opacity", 0);

    const focus = g.append("g").attr("class", "focus").style("display", "none");

    focus.append("circle").attr("r", 5).style("fill", "var(--accent-color, #a855f7)");

    const bisect = d3.bisector<TimelinePoint, number>((d) => d.timestamp).left;

    g.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseover", () => {
        focus.style("display", null);
        tooltip.style("opacity", 1);
      })
      .on("mouseout", () => {
        focus.style("display", "none");
        tooltip.style("opacity", 0);
      })
      .on("mousemove", (event) => {
        const x0 = x.invert(d3.pointer(event)[0]);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.timestamp > (d1?.timestamp - x0 || Infinity) ? d1 : d0;
        if (!d) return;

        focus.attr("transform", `translate(${x(d.timestamp)},${y(d.heapUsage)})`);
        tooltip
          .html(`Time: ${formatTime(d.timestamp)}<br/>Usage: ${formatBytes(d.heapUsage)}`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      });

    const handleResize = () => {
      // Trigger re-render by effect
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      tooltip.remove();
    };
  }, [data, margin.left, margin.right, margin.top, margin.bottom]);

  return (
    <div className="timeline-chart-wrapper" ref={containerRef}>
      <svg
        ref={svgRef}
        width="100%"
        height="300"
        viewBox={`0 0 ${containerRef.current?.offsetWidth || 900} 300`}
        preserveAspectRatio="xMinYMin meet"
      />
    </div>
  );
};
