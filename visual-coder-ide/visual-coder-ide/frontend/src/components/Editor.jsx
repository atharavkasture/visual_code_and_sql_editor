import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  addEdge, 
  useNodesState, 
  useEdgesState, 
  Controls, 
  Background, 
  Panel 
} from 'reactflow';
import axios from 'axios';
import 'reactflow/dist/style.css';

// --- Components ---
import Sidebar from './Sidebar';
import ControlPanel from './ControlPanel';
import ChatbotWidget from './ChatbotWidget';
import { remapGraphIds } from '../utils/graphUtils'; 
import { runTour } from '../utils/tour'; 

// --- Custom Nodes ---
import AssignNode from './CustomNodes/AssignNode';
import AssignNode2 from './CustomNodes/AssignNode2';
import SwitchNode from './CustomNodes/SwitchNode';
import PrintNode from './CustomNodes/PrintNode';
import IfNode from './CustomNodes/IfNode';
import ForNode from './CustomNodes/ForNode';
import WhileNode from './CustomNodes/WhileNode';
import ArrayNode from './CustomNodes/ArrayNode';
import FunctionDefineNode from './CustomNodes/FunctionDefineNode';
import FunctionCallNode from './CustomNodes/FunctionCallNode';
import ClassNode from './CustomNodes/ClassNode';         // <--- Class Definition
import CreateObjectNode from './CustomNodes/CreateObjectNode'; // <--- Object Creation

const API_URL = 'http://localhost:3001/api';

const initialNodes = [
  { id: 'start', type: 'input', data: { label: 'Start' }, position: { x: 250, y: 5 }, deletable: false }
];

let id = 1;
const getId = () => `node_${id++}`;

// --- Icons ---
const HelpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

const ChatBubbleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const Editor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Helper to update node data from within the custom node component
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node));
  }, [setNodes]);

  // Memoize node types so ReactFlow doesn't re-render unnecessary parts
  const nodeTypes = useMemo(() => ({
      assign: (props) => <AssignNode {...props} data={{...props.data, updateNodeData}} />,
      assign2: (props) => <AssignNode2 {...props} data={{...props.data, updateNodeData}} />,
      switch: (props) => <SwitchNode {...props} data={{...props.data, updateNodeData}} />,
      array: (props) => <ArrayNode {...props} data={{...props.data, updateNodeData}} />,
      print: (props) => <PrintNode {...props} data={{...props.data, updateNodeData}} />,
      if: (props) => <IfNode {...props} data={{...props.data, updateNodeData}} />,
      for: (props) => <ForNode {...props} data={{...props.data, updateNodeData}} />,
      while: (props) => <WhileNode {...props} data={{...props.data, updateNodeData}} />,
      functionDefine: (props) => <FunctionDefineNode {...props} data={{...props.data, updateNodeData}} />,
      functionCall: (props) => <FunctionCallNode {...props} data={{...props.data, updateNodeData}} />,
      classDefine: (props) => <ClassNode {...props} data={{...props.data, updateNodeData}} />,
      createObject: (props) => <CreateObjectNode {...props} data={{...props.data, updateNodeData}} />,
    }), [updateNodeData]);

  // Handle connecting nodes
  const onConnect = useCallback((params) => {
      // Prevent duplicate edges between same handles
      setEdges((eds) => addEdge(params, eds.filter(e => !(e.target === params.target && e.targetHandle === params.targetHandle) && !(e.source === params.source && e.sourceHandle === params.sourceHandle))));
    }, [setEdges]);

  // Clear Canvas
  const onClear = useCallback(() => {
    if (window.confirm('Clear canvas?')) { setNodes(initialNodes); setEdges([]); id = 1; }
  }, [setNodes, setEdges]);

  // Handle Dropping items from Sidebar
  const onDrop = useCallback(async (event) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      const savedFunctionName = event.dataTransfer.getData('application/saved-function-name');
      
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      let newNodeData = { updateNodeData };
      
      // Handle Saved Functions (Drag from "Saved Functions" list)
      if (savedFunctionName) {
        try {
            const res = await axios.get(`${API_URL}/load-function/${encodeURIComponent(savedFunctionName)}`);
            const fd = res.data.functionData;
            newNodeData = { ...newNodeData, name: fd.name, args: fd.params ? fd.params.join(', ') : '', description: fd.desc || '' };
            
            // If dragging a definition that has a diagram attached, import the whole diagram
            if (!nodes.some(n => n.type === 'functionDefine' && n.data.name === fd.name) && fd.diagram) {
                const remapped = remapGraphIds(fd.diagram.nodes, fd.diagram.edges);
                setNodes(nds => [...nds, ...remapped.nodes.map(n => ({...n, position: {x: n.position.x+50, y: n.position.y+300}, data: {...n.data, updateNodeData}}))]);
                setEdges(eds => [...eds, ...remapped.edges]);
            }
        } catch (e) { 
            // Fallback if API fails
            newNodeData = { ...newNodeData, name: savedFunctionName, args: '' }; 
        }
      } else {
        // Handle Standard Toolbox Nodes (Default Values)
        newNodeData = { 
            ...newNodeData, 
            ...(type === 'assign' && { varName: 'x', value: '10', dataType: 'int' }), 
            ...(type === 'assign2' && { varName: 'x', value: '20' }), 
            ...(type === 'switch' && { switchVar: 'choice', cases: [] }), 
            ...(type === 'array' && { varName: 'arr', values: '1,2,3', dataType: 'int', declarationType: 'values', size: 5 }), 
            ...(type === 'if' && { condition: 'x > 5' }), 
            ...(type === 'for' && { varName: 'i', range: '10' }), 
            ...(type === 'while' && { condition: 'x > 0' }), 
            ...(type === 'functionDefine' && { name: 'myFunc', params: 'int a' }),
            ...(type === 'functionCall' && { name: 'myFunc', args: '10' }),
            ...(type === 'classDefine' && { className: 'MyClass' }),
            ...(type === 'createObject' && { varName: 'obj', className: 'MyClass', args: '' }) 
        };
      }

      setNodes((nds) => [...nds, { id: getId(), type, position, data: newNodeData }]);
    }, [reactFlowInstance, nodes, setNodes, updateNodeData]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden">
      {/* --- Header --- */}
      <header className="h-16 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800 tracking-wide">Visual Coder IDE</h1>
            <span className="text-gray-400 text-sm ml-2 hidden md:block">| Graph to Code</span>
        </div>
        <div className="flex items-center gap-3">
            <button id="header-help-btn" onClick={runTour} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition-all border border-gray-300 shadow-sm">
                <HelpIcon /><span>Help</span>
            </button>
            <button id="header-chat-btn" onClick={() => setIsChatOpen(!isChatOpen)} className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all border shadow-sm ${isChatOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}`}>
                <ChatBubbleIcon /><span>AI Assistant</span>
            </button>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <div className="flex-grow flex overflow-hidden">
        <ReactFlowProvider>
            <Sidebar onProjectLoad={(data) => { if (data) { setNodes(data.diagram.nodes); setEdges(data.diagram.edges); } }} />
            
            <div id="canvas-area" className="flex-grow h-full relative bg-gray-50 shadow-inner" onDragOver={event => event.preventDefault()} onDrop={onDrop}>
                <ReactFlow 
                    nodes={nodes} 
                    edges={edges} 
                    onNodesChange={onNodesChange} 
                    onEdgesChange={onEdgesChange} 
                    onConnect={onConnect} 
                    onInit={setReactFlowInstance} 
                    nodeTypes={nodeTypes} 
                    fitView 
                    className="bg-dots"
                >
                    <Controls className="bg-white border-gray-300 shadow-md text-gray-700" />
                    <Background color="#000000ff" gap={16} />
                    
                    <Panel position="top-right">
                        <button onClick={onClear} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded shadow transition-colors">
                            Clear All
                        </button>
                    </Panel>
                </ReactFlow>
                
                {/* Chatbot Overlay */}
                <ChatbotWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} nodes={nodes} setNodes={setNodes} />
            </div>
            
            {/* Output Panel (Right Side) */}
            <ControlPanel nodes={nodes} edges={edges} />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default Editor;