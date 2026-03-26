import React, { useState, useCallback } from "react";
import "./Dropzone.css";

interface DropzoneProps {
  onFileLoaded: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileLoaded(e.dataTransfer.files[0]);
      }
    },
    [onFileLoaded],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileLoaded(e.target.files[0]);
      }
    },
    [onFileLoaded],
  );

  return (
    <div
      className={`dropzone ${isDragging ? "dragging" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        type="file"
        id="file-input"
        style={{ display: "none" }}
        onChange={onInputChange}
        accept=".zst,.txt"
      />
      <div className="dropzone-content">
        <svg className="icon" role="presentation" aria-hidden="true">
          <use href="/icons.svg#documentation-icon"></use>
        </svg>
        <h2>Analyze Memory Profile</h2>
        <p>
          Drag and drop your <code>heaptrack.zst</code> or <code>.txt</code>{" "}
          file here
        </p>
        <button className="select-file-button">Select File</button>
      </div>
    </div>
  );
};
