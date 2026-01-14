import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import './NodeStyles.css';

const AssignNode2 = ({ id, data }) => {
  const { setNodes } = useReactFlow();

  const handleTargetChange = (e) => {
    data.updateNodeData(id, { varName: e.target.value });
  };

  const handleValueChange = (e) => {
    data.updateNodeData(id, { value: e.target.value });
  };

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="custom-node" style={{ minWidth: '220px', borderColor: '#0ea5e9', borderStyle: 'dashed' }}>
      
      {/* Delete Button */}
      <button 
        onClick={handleDelete}
        className="nodrag"
        style={{
            position: 'absolute', top: '-10px', right: '-10px',
            background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%',
            width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold', fontSize: '16px', zIndex: 10
        }}
        title="Delete Node"
      >
        ×
      </button>

      {/* Input Handle */}
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      {/* HEADER: Clearly marked as UPDATE/RE-ASSIGN */}
      <div className="custom-node-header">
        Re-Assign / Update
      </div>
      
      <div className="custom-node-content flex flex-col gap-2">
        <div className="flex items-center gap-2">
            {/* Target Input */}
            <div className="flex-1">
                <label className="custom-node-label text-xs mb-1 block text-gray-400">Target Var</label>
                <input
                    name="varName"
                    type="text"
                    placeholder="x"
                    defaultValue={data.varName}
                    onChange={handleTargetChange}
                    className="custom-node-input"
                    style={{width: '100%'}}
                />
            </div>
            
            {/* Equals Sign */}
            <div className="text-cyan-400 font-bold text-xl mt-4">=</div>

            {/* Value Input */}
            <div className="flex-1">
                <label className="custom-node-label text-xs mb-1 block text-gray-400">New Value</label>
                <input
                    name="value"
                    type="text"
                    placeholder="20"
                    defaultValue={data.value}
                    onChange={handleValueChange}
                    className="custom-node-input"
                    style={{width: '100%'}}
                />
            </div>
        </div>
      </div>
      
      {/* Output Handle */}
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};

export default AssignNode2;