// src/utils/graphUtils.js

/**
 * Traverses the graph from a start node to find all connected downstream nodes.
 * Used to isolate a function's body for saving.
 */
export const getSubgraph = (startNode, nodes, edges) => {
  const visitedNodes = new Set();
  const visitedEdges = new Set();
  const queue = [startNode];

  visitedNodes.add(startNode.id);

  while (queue.length > 0) {
    const currentNode = queue.shift();
    const outgoingEdges = edges.filter((edge) => edge.source === currentNode.id);
    
    outgoingEdges.forEach((edge) => {
      if (!visitedEdges.has(edge.id)) {
        visitedEdges.add(edge.id);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (targetNode && !visitedNodes.has(targetNode.id)) {
          visitedNodes.add(targetNode.id);
          queue.push(targetNode);
        }
      }
    });
  }

  return { 
    nodes: nodes.filter((n) => visitedNodes.has(n.id)), 
    edges: edges.filter((e) => visitedEdges.has(e.id)) 
  };
};

/**
 * Generates new IDs for nodes and edges to prevent collisions when importing.
 */
export const remapGraphIds = (nodes, edges) => {
  const idMap = {};
  const generateId = () => `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 1. Create new IDs for all nodes
  const newNodes = nodes.map(node => {
    const newId = generateId();
    idMap[node.id] = newId;
    return { ...node, id: newId };
  });

  // 2. Map edges to the new node IDs
  const newEdges = edges.map(edge => ({
    ...edge,
    id: generateId(),
    source: idMap[edge.source],
    target: idMap[edge.target]
  }));

  return { nodes: newNodes, edges: newEdges };
};