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
import TemplateModal from './TemplateModal';
import 'reactflow/dist/style.css';
import { importPipelineFromFile } from './utils/importPipeline';

export default function App() {

  const [vertexTypes, setVertexTypes] = useState({
    "generator-source": {
      config: {
        scale: { min: 1 },
        source: { generator: {} }
      }
    },
    "cat-udf": {
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
    "log-sink": {
      config: {
        scale: { min: 1 },
        sink: { log: {} }
      }
    }
  });

  const [reactFlowInstance, setReactFlowInstance] = useState(null);


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

  const [editingEdgeId, setEditingEdgeId] = useState(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateYaml, setTemplateYaml] = useState("");


  const editTemplate = (type) => {
    const cfg = vertexTypes[type].config;
    setTemplateYaml(yaml.dump(cfg, { sortKeys: false }));
    setSelectedType(type);
    setTemplateModalOpen(true);
  };

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, data: { conditions: null } }, eds)
      ),
    [setEdges]
  );

  const onEdgeClick = (event, edge) => {
    event.preventDefault();

    setEditingEdgeId(edge.id);

    const edgeYaml = [{
      from: edge.source,
      to: edge.target,
      ...(edge.data?.conditions ? { conditions: edge.data.conditions } : {})
    }];

    setModalYaml(yaml.dump(edgeYaml, { sortKeys: false }));
    setModalOpen(true);
  };



  const saveConfig = (yamlText) => {
    try {
      const parsed = yaml.load(yamlText);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert("Invalid YAML format.");
        return;
      }

      const cfgObj = { ...parsed[0] };
      const newNameFromYaml = cfgObj.name?.trim(); 

      // CASE 1: Creating a brand new template
      if (selectedType && !vertexTypes[selectedType]) {
        setVertexTypes(prev => ({
          ...prev,
          [selectedType]: {
            label: selectedType,
            config: cfgObj
          }
        }));

        setModalOpen(false);
        return;
      }

      // CASE 2: Editing an instantiated node
      if (editingNodeId) {
        if (!newNameFromYaml) {
          alert("YAML must include a 'name:' field.");
          return;
        }

        const oldId = editingNodeId;
        const newId = newNameFromYaml;

        // Prevent duplicate names
        if (nodes.some(n => n.id === newId && newId !== oldId)) {
          alert(`A vertex named "${newId}" already exists.`);
          return;
        }

        delete cfgObj.name;

        // Update node
        setNodes(prev =>
          prev.map(n =>
            n.id === oldId
              ? { ...n, id: newId, data: { ...n.data, label: newId, config: cfgObj } }
              : n
          )
        );

        // Update edges
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

      // CASE 2: Editing an edge
      if (editingEdgeId) {
        const newFrom = cfgObj.from;
        const newTo = cfgObj.to;
        const newConditions = cfgObj.conditions ?? null;
      
        setEdges((prev) =>
          prev.map((e) =>
            e.id === editingEdgeId
              ? {
                  ...e,
                  source: newFrom,
                  target: newTo,
                  data: newConditions ? { conditions: newConditions } : undefined,
                }
              : e
          )
        );

        setEditingEdgeId(null);
        setModalOpen(false);
        return;
      }

      // CASE 3: Editing vertex type defaults
      const nodeName = cfgObj.name;
      delete cfgObj.name;

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

    setEditingNodeId(node.id);   // track node being edited

    const cfg = JSON.parse(JSON.stringify(node.data.config));

    const doc = [{
      name: node.id,   // name is known for instances
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

    const baseName = type;   // template name becomes base prefix
    const regex = new RegExp(`^${baseName}-(\\d+)$`);

    // find highest N in existing nodes
    let maxN = 0;
    nodes.forEach(n => {
      const match = n.id.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxN) maxN = num;
      }
    });

    const newName = `${baseName}-${maxN + 1}`;   // auto-generate next name

    const position = reactFlowInstance.project({
      x: event.clientX,
      y: event.clientY
    });

  const config = vertexTypes[type].config;
  const nodeConfig = JSON.parse(JSON.stringify(config));

  // ✅ infer type from config
  let reactFlowType;
  if (config.source) reactFlowType = "input";
  else if (config.sink) reactFlowType = "output";
  else reactFlowType = undefined; // UDF / default


  const newNode = {
    id: newName,
    data: { label: newName, config: nodeConfig },
    position,
    type: reactFlowType
  };

    setNodes(nds => [...nds, newNode]);
  };



  const exportGraph = () => {
    const vertices = nodes.map(n => ({
      name: n.id,
      ...JSON.parse(JSON.stringify(n.data.config))
    }));

    const edgesYaml = edges.map(e => {
      const base = {
        from: e.source,
        to: e.target,
      };

      // If edge has stored conditions, include them in YAML
      if (e.data?.conditions) {
        base.conditions = e.data.conditions;
      }

      return base;
    });

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
      /name:\s*"?<pipeline-name>"?/,
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

  const createCustomTemplate = () => {
    setTemplateYaml("scale:\n  min: 1"); // starter config
    setSelectedType(null);
    setTemplateModalOpen(true);
  };

  const addTemplate = (name, configObj) => {
    setVertexTypes(prev => {
      const updated = { ...prev };

      // If editing and renamed template: remove old key
      if (selectedType && selectedType !== name) {
        delete updated[selectedType];
      }

      updated[name] = {
        label: name,
        config: configObj
      };

      return updated;
    });

    setSelectedType(null);
    setTemplateModalOpen(false);
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await importPipelineFromFile(file, setNodes, setEdges);
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };


  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>

      <Sidebar 
        editTemplate={editTemplate} 
        vertexTypes={vertexTypes}
        createCustomTemplate={createCustomTemplate}
      />
      <ConfigModal
        open={modalOpen}
        yamlText={modalYaml}
        isEdge={!!editingEdgeId}
        onSave={saveConfig}
        onClose={() => {
          setModalOpen(false);
          setEditingNodeId(null);
          setEditingEdgeId(null);
          setSelectedType(null);
        }}
      />
      <ExportModal
        open={exportOpen}
        yamlText={exportYaml}
        onClose={() => setExportOpen(false)}
        onDownload={downloadYaml}
      />
      <TemplateModal
        open={templateModalOpen}
        defaultYaml={templateYaml}
        isEditing={!!selectedType}
        templateName={selectedType}
        onClose={() => {
          setTemplateModalOpen(false);
          setSelectedType(null);
        }}
        onCreate={addTemplate}
      />
      {/* Canvas */}
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
        <input
          type="file"
          accept=".yaml,.yml"
          onChange={handleImport}
          style={{ position: "absolute", top: 10, right: 0, zIndex: 10 }}
        />


          <ReactFlow
            onInit={setReactFlowInstance}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeContextMenu={onEdgeRightClick}
            onNodeContextMenu={onNodeRightClick}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >

          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
