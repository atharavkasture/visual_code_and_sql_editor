import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import './NodeStyles.css';

const SwitchNode = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  
  // Ensure cases array exists
  const cases = data.cases || [];

  const updateSwitchVar = (e) => {
    data.updateNodeData(id, { switchVar: e.target.value });
  };

  const addCase = () => {
    const newCases = [...cases, { id: Date.now(), value: '' }];
    data.updateNodeData(id, { cases: newCases });
  };

  const updateCaseValue = (caseId, newValue) => {
    const newCases = cases.map(c => c.id === caseId ? { ...c, value: newValue } : c);
    data.updateNodeData(id, { cases: newCases });
  };

  const removeCase = (caseId) => {
    const newCases = cases.filter(c => c.id !== caseId);
    data.updateNodeData(id, { cases: newCases });
  };

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="custom-node" style={{ minWidth: '200px', borderColor: '#d97706' }}>
      <button onClick={handleDelete} className="nodrag delete-btn">×</button>

      {/* Input Flow */}
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />

      <div className="custom-node-header" style={{backgroundColor: '#d97706'}}>Switch Statement</div>

      <div className="custom-node-content flex flex-col gap-3">
        
        {/* Switch Variable */}
        <div>
            <label className="custom-node-label">Switch On (Variable)</label>
            <input 
                type="text" 
                className="custom-node-input" 
                placeholder="e.g. day, choice"
                defaultValue={data.switchVar}
                onChange={updateSwitchVar}
            />
        </div>

        <div className="h-px bg-gray-600 my-1"></div>

        {/* Dynamic Cases */}
        {cases.map((c, index) => (
            <div key={c.id} className="relative flex items-center justify-between bg-gray-800 p-1 rounded border border-gray-600">
                <div className="flex items-center gap-2">
                    <span className="text-orange-400 text-xs font-bold">Case</span>
                    <input 
                        type="text" 
                        className="bg-gray-900 text-white text-xs p-1 rounded border border-gray-700 w-20"
                        defaultValue={c.value}
                        onChange={(e) => updateCaseValue(c.id, e.target.value)}
                        placeholder="val"
                    />
                </div>
                
                {/* Remove Case Button */}
                <button onClick={() => removeCase(c.id)} className="text-red-400 text-xs hover:text-red-200 px-1">✕</button>

                {/* Case Output Handle */}
                <Handle 
                    type="source" 
                    position={Position.Right} 
                    id={`case-${index}`} 
                    style={{ top: '50%', right: '-6px', background: '#f59e0b' }}
                />
            </div>
        ))}

        <button onClick={addCase} className="bg-gray-700 hover:bg-gray-600 text-xs py-1 px-2 rounded text-gray-300 border border-gray-500">
            + Add Case
        </button>

        {/* Default Case */}
        <div className="relative flex items-center justify-end p-1 mt-1">
            <span className="text-gray-400 text-xs font-bold mr-2">Default</span>
            <Handle 
                type="source" 
                position={Position.Right} 
                id="default" 
                style={{ top: '50%', right: '-6px', background: '#9ca3af' }}
            />
        </div>

      </div>
    </div>
  );
};

export default SwitchNode;