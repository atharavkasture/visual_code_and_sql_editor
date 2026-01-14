const visited = new Set();

export const graphToIR = (nodes, edges) => {
    visited.clear();

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const edgeMap = new Map();
    edges.forEach(edge => {
        if (!edgeMap.has(edge.source)) {
            edgeMap.set(edge.source, []);
        }
        edgeMap.get(edge.source).push(edge);
    });

    // --- 1. Process Classes ---
    // We process classes first so that methods (functions inside classes) 
    // are marked as 'visited' and don't appear as global functions later.
    const classNodes = nodes.filter(n => n.type === 'classDefine');
    const classes = classNodes.map(classNode => {
        visited.add(classNode.id);
        const irClass = convertNodeToIR(classNode);
        
        // Look for connection to the 'members' handle
        const membersEdge = (edgeMap.get(classNode.id) || []).find(e => e.sourceHandle === 'members');
        if (membersEdge) {
            irClass.members = buildSequence(membersEdge.target, nodeMap, edgeMap);
        }
        return irClass;
    });

    // --- 2. Process Functions ---
    // Filter out functions that were already processed as class methods (checked via !visited.has)
    const functionNodes = nodes.filter(n => n.type === 'functionDefine' && !visited.has(n.id));
    const functions = functionNodes.map(funcNode => {
        visited.add(funcNode.id);
        const irFunc = convertNodeToIR(funcNode);
        const bodyEdge = (edgeMap.get(funcNode.id) || []).find(e => e.sourceHandle === 'body');
        if (bodyEdge) {
            irFunc.body = buildSequence(bodyEdge.target, nodeMap, edgeMap);
        }
        return irFunc;
    });

    // --- 3. Process Main Body ---
    const startNode = nodes.find(n => n.type === 'input' || n.id === 'start');
    
    let mainBody = [];
    if (startNode) {
        const startEdges = edgeMap.get(startNode.id) || [];
        const firstNodeId = startEdges.length > 0 ? startEdges[0].target : null;
        mainBody = buildSequence(firstNodeId, nodeMap, edgeMap);
    }

    return {
        type: 'program',
        classes: classes,   // Added classes to IR
        functions: functions,
        body: mainBody,
    };
};

function buildSequence(startNodeId, nodeMap, edgeMap) {
    if (!startNodeId || visited.has(startNodeId)) {
        return [];
    }
    
    const sequence = [];
    let currentNodeId = startNodeId;

    while (currentNodeId) {
        const node = nodeMap.get(currentNodeId);
        if (!node || visited.has(currentNodeId)) break;
        
        visited.add(currentNodeId);
        
        const irNode = convertNodeToIR(node);
        sequence.push(irNode);

        const outgoingEdges = edgeMap.get(node.id) || [];
        
        // --- BRANCHING & FLOW LOGIC ---
        if (node.type === 'if') {
            const trueEdge = outgoingEdges.find(e => e.sourceHandle === 'true');
            const falseEdge = outgoingEdges.find(e => e.sourceHandle === 'false');
            
            irNode.body = trueEdge ? buildSequence(trueEdge.target, nodeMap, edgeMap) : [];
            irNode.elseBody = falseEdge ? buildSequence(falseEdge.target, nodeMap, edgeMap) : [];

            // Continue Main Flow (The "Next" connector)
            const nextEdge = outgoingEdges.find(e => e.sourceHandle === 'next'); 
            currentNodeId = nextEdge ? nextEdge.target : null;

        } 
        else if (node.type === 'switch') {
            irNode.cases = [];
            const cases = node.data.cases || [];
            
            // Dynamic Cases
            cases.forEach((c, index) => {
                const caseEdge = outgoingEdges.find(e => e.sourceHandle === `case-${index}`);
                irNode.cases.push({
                    value: c.value,
                    body: caseEdge ? buildSequence(caseEdge.target, nodeMap, edgeMap) : []
                });
            });

            // Default Case
            const defaultEdge = outgoingEdges.find(e => e.sourceHandle === 'default');
            irNode.defaultBody = defaultEdge ? buildSequence(defaultEdge.target, nodeMap, edgeMap) : [];

            const nextEdge = outgoingEdges.find(e => e.sourceHandle === 'next');
            currentNodeId = nextEdge ? nextEdge.target : null;
        } 
        else if (node.type === 'for' || node.type === 'while') {
            const loopBodyEdge = outgoingEdges.find(e => e.sourceHandle === 'loopBody');
            irNode.body = loopBodyEdge ? buildSequence(loopBodyEdge.target, nodeMap, edgeMap) : [];
            
            // Look for explicit 'next', otherwise fallback to non-body edge
            const nextEdge = outgoingEdges.find(e => e.sourceHandle === 'next'); 
            const defaultEdge = outgoingEdges.find(e => e.sourceHandle !== 'loopBody');
            currentNodeId = nextEdge ? nextEdge.target : (defaultEdge ? defaultEdge.target : null);
        } 
        else {
            // Linear Flow
            const nextEdge = outgoingEdges[0];
            currentNodeId = nextEdge ? nextEdge.target : null;
        }
    }
    return sequence;
}

// --- HELPERS ---
function parseCsv(str) {
    if (!str) return [];
    return str.split(',').map(s => s.trim()).filter(Boolean);
}

function parseTypedParams(str) {
    if (!str) return [];
    return str.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        const type = parts.length > 1 ? parts[0] : 'var'; 
        const name = parts.length > 1 ? parts[1] : parts[0];
        return { type, name };
    }).filter(p => p.name);
}

// --- NODE CONVERTER ---
function convertNodeToIR(node) {
    switch (node.type) {
        
        case 'assign':
            return { 
                type: 'variable_declaration',
                var: node.data.varName, 
                value: node.data.value, 
                dataType: node.data.dataType 
            };

        case 'assign2':
            return { 
                type: 'variable_update',
                var: node.data.varName, 
                value: node.data.value
            };
        
        case 'array':
            if (node.data.declarationType === 'size') {
                return { type: 'array_assign_size', var: node.data.varName, dataType: node.data.dataType, size: node.data.size };
            }
            return { type: 'array_assign_values', var: node.data.varName, dataType: node.data.dataType, values: parseCsv(node.data.values) };
        
        case 'print':
            return { type: 'print', value: node.data.value };
        
        case 'if':
            return { type: 'if', condition: node.data.condition, body: [], elseBody: [] };
        
        case 'switch':
             return { type: 'switch', var: node.data.switchVar, cases: [], defaultBody: [] };

        case 'for':
            return { type: 'for', var: node.data.varName, range: node.data.range, body: [] };
        
        case 'while':
            return { type: 'while', condition: node.data.condition, body: [] };
        
        case 'functionDefine':
            return { type: 'function_define', name: node.data.name, params: parseTypedParams(node.data.params), body: [] };
        
        // --- Added ClassNode Support ---
        case 'classDefine':
            return { 
                type: 'class_define', 
                name: node.data.className, 
                members: [] // Filled by buildSequence
            };

        case 'functionCall':
            return { type: 'function_call', name: node.data.name, args: parseCsv(node.data.args) };
        
        case 'createObject':
            return { 
                type: 'object_creation', 
                var: node.data.varName, 
                className: node.data.className, 
                args: parseCsv(node.data.args) 
            };
            
        default:
             console.warn(`Unknown node type: ${node.type}`);
             return { type: 'unknown', data: node.data };
    }
}