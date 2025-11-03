import React, { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState
} from 'reactflow';
import yaml from 'js-yaml';
import Sidebar from './Sidebar';
import ConfigModal from './ConfigModal';
import ExportModal from './ExportModal';
import 'reactflow/dist/style.css';

export default function App() {

  const [vertexTypes, setVertexTypes] = useState({
    input: {
      label: "Source",
      config: {
        scale: { min: 1 },
        source: { generator: {} }
      }
    },
    udf: {
      label: "UDF",
      config: {
        scale: { min: 1 },
        udf: {
          container: {
            image: "quay.io/numaio/numaflow-go/map-cat:stable",
            imagePullPolicy: "Always"
          }
        }
      }
    },
    output: {
      label: "Sink",
      config: {
        scale: { min: 1 },
        sink: { log: {} }
      }
    }
  });


  const initialNodes = [];
  const initialEdges = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalYaml, setModalYaml] = useState("");

  const [selectedType, setSelectedType] = useState(null);

  const [editingNodeId, setEditingNodeId] = useState(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportYaml, setExportYaml] = useState("");


  const showConfig = (type) => {
    setSelectedType(type);

    const cfg = vertexTypes[type].config;

    const doc = [{
      name: "<vertex-name>",
      ...cfg
    }];

    setModalYaml(yaml.dump(doc, { sortKeys: false }));
    setModalOpen(true);
  };

  const onConnect = useCallback(
    params => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const saveConfig = (yamlText) => {
    try {
      const parsed = yaml.load(yamlText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert("Invalid YAML format.");
        return;
      }

      const cfgObj = { ...parsed[0] };
      const nodeName = cfgObj.name;
      delete cfgObj.name;

      // ✅ CASE 1: Editing an instantiated node
      if (editingNodeId) {
        const oldId = editingNodeId;
        const newId = nodeName;  // extracted from YAML name

        setNodes(prev =>
          prev.map(n =>
            n.id === oldId
              ? { ...n, id: newId, data: { ...n.data, label: newId, config: cfgObj } }
              : n
          )
        );

        // ✅ Update edges that referenced old ID
        setEdges(prev =>
          prev.map(e => ({
            ...e,
            source: e.source === oldId ? newId : e.source,
            target: e.target === oldId ? newId : e.target
          }))
        );

        setEditingNodeId(null);
        setModalOpen(false);
        return;
      }


      // ✅ CASE 2: Editing a vertex type default
      setVertexTypes(prev => ({
        ...prev,
        [selectedType]: {
          ...prev[selectedType],
          config: cfgObj
        }
      }));

      setModalOpen(false);
    } catch (err) {
      alert("Invalid YAML: " + err.message);
    }
  };


  // Delete edge on right click
  const onEdgeRightClick = useCallback((event, edge) => {
    event.preventDefault();       // stop browser context menu
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  }, [setEdges]);

  const onNodeClick = (event, node) => {
    event.preventDefault();

    setEditingNodeId(node.id);   // ✅ track node being edited

    const cfg = JSON.parse(JSON.stringify(node.data.config));

    const doc = [{
      name: node.id,   // ✅ name is known for instances
      ...cfg
    }];

    setModalYaml(yaml.dump(doc, { sortKeys: false }));
    setModalOpen(true);
  };


  // Delete node on right click
  const onNodeRightClick = useCallback((event, node) => {
    event.preventDefault();  // stop browser context menu
    setNodes((nds) => nds.filter((n) => n.id !== node.id));
    setEdges((eds) =>
      eds.filter((e) => e.source !== node.id && e.target !== node.id)
    );
  }, [setNodes, setEdges]);

  // Allow dropping nodes onto the canvas
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = (event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const name = window.prompt("Enter vertex name:");
    if (!name || nodes.some(n => n.id === name)) return;

    const position = { x: event.clientX - 150, y: event.clientY };

    // Deep-ish copy of config to avoid accidental shared mutation
    const nodeConfig = JSON.parse(JSON.stringify(vertexTypes[type].config));

    const newNode = {
      id: name,
      data: { label: name, config: nodeConfig },
      position,
      type: type === "input" ? "input" : type === "output" ? "output" : undefined
    };

    setNodes(nds => [...nds, newNode]);
  };


  const exportGraph = () => {
    const vertices = nodes.map(n => ({
      name: n.id,
      ...JSON.parse(JSON.stringify(n.data.config))
    }));

    const edgesYaml = edges.map(e => ({
      from: e.source,
      to: e.target
    }));

    const pipeline = {
      apiVersion: "numaflow.numaproj.io/v1alpha1",
      kind: "Pipeline",
      metadata: { name: "<pipeline-name>" }, // placeholder, replaced in modal
      spec: { vertices, edges: edgesYaml }
    };

    const yamlText = yaml.dump(pipeline, { sortKeys: false });

    setExportYaml(yamlText);     // show preview
    setExportOpen(true);         // open modal
  };

  const downloadYaml = (pipelineName) => {
    const yamlWithName = exportYaml.replace(
      /name:\s*"<pipeline-name>"/,
      `name: ${pipelineName}`
    );

    const blob = new Blob([yamlWithName], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pipelineName}.yaml`;
    a.click();

    setExportOpen(false);
  };


  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>

      {/* ✅ Sidebar */}
      <Sidebar showConfig={showConfig} vertexTypes={vertexTypes}/>
      <ConfigModal
        open={modalOpen}
        yamlText={modalYaml}
        onSave={saveConfig}
      />
      <ExportModal
        open={exportOpen}
        yamlText={exportYaml}
        onClose={() => setExportOpen(false)}
        onDownload={downloadYaml}
      />
      {/* ✅ Canvas */}
      <div style={{ flex: 1 }}>
        <button
          onClick={exportGraph}
          style={{
            position: 'relative',
            zIndex: 10,
            top: 10,
            left: 20,
            padding: '8px 12px',
            fontSize: '14px'
          }}
        >
          Export pipeline
        </button>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeContextMenu={onEdgeRightClick}
            onNodeContextMenu={onNodeRightClick}
            onNodeClick={onNodeClick}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >

          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
