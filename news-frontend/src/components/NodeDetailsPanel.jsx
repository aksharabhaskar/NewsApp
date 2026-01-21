import { useState, useEffect } from "react";
import Spinner from "./Spinner";

export default function NodeDetailsPanel({ selectedNode, graphData, onClose }) {
  const [nodeDetails, setNodeDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedNode && graphData) {
      fetchNodeDetails();
    } else {
      setNodeDetails(null);
    }
  }, [selectedNode]);

  async function fetchNodeDetails() {
    if (!graphData || !graphData.extraction_data) {
      setError("No extraction data available");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("📊 Fetching details for:", selectedNode.label);
      
      const response = await fetch("http://127.0.0.1:8000/node-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node_label: selectedNode.label,
          extraction_data: graphData.extraction_data
        })
      });
      
      if (response.ok) {
        const details = await response.json();
        console.log("✅ Node details received:", details);
        setNodeDetails(details);
      } else {
        const errorText = await response.text();
        console.error("❌ Node details error:", errorText);
        setError("Failed to load node details");
      }
    } catch (err) {
      console.error("❌ Failed to fetch node details:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!selectedNode) return null;

  return (
    <div className="node-details-panel">
      <button className="close-button" onClick={onClose}>
        ×
      </button>
      
      <h3 className="node-title">{selectedNode.label}</h3>
      
      {loading && (
        <div className="loading-container">
          <Spinner />
          <p>Loading details...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={fetchNodeDetails}>Retry</button>
        </div>
      )}
      
      {!loading && !error && nodeDetails && (
        <div className="node-details-content">
          <div className="detail-section">
            <span className="detail-label">Type:</span>
            <span className="detail-value">{nodeDetails.type}</span>
          </div>
          
          <div className="detail-section">
            <span className="detail-label">Description:</span>
            <p className="detail-description">{nodeDetails.description}</p>
          </div>
          
          {nodeDetails.wikipedia_summary && (
            <div className="detail-section">
              <h4>📚 Wikipedia Summary</h4>
              <p className="wikipedia-text">{nodeDetails.wikipedia_summary}</p>
              {nodeDetails.wikipedia_url && (
                <a 
                  href={nodeDetails.wikipedia_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  Read more on Wikipedia →
                </a>
              )}
            </div>
          )}
          
          {nodeDetails.related_news && nodeDetails.related_news.length > 0 && (
            <div className="detail-section">
              <h4>📰 Related News ({nodeDetails.related_news.length})</h4>
              <div className="news-list">
                {nodeDetails.related_news.map((news, idx) => (
                  <div key={idx} className="news-item">
                    <strong className="news-title">{news.title}</strong>
                    {news.description && (
                      <p className="news-description">{news.description}</p>
                    )}
                    {news.link && (
                      <a 
                        href={news.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="news-link"
                      >
                        Read article →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {nodeDetails.relationships && nodeDetails.relationships.length > 0 && (
            <div className="detail-section">
              <h4>🔗 Relationships ({nodeDetails.relationship_count})</h4>
              <div className="relationships-list">
                {nodeDetails.relationships.map((rel, idx) => (
                  <div key={idx} className="relationship-item">
                    {rel.type === "outgoing" ? (
                      <span>
                        <span className="rel-arrow">→</span>
                        <strong className="rel-type">{rel.relationship}</strong>
                        <span className="rel-arrow">→</span>
                        <span className="rel-target">{rel.target}</span>
                      </span>
                    ) : (
                      <span>
                        <span className="rel-source">{rel.source}</span>
                        <span className="rel-arrow">→</span>
                        <strong className="rel-type">{rel.relationship}</strong>
                        <span className="rel-arrow">→</span>
                      </span>
                    )}
                    {rel.context && (
                      <p className="rel-context">{rel.context}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
