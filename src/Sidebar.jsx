import React from 'react';

const Sidebar = ({ showConfig, vertexTypes }) => {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>Vertices</div>

      {Object.entries(vertexTypes).map(([key, info]) => (
        <div
          key={key}
          onClick={() => showConfig(key)}
          onDragStart={(e) => {
            e.dataTransfer.setData('application/reactflow', key);
            e.dataTransfer.effectAllowed = 'move';
          }}
          draggable
          style={styles.item}
          onMouseEnter={(e) => e.currentTarget.style.background = '#e7efff'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
        >
          {info.label}
        </div>
      ))}
    </aside>
  );
};

// ✅ Modern sidebar styles
const styles = {
  sidebar: {
    width: '180px',
    background: 'white',
    borderRight: '1px solid #dddddd',
    display: 'flex',
    flexDirection: 'column',
    padding: '12px',
    gap: '8px',
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px'
  },
  header: {
    fontWeight: '600',
    fontSize: '15px',
    marginBottom: '6px',
    color: '#333'
  },
  item: {
    padding: '8px 10px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #d3d3d3',
    cursor: 'grab',
    transition: '0.15s',
    userSelect: 'none',
    color: '#333'
  }
};

export default Sidebar;
