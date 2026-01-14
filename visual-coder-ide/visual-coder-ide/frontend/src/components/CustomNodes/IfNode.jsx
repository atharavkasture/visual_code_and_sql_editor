import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import './NodeStyles.css';

const IfNode = ({ id, data }) => {
  const { setNodes } = useReactFlow();

  const handleChange = (e) => {
    data.updateNodeData(id, { condition: e.target.value });
  };

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="custom-node" style={{ position: 'relative', minWidth: '180px' }}>
      
      {/* --- Delete Button --- */}
      <button 
        onClick={handleDelete}
        className="nodrag"
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

      {/* 1. INPUT CONNECTOR (Top) */}
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <div className="custom-node-header">If / Else</div>
      
      <div className="custom-node-content">
        <label className="custom-node-label">Condition</label>
        <input
          name="condition"
          type="text"
          placeholder="e.g. x > 5"
          defaultValue={data.condition}
          onChange={handleChange}
          className="custom-node-input"
        />
      </div>

      {/* 2. TRUE CONNECTOR (Right Top) */}
      <div style={{ position: 'absolute', right: -35, top: '40px', fontSize: '10px', color: '#34D399', fontWeight: 'bold' }}>
        True
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true" 
        style={{ top: '45px', background: '#34D399', width: '12px', height: '12px' }} 
      />
      
      {/* 3. FALSE CONNECTOR (Right Bottom) */}
      <div style={{ position: 'absolute', right: -35, top: '85px', fontSize: '10px', color: '#F87171', fontWeight: 'bold' }}>
        False
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false" 
        style={{ top: '90px', background: '#F87171', width: '12px', height: '12px' }} 
      />

      {/* 4. NEXT CONNECTOR (Bottom Center) */}
      {/* This is the new separate connector you asked for */}
      <div style={{ position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="next" 
        
      />

    </div>
  );
};

export default IfNode;