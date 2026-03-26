# Feature Specification

## Core Features

### 1. Drag & Drop File Loading

- **Description**: Users can drag and drop a `heaptrack.zst` (or uncompressed heaptrack text file) into the application to begin analysis.
- **Implementation**: HTML5 Drag and Drop API, checking file extensions and kicking off a background Web Worker process to decompress and parse.

### 2. Flamegraph Visualization

- **Description**: The primary view for understanding the stack traces that allocate the most memory.
- **Implementation**: Utilizes `d3-flame-graph` or a custom D3 rendering logic to build a hierarchical icicle/flame graph based on the parsed AST of the `heaptrack` format. Hotter colors indicate larger allocations.

### 3. Top Allocations Table

- **Description**: A tabular view detailing the functions and call sites responsible for the largest memory allocations and most leaked memory.
- **Implementation**: Sortable Data Grid/Table showing "Total Allocated", "Peak Allocation", and "Leaked". Includes the symbol name and line number if available.

### 4. Memory Timeline Chart

- **Description**: A line area chart illustrating memory usage over time, helping to identify spikes, steady growth, or specific events.
- **Implementation**: A D3 or Recharts area component pulling timestamped allocation data from the initial parser phase.
