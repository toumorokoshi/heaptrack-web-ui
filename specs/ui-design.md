# UI/UX Design Specification

## Core Principles

- **Client-Side Execution**: All processing happens locally.
- **Dark Mode**: Native, default dark theme to reduce eye strain, mapping colors to HSL variables for easy theming and contrast adjustments.
- **Reactive Design**: Responsive layout that scales gracefully from large desktop monitors down to standard laptop screens, ensuring visualizations remain readable.

## Key Screens / Layoumt

### 1. The Dropzone (Landing)

- **Visuals**: A large, centered drop zone with a dashed border, glowing subtly on hover/drag-over.
- **Functionality**: Accepts `.zst` or `.gz` heaptrack files. Shows a parsed loading state (progress bar or spinner) as data is decompressed and analyzed in the background.

### 2. Main Dashboard Layout

- **Sidebar / Header**: Navigation links switching between 'Summary', 'Flamegraph', 'Top Allocations', and 'Memory Timeline'.
- **Content Area**: Generous padding, dark semi-transparent backgrounds for cards (content containers).

### 3. Visualizations

- **Flamegraph**: Interactive, zoomable blocks. Colors mapped to package names or allocation magnitude (e.g., hotter colors for larger memory footprints).
- **Data Tables**: Used for 'Top Allocations'. Sortable columns, sticky headers, monospaced font for memory addresses and byte sizes.

## Typography

- Clean sans-serif for UI elements.
- Strictly monospace for function names, file paths, and memory addresses.
