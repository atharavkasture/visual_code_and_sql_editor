import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow'; // 1. Import useReactFlow
import './NodeStyles.css';

const ArrayNode = ({ id, data }) => {
  // 2. Access the setNodes function from the React Flow context
  const { setNodes } = useReactFlow();

  const handleChange = (e) => {
    data.updateNodeData(id, { [e.target.name]: e.target.value });
  };

  // 3. Create the delete handler
  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const declarationType = data.declarationType || 'values';

  return (
    <div className="custom-node" style={{ position: 'relative' }}>
      {/* 4. The Close Button */}
      <button 
        onClick={handleDelete}
        className="nodrag" // 'nodrag' prevents dragging the node when clicking the button
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
      <div className="custom-node-header">Declare Array</div>
      <div className="custom-node-content">
        <label className="custom-node-label">Array Name</label>
        <input
          name="varName"
          type="text"
          defaultValue={data.varName}
          onChange={handleChange}
          className="custom-node-input"
        />
        
        <label className="custom-node-label">
            Datatype
            <span className="node-tooltip">*For statically-typed languages</span>
        </label>
        <select name="dataType" defaultValue={data.dataType} onChange={handleChange} className="custom-node-input">
            <option value="int">int</option>
            <option value="double">double</option>
            <option value="String">String</option>
            <option value="boolean">boolean</option>
        </select>

        <label className="custom-node-label">Declaration Method</label>
        <select name="declarationType" value={declarationType} onChange={handleChange} className="custom-node-input">
            <option value="values">Initialize with Values</option>
            <option value="size">Initialize with Size</option>
        </select>

        {declarationType === 'values' ? (
          <div>
            <label className="custom-node-label">Values (comma-separated)</label>
            <input
              name="values"
              type="text"
              defaultValue={data.values}
              onChange={handleChange}
              className="custom-node-input"
            />
          </div>
        ) : (
          <div>
            <label className="custom-node-label">
                Size
                <span className="node-tooltip">*For statically-typed languages</span>
            </label>
            <input
              name="size"
              type="number"
              defaultValue={data.size}
              onChange={handleChange}
              className="custom-node-input"
            />
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default ArrayNode;