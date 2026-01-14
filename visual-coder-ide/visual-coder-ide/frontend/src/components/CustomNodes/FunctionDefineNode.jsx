import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow'; // 1. Import useReactFlow
import './NodeStyles.css';

const FunctionDefineNode = ({ id, data }) => {
  // 2. Get setNodes from the React Flow context
  const { setNodes } = useReactFlow();

  const handleChange = (e) => {
    data.updateNodeData(id, { [e.target.name]: e.target.value });
  };

  // 3. Create the delete handler
  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="custom-node border-purple-500" style={{ position: 'relative' }}>
      {/* 4. The Close Button */}
      <button 
        onClick={handleDelete}
        className="nodrag" // Prevents dragging logic from interfering with the click
        style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 10
        }}
        title="Delete Node"
      >
        ×
      </button>

      <div className="custom-node-header text-purple-400">Define Function</div>
      <div className="custom-node-content">
        <label className="custom-node-label">Function Name</label>
        <input
          name="name"
          type="text"
          defaultValue={data.name}
          onChange={handleChange}
          className="custom-node-input"
        />
        <label className="custom-node-label">
          Parameters
          <span className="node-tooltip">e.g., int count, String msg</span>
        </label>
        <textarea
          name="params"
          defaultValue={data.params}
          onChange={handleChange}
          className="custom-node-input"
          rows={2}
        />
      </div>
      <Handle type="source" position={Position.Right} id="body" style={{ top: '60%', background: '#60A5FA' }} />
      <div className='text-xs text-blue-400' style={{position: 'absolute', right: -35, top: '57%'}}>Body</div>
    </div>
  );
};

export default FunctionDefineNode;