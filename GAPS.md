# Gaps in Heaptrack Web UI

Based on the initial implementation of drag-and-drop and zstd decompression, the following gaps have been identified compared to the Features Specification:

## 1. Visualizations

- [ ] **Flamegraph**: Not yet implemented. Need to integrate `d3-flame-graph` with parsed data.
- [ ] **Memory Timeline Chart**: Not yet implemented. Need to extract timestamped allocation data.
- [ ] **Top Allocations Table**: Currently only a summary grid is shown. A detailed, sortable table is needed.

## 2. Parsing

- [ ] **Advanced Parsing**: The current parser only provides a summary (counts). It needs to build a full model of allocations, frees, and call stacks to feed the visualizations.
- [ ] **Instruction/Symbol Mapping**: Need to properly map instruction pointers to symbols and files.

## 3. UI/UX

- [ ] **Filtering/Search**: No way to filter allocations or search for specific symbols.
- [ ] **Responsive Design**: The dashboard needs to be fully responsive for different screen sizes.
- [ ] **File Size Limit**: Large files might crash the browser; need to ensure memory-efficient processing (possibly streaming or better worker management).

## 4. Production Readiness

- [ ] **Error Handling**: More robust error handling for malformed heaptrack files.
- [ ] **Progress Indicators**: Show actual decompression/parsing progress percentage.
- [ ] **PWA Support**: For offline analysis.
