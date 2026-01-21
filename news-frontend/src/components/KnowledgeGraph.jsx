import { useEffect, useRef, useState } from "react";
import NodeDetailsPanel from "./NodeDetailsPanel";

export default function KnowledgeGraph({ graphData }) {
  const canvasRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    if (!canvasRef.current || !graphData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!graphData.nodes || graphData.nodes.length === 0) {
      ctx.fillStyle = "#666";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No knowledge graph data available", width / 2, height / 2);
      return;
    }

    // Simple force-directed layout simulation
    const nodeCount = graphData.nodes.length;
    const radius = nodeCount > 5 ? 220 : 180;
    
    const layoutNodes = graphData.nodes.map((node, i) => {
      let x, y;
      if (node.id === "main" || node.type === "main") {
        x = width / 2;
        y = height / 2;
      } else {
        const angle = ((i - 1) / (nodeCount - 1)) * Math.PI * 2;
        x = width / 2 + Math.cos(angle) * radius;
        y = height / 2 + Math.sin(angle) * radius;
      }
      return {
        ...node,
        x,
        y,
        vx: 0,
        vy: 0
      };
    });

    setNodes(layoutNodes);

    const edges = graphData.edges || [];

    // Draw function
    const draw = (highlightedNodeId = null) => {
      ctx.clearRect(0, 0, width, height);

      // Draw edges
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;
      edges.forEach(edge => {
        const source = layoutNodes.find(n => n.id === edge.source);
        const target = layoutNodes.find(n => n.id === edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();

          // Draw edge label
          if (edge.label) {
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            ctx.fillStyle = "#64748b";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(edge.label, midX, midY - 5);
          }
        }
      });

      // Draw nodes
      layoutNodes.forEach(node => {
        const nodeRadius = node.type === "main" ? 35 : 25;
        const isHighlighted = highlightedNodeId === node.id;
        
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = node.type === "main" ? "#3b82f6" : "#8b5cf6";
        ctx.fill();
        
        // Highlight selected node
        ctx.strokeStyle = isHighlighted ? "#fbbf24" : "#fff";
        ctx.lineWidth = isHighlighted ? 4 : 2;
        ctx.stroke();

        // Add glow effect for highlighted node
        if (isHighlighted) {
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Node label - wrap text if too long
        const maxWidth = 100;
        const words = node.label.split(' ');
        const lines = [];
        let currentLine = '';
        
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        
        // Wrap text
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        
        // Draw wrapped text
        ctx.fillStyle = "#1e293b";
        const lineHeight = 13;
        const startY = node.y + nodeRadius + 15;
        lines.forEach((line, i) => {
          ctx.fillText(line, node.x, startY + i * lineHeight);
        });
      });
    };

    // Initial draw
    draw(selectedNode?.id);

    // Redraw when selected node changes
    if (selectedNode) {
      draw(selectedNode.id);
    }

  }, [graphData, selectedNode]);

  // Handle canvas click
  function handleCanvasClick(event) {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Check if click is on any node
    for (const node of nodes) {
      const nodeRadius = node.type === "main" ? 35 : 25;
      const distance = Math.sqrt(
        Math.pow(clickX - node.x, 2) + Math.pow(clickY - node.y, 2)
      );

      if (distance <= nodeRadius) {
        console.log("🖱️ Node clicked:", node.label);
        setSelectedNode(node);
        return;
      }
    }

    // Click outside any node - deselect
    setSelectedNode(null);
  }

  function handleClosePanel() {
    setSelectedNode(null);
  }

  if (!graphData) {
    return (
      <div className="knowledge-graph-placeholder">
        <p>Loading knowledge graph...</p>
      </div>
    );
  }

  return (
    <div className="knowledge-graph" style={{ position: "relative" }}>
      <h3>Knowledge Graph</h3>
      <canvas
        ref={canvasRef}
        width={700}
        height={700}
        onClick={handleCanvasClick}
        style={{ 
          border: "1px solid #e2e8f0", 
          borderRadius: "8px", 
          background: "#f8fafc", 
          maxWidth: "100%",
          cursor: "pointer"
        }}
      />
      {graphData.entities && graphData.entities.length > 0 && (
        <div className="graph-legend">
          <h4>Key Entities:</h4>
          <ul>
            {graphData.entities.slice(0, 5).map((entity, idx) => (
              <li key={idx}>
                <strong>{entity.name}</strong>: {entity.type}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Node Details Panel */}
      <NodeDetailsPanel 
        selectedNode={selectedNode}
        graphData={graphData}
        onClose={handleClosePanel}
      />
    </div>
  );
}
