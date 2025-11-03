import React, { useState, useEffect } from 'react';

export default function ConfigModal({ open, yamlText, onClose, onSave }) {
  const [text, setText] = useState(yamlText);

  // Sync external changes
  useEffect(() => {
    setText(yamlText);
  }, [yamlText]);

  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Vertex Configuration</h3>
        <textarea
          style={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
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
    background: 'grey',
    padding: '20px',
    width: '450px',
    borderRadius: '6px',
    boxShadow: '0 0 20px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  textarea: {
    width: '100%',
    height: '250px',
    fontFamily: 'monospace',
    fontSize: '13px'
  },
  row: { display: 'flex', justifyContent: 'flex-end', gap: '10px' },
  saveBtn: { padding: '6px 12px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px' },
  closeBtn: { padding: '6px 12px', background: '#ccc', border: 'none', borderRadius: '4px' }
};
