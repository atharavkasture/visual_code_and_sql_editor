import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import './NodeStyles.css'; // Assuming you share styles

const ClassNode = ({ id, data }) => {
  // 1. Get setNodes from the React Flow context for deletion
  const { setNodes } = useReactFlow();

  // Generic change handler for inputs
  const handleChange = (e) => {
    // Ensure updateNodeData exists before calling it (safety check)
    if (data.updateNodeData) {
         data.updateNodeData(id, { [e.target.name]: e.target.value });
    }

  };

  // 2. Create the delete handler
  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    // Using an orange border color to distinguish it from functions
    <div className="custom-node border-orange-500" style={{ position: 'relative' }}>

      {/* 3. The Close Button (Identical styling to your example) */}
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

      {/* Optional: Input handle if classes can inherit or be nested */}
      <Handle type="target" position={Position.Top} />

      <div className="custom-node-header text-orange-400">Define Class</div>
      <div className="custom-node-content">
        <label className="custom-node-label">Class Name</label>
        <input
          name="className" // Using 'className' specifically for data
          type="text"
          defaultValue={data.className}
          onChange={handleChange}
          className="custom-node-input"
          placeholder="MyClass"
        />

        {/* Optional extension: Inheritance */}
        {/*
        <label className="custom-node-label mt-2">Inherits From (Optional)</label>
        <input
          name="inherits"
          type="text"
          defaultValue={data.inherits}
          onChange={handleChange}
          className="custom-node-input"
          placeholder="ParentClass"
        />
        */}
      </div>

      {/* Output Handle connecting to class members (methods/attributes) */}
      <Handle
        type="source"
        position={Position.Right}
        id="members"
        style={{ top: '50%', background: '#F97316' }} // Orange handle
      />
      {/* Label outside the node for the handle */}
      <div className='text-xs text-orange-400' style={{position: 'absolute', right: -60, top: '45%', width: '60px'}}>Members</div>
    </div>
  );
};

export default ClassNode;