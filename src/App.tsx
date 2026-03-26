import { useState, useCallback, useMemo } from "react";
import "./App.css";
import { Dropzone } from "./components/Dropzone";
import { Dashboard } from "./components/Dashboard";
import {
  parseHeaptrack,
  getSummary,
  getFlamegraphData,
  getAllocationSummaries,
  getTimelineData,
} from "./utils/parser";
import type {
  HeaptrackSummary,
  HeaptrackProfile,
  FlamegraphNode,
  AllocationSummary,
  TimelinePoint,
} from "./utils/parser";

function App() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<HeaptrackProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo<HeaptrackSummary | null>(() => {
    if (!profile) return null;
    return getSummary(profile);
  }, [profile]);

  const flamegraphData = useMemo<FlamegraphNode | null>(() => {
    if (!profile) return null;
    return getFlamegraphData(profile);
  }, [profile]);

  const allocationSummaries = useMemo<AllocationSummary[] | null>(() => {
    if (!profile) return null;
    return getAllocationSummaries(profile);
  }, [profile]);

  const timelineData = useMemo<TimelinePoint[] | null>(() => {
    if (!profile) return null;
    return getTimelineData(profile);
  }, [profile]);

  const onFileLoaded = useCallback((file: File) => {
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;

      if (file.name.endsWith(".zst")) {
        const worker = new Worker(
          new URL("./workers/decompressor.worker.ts", import.meta.url),
          { type: "module" },
        );

        worker.onmessage = (event) => {
          if (event.data.error) {
            setError(`Decompression failed: ${event.data.error}`);
            setLoading(false);
          } else {
            const decompressedBuffer = event.data as ArrayBuffer;
            const text = new TextDecoder().decode(decompressedBuffer);
            try {
              setProfile(parseHeaptrack(text));
            } catch (err: unknown) {
              const errorMessage =
                err instanceof Error ? err.message : String(err);
              setError(`Parsing failed: ${errorMessage}`);
            }
            setLoading(false);
          }
          worker.terminate();
        };

        worker.onerror = (err) => {
          setError(`Worker error: ${err.message}`);
          setLoading(false);
          worker.terminate();
        };

        worker.postMessage(arrayBuffer, [arrayBuffer]);
      } else {
        // Assume plain text if not .zst
        const text = new TextDecoder().decode(arrayBuffer);
        try {
          setProfile(parseHeaptrack(text));
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setError(`Parsing failed: ${errorMessage}`);
        }
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read file");
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, []);

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h1>
            heaptrack <span>web ui</span>
          </h1>
        </div>
      </header>

      <main>
        {!profile && !loading && (
          <section id="upload">
            <Dropzone onFileLoaded={onFileLoaded} />
            {error && <div className="error-message">{error}</div>}
          </section>
        )}

        {loading && (
          <section id="loading">
            <div className="spinner"></div>
            <p>Decompressing and parsing profile...</p>
          </section>
        )}

        {profile && summary && !loading && (
          <Dashboard
            summary={summary}
            flamegraphData={flamegraphData}
            allocationSummaries={allocationSummaries}
            timelineData={timelineData}
            onReset={() => setProfile(null)}
          />
        )}
      </main>

      {!profile && <div className="ticks"></div>}

      {!profile && (
        <footer>
          <p>&copy; 2026 Heaptrack Web UI. Pure client-side memory analysis.</p>
        </footer>
      )}
    </div>
  );
}

export default App;
