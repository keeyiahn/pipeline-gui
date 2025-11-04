import React, { useState, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import yaml from "js-yaml";

export default function TemplateModal({ open, defaultYaml, isEditing, templateName, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [yamlText, setYamlText] = useState(defaultYaml);

  useEffect(() => {
    setYamlText(defaultYaml);

    if (isEditing && templateName) {
      setName(templateName);     // ✅ Show template name being edited
    } else {
      setName("");               // ✅ New template starts empty
    }

  }, [defaultYaml, open, isEditing, templateName]);

  if (!open) return null;

  const handleKeyDown = (e) => {
    if (e.key === "Escape") onClose();
  };

  const saveTemplate = () => {
    if (!name.trim()) {
      alert("Template name required");
      return;
    }

    try {
      const parsed = yaml.load(yamlText);

      if (!parsed || typeof parsed !== "object") {
        alert("YAML must be a config object (no name field).");
        return;
      }

      // ✅ return templateName AND parsed config
      onCreate(name.trim(), parsed);
      onClose();

    } catch (e) {
      alert("Invalid YAML: " + e.message);
    }
  };

  return (
    <div style={styles.overlay} onKeyDown={handleKeyDown} tabIndex={0}>
      <div style={styles.modal}>
        <h3>
          {isEditing
            ? `Edit template`
            : "Create New Vertex Template"}
        </h3>

        <label style={styles.label}>Template Name</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., generatorSource"
        />

        <Editor
          height="300px"
          language="yaml"
          theme="vs-dark"
          value={yamlText}
          onChange={(val) => setYamlText(val)}
          options={{ minimap: { enabled: false }, fontSize: 13 }}
        />

        <div style={styles.row}>
          <button style={styles.saveBtn} onClick={saveTemplate}>
            {isEditing ? "Save Changes" : "Create Template"}
          </button>
          <button style={styles.closeBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}



const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 2000
  },
  modal: {
    background: '#2e2e2e',
    color: 'white',
    padding: '18px',
    width: '520px',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  row: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
  saveBtn: { padding: '6px 12px', background: '#0d6efd', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' },
  closeBtn: { padding: '6px 12px', background: '#777', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }
};
