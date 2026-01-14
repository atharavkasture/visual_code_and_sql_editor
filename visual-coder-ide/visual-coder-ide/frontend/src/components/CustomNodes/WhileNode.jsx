import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow'; // 1. Import useReactFlow
import './NodeStyles.css';

const WhileNode = ({ id, data }) => {
  // 2. Get setNodes from the React Flow context
  const { setNodes } = useReactFlow();

  const handleChange = (e) => {
    data.updateNodeData(id, { condition: e.target.value });
  };

  // 3. Create the delete handler
  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="custom-node" style={{ position: 'relative' }}>
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

      <Handle type="target" position={Position.Top} />
      <div className="custom-node-header">While Loop</div>
      <div className="custom-node-content">
        <label className="custom-node-label">Condition</label>
        <input
          name="condition"
          type="text"
          defaultValue={data.condition}
          onChange={handleChange}
          className="custom-node-input"
        />
      </div>
      <Handle type="source" position={Position.Right} id="loopBody" style={{ top: '50%', background: '#60A5FA' }} />
      <div className='text-xs text-blue-400' style={{position: 'absolute', right: -55, top: '45%'}}>Loop Body</div>

      <Handle type="source" position={Position.Bottom} id="next" style={{ left: '50%'}} />
    </div>
  );
};

export default WhileNode;