import React, { useEffect, useState } from 'react';

export default function ExportModal({ open, yamlText, onClose, onDownload }) {
  const [name, setName] = useState("my-pipeline");

  useEffect(() => {
    // Reset name when opened
    setName("my-pipeline");
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Export Pipeline</h3>

        <label style={{ fontWeight: 'bold' }}>Pipeline Name:</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label style={{ fontWeight: 'bold', marginTop: 10 }}>Generated YAML:</label>
        <pre style={styles.preview}>{yamlText}</pre>

        <div style={styles.row}>
          <button style={styles.cancel} onClick={onClose}>Cancel</button>
          <button
            style={styles.download}
            onClick={() => onDownload(name)}
          >
            Download YAML
          </button>
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
    zIndex: 2000
  },
  modal: {
    background: '#2e2e2e',
    padding: '20px',
    width: '600px',
    borderRadius: '6px',
    maxHeight: '85vh',
    overflow: 'auto',
    fontFamily: 'monospace'
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    fontSize: '14px',
    marginBottom: 10
  },
  preview: {
    background: '#222',
    padding: '10px',
    borderRadius: '4px',
    maxHeight: '50vh',
    overflow: 'auto'
  },
  row: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  cancel: {
    padding: '6px 10px',
    marginRight: 10
  },
  download: {
    padding: '6px 10px',
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
