# New Issues Identified

Based on the initial dashboard implementation and existing gaps, the following new issues are proposed:

## 1. Implement Filtering and Search
- **Description**: Add a search bar to the Top Allocations table and a filter to the Flamegraph.
- **Goal**: Allow users to quickly find specific symbols or focus on specific memory ranges.
- **Priority**: High

## 2. Add Progress Indicators
- **Description**: Replace the generic spinner with a detailed progress bar during decompression and parsing.
- **Goal**: Give users better feedback, especially when processing large `.zst` profiles.
- **Priority**: Medium

## 3. Enhanced Error Handling and Large File Support
- **Description**: Improve the parser's robustness against malformed data and implement memory-efficient processing for files exceeding 100MB.
- **Goal**: Prevent browser crashes and provide clear error messages for invalid input.
- **Priority**: High

## 4. PWA Support for Offline Analysis
- **Description**: Add a manifest and service worker to allow the app to be installed and used offline.
- **Goal**: Ensure that once loaded, the tool can be used without an internet connection, reinforcing its "pure client-side" nature.
- **Priority**: Low
