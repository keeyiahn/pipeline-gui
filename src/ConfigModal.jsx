import React, { useState, useEffect, useRef } from 'react';
import Editor from "@monaco-editor/react";

export default function ConfigModal({ open, yamlText, onClose, onSave }) {
  const [text, setText] = useState(yamlText);
  const modalRef = useRef(null);

  // Load fresh YAML whenever opened
  useEffect(() => {
    if (open) setText(yamlText);
  }, [yamlText, open]);

  // ✅ ESC closes, Ctrl+S saves
  useEffect(() => {
    if (!open) return;

    const handleKey = (e) => {
      // ESC — close modal
      if (e.key === "Escape") {
        onClose();
      }

      // Ctrl+S / Cmd+S — save
      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();     // ✅ prevent browser Save As
        onSave(text);           // ✅ call save using current editor text
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);

  }, [open, text, onSave, onClose]);

  // Click outside closes modal
  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={handleOverlayClick}>
      <div style={styles.modal} ref={modalRef}>
        <h3>Vertex Configuration</h3>

        <Editor
          height="350px"
          language="yaml"
          theme="vs-dark"
          value={text}
          onChange={(value) => setText(value)}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            automaticLayout: true,
          }}
        />

        <div style={styles.row}>
          <button onClick={() => onSave(text)} style={styles.saveBtn}>Save</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: '#2e2e2e',
    padding: '20px',
    width: '450px',
    borderRadius: '6px',
    boxShadow: '0 0 20px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  row: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  saveBtn: {
    padding: '6px 12px',
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
