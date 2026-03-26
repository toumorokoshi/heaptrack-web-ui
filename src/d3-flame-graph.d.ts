declare module 'd3-flame-graph' {
  import { Selection, BaseType } from "d3";

  export interface FlamegraphChart {
    width(w: number): FlamegraphChart;
    cellHeight(h: number): FlamegraphChart;
    transitionDuration(d: number): FlamegraphChart;
    minFrameSize(s: number): FlamegraphChart;
    transitionEase(e: (t: number) => number): FlamegraphChart;
    sort(s: boolean): FlamegraphChart;
    (selection: Selection<BaseType, unknown, BaseType | null, unknown>): void;
  }

  function flamegraph(): FlamegraphChart;
  export default flamegraph;
}
