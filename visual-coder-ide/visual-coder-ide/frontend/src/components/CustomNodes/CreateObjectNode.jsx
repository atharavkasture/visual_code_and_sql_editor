import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import './NodeStyles.css';

const CreateObjectNode = ({ id, data }) => {
  const { setNodes } = useReactFlow();

  const handleChange = (e) => {
    data.updateNodeData(id, { [e.target.name]: e.target.value });
  };

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="custom-node border-teal-500" style={{ position: 'relative' }}>
      {/* Close Button */}
      <button 
        onClick={handleDelete}
        className="nodrag"
        style={{
            position: 'absolute', top: '-10px', right: '-10px',
            background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%',
            width: '24px', height: '24px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
            fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', zIndex: 10
        }}
      >
        ×
      </button>

      <Handle type="target" position={Position.Top} />
      
      <div className="custom-node-header text-teal-600">Create Object</div>
      <div className="custom-node-content">
        <label className="custom-node-label">Instance Name (Variable)</label>
        <input
          name="varName"
          type="text"
          defaultValue={data.varName}
          onChange={handleChange}
          className="custom-node-input"
          placeholder="myCar"
        />
        
        <label className="custom-node-label">Class Type</label>
        <input
          name="className"
          type="text"
          defaultValue={data.className}
          onChange={handleChange}
          className="custom-node-input"
          placeholder="Car"
        />

        <label className="custom-node-label">Constructor Args (Optional)</label>
        <input
          name="args"
          type="text"
          defaultValue={data.args}
          onChange={handleChange}
          className="custom-node-input"
          placeholder="2022, 'Red'"
        />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default CreateObjectNode;