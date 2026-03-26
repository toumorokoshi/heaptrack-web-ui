# heaptrack-web-ui

A fully client-side React web UI for visualizing `heaptrack` memory profiles.
Features include drag-and-drop parsing of `.zst` files, d3-powered flamegraphs, and top allocation forensics delivered in a premium dark mode aesthetic.

## High-Level Design

### Architecture

The application is built as a pure client-side web application using React.

- **No Backend**: To ensure privacy and fast interactions, memory profile files are loaded and parsed directly within the browser.
- **Zstd Decompression**: As `heaptrack` files are heavily compressed (`.zst`), the UI utilizes a WebAssembly zstd codec to stream and parse data on the client.
- **Data Processing**: Parsed telemetry is converted into functional data structures, mapping allocations and call stacks to feed the visualizations.

### Core Features

- **Drag & Drop Upload**: Instant parsing of large `.zst` heap profile files directly in your browser.
- **Interactive Flamegraphs**: D3-driven hierarchical icicle/flamegraphs showing high-memory allocation paths visually.
- **Top Allocations & Leaks**: Sortable, detailed tables that point out exactly where memory was allocated, including function names and source locations.
- **Memory Timeline**: An area chart to track memory usage across the profiler's lifespan, enabling developers to identify spikes and gradual leaks.

## Documentation

- [Architecture Details](specs/architecture.md)
- [UI/UX Spec](specs/ui-design.md)
- [Features](specs/features.md)

## Development

### Prerequisites

- Node.js (v20+)
- `just` (optional, for easy task running)

### Setup

```bash
just install # or npm install
```

### Development

```bash
just dev      # or npm run dev
```

### Build

```bash
just build    # or npm run build
```

### Linting & Testing

```bash
just lint    # or npm run lint
just test    # or npm run test
just fix     # or npm run lint -- --fix and prettier
```

### CI

Continuous Integration is handled via GitHub Actions, running linting and tests on every push.
