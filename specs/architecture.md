# Architecture Design

## Overview
The Heaptrack Web UI is designed as a fully client-side application to ensure user data privacy and eliminate the need for a backend server. Users can load large memory profiling files directly into their browser for visualization and analysis.

## Tech Stack
-   **Framework**: React (functional components, hooks) initialized via Vite for fast development and optimized production builds.
-   **Routing**: `react-router-dom` for client-side navigation between different views (e.g., Flamegraph, Top Allocations, Summary).
-   **Styling**: Vanilla CSS, focusing on CSS Variables, Flexbox/CSS Grid, and modern properties to achieve a premium, Dark Mode-first glassmorphic aesthetic.
-   **Data Parsing**:
    -   Since heaptrack output is compressed with zstd (`.zst`), we will utilize a client-side WebAssembly library (such as `fzstd` or `zstd-codec`) to stream and decompress the file contents in the browser.
    -   The parsing logic will strictly adhere to functional programming principles, taking raw string/binary buffer chunks and mapping them to immutable data structures capturing allocations, frees, and call stacks.
-   **Visualization**: D3.js paired with specialized libraries (like `d3-flame-graph`) to render memory allocation flamegraphs efficiently on the DOM, alongside standard HTML tables for list views.

## Data Flow
1.  **Input Layer**: User drags and drops a `heaptrack.zst` file into the dropzone.
2.  **Processing Layer**: A Web Worker or an async streaming function decompresses the zstd blob and passes it to the Heaptrack Parser.
3.  **State Management**: The parsed profile data structure is committed to a top-level React Context.
4.  **Presentation Layer**: Various components (Flamegraph, Leak Detector, Allocations List) consume the context to render interactive visualizations.
