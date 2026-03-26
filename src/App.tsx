import { useState, useCallback, useMemo } from "react";
import "./App.css";
import { Dropzone } from "./components/Dropzone";
import { parseHeaptrack } from "./utils/parser";
import type { HeaptrackSummary } from "./utils/parser";

function App() {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo<HeaptrackSummary | null>(() => {
    if (!profileData) return null;
    return parseHeaptrack(profileData);
  }, [profileData]);

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
            setProfileData(text);
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
        setProfileData(text);
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
        {!profileData && !loading && (
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

        {profileData && summary && !loading && (
          <section id="dashboard">
            <div className="success-banner">
              <h2>Profile Loaded Successfully</h2>
              <p>Command: {summary.command}</p>
              <button onClick={() => setProfileData(null)}>
                Load Another File
              </button>
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <h3>Version</h3>
                <div className="value">{summary.version}</div>
              </div>
              <div className="summary-card">
                <h3>Allocations</h3>
                <div className="value">
                  {summary.allocations.toLocaleString()}
                </div>
              </div>
              <div className="summary-card">
                <h3>Frees</h3>
                <div className="value">{summary.frees.toLocaleString()}</div>
              </div>
              <div className="summary-card">
                <h3>Symbols</h3>
                <div className="value">{summary.symbols.toLocaleString()}</div>
              </div>
            </div>

            <pre className="raw-output">{profileData.slice(0, 1000)}...</pre>
          </section>
        )}
      </main>

      <div className="ticks"></div>

      <footer>
        <p>&copy; 2026 Heaptrack Web UI. Pure client-side memory analysis.</p>
      </footer>
    </div>
  );
}

export default App;
