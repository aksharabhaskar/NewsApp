import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";
import KnowledgeGraph from "../components/KnowledgeGraph";
import Chatbot from "../components/Chatbot";
import { detectFakeNews } from "../api";


export default function ArticleDetail() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [articleSummary, setArticleSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [knowledgeGraph, setKnowledgeGraph] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [imageCheckResult, setImageCheckResult] = useState(null);
  const [loadingImageCheck, setLoadingImageCheck] = useState(false);
  const [imageCheckError, setImageCheckError] = useState(null);


  useEffect(() => {
    // Get article from sessionStorage
    const storedArticle = sessionStorage.getItem(`article_${articleId}`);
    if (storedArticle) {
      const parsedArticle = JSON.parse(storedArticle);
      setArticle(parsedArticle);
      fetchArticleSummary(parsedArticle);
    } else {
      // If article not found, redirect back
      navigate("/");
    }
  }, [articleId, navigate]);

  async function fetchArticleSummary(articleData) {
    setLoadingSummary(true);
    setSummaryError(null);

    console.log("📝 Fetching summary for:", articleData.title);

    try {
      const requestBody = {
        topic: articleData.title,
        description: articleData.description || "",
        content: articleData.content || "",
        url: articleData.url || "",
        source: articleData.source || ""
      };

      console.log("📤 Request body:", requestBody);

      const response = await fetch("http://127.0.0.1:8000/article-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      console.log("📥 Response status:", response.status);

      if (response.ok) {
        const summary = await response.json();
        console.log("✅ Summary received:", summary);
        setArticleSummary(summary);
      } else {
        const errorText = await response.text();
        console.error("❌ Summary error:", errorText);
        setSummaryError(`Failed to fetch summary (${response.status})`);
      }
    } catch (error) {
      console.error("❌ Failed to fetch summary:", error);
      setSummaryError(error.message || "Network error");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function fetchKnowledgeGraph() {
    if (!article || knowledgeGraph) return;

    setLoadingGraph(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/knowledge-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: article.title,
          description: article.description,
          url: article.url
        })
      });

      if (response.ok) {
        const graph = await response.json();
        setKnowledgeGraph(graph);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge graph:", error);
    } finally {
      setLoadingGraph(false);
    }
  }

  function toggleKnowledgeGraph() {
    const newState = !showKnowledgeGraph;
    setShowKnowledgeGraph(newState);
    if (newState && !knowledgeGraph) {
      fetchKnowledgeGraph();
    }
  }

  function toggleChatbot() {
    const newState = !showChatbot;
    setShowChatbot(newState);
    // Automatically generate knowledge graph when chatbot is opened
    if (newState && !knowledgeGraph) {
      fetchKnowledgeGraph();
    }
  }

  async function runImageCheck() {
    if (!article || !article.image) {
      setImageCheckError("No image available for this article");
      return;
    }

    // Ensure knowledge graph is loaded
    if (!knowledgeGraph || !knowledgeGraph.extraction_data) {
      setImageCheckError("Please generate the knowledge graph first");
      return;
    }

    setLoadingImageCheck(true);
    setImageCheckError(null);
    setImageCheckResult(null);

    try {
      console.log("🔍 Running image check...");

      const result = await detectFakeNews({
        image_url: article.image,
        entities: knowledgeGraph.extraction_data.entities || [],
        relations: knowledgeGraph.extraction_data.relations || []
      });

      console.log("✅ Image check result:", result);
      setImageCheckResult(result);
    } catch (error) {
      console.error("❌ Image check failed:", error);
      setImageCheckError(error.message || "Failed to run image check");
    } finally {
      setLoadingImageCheck(false);
    }
  }


  if (!article) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="article-detail-page">
      <div className={`article-detail-container ${showKnowledgeGraph || showChatbot ? 'split-view' : ''}`}>
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to News
        </button>

        <div className="knowledge-graph-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showKnowledgeGraph}
              onChange={toggleKnowledgeGraph}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">Show Knowledge Graph</span>
        </div>

        <div className="knowledge-graph-toggle" style={{ marginLeft: "20px" }}>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showChatbot}
              onChange={toggleChatbot}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">💬 Ask Questions</span>
        </div>

        <button
          className="image-check-button"
          onClick={runImageCheck}
          disabled={loadingImageCheck || !knowledgeGraph}
          style={{
            marginLeft: "20px",
            padding: "8px 16px",
            backgroundColor: knowledgeGraph ? "#10b981" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: knowledgeGraph ? "pointer" : "not-allowed",
            fontWeight: "500",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          {loadingImageCheck ? (
            <>
              <Spinner />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Run Image Check</span>
            </>
          )}
        </button>


        <div className="article-content-wrapper">
          <div className="article-main-content">
            <img
              src={article.image || "https://via.placeholder.com/800x450"}
              alt={article.title}
              className="article-image"
            />

            <h1 className="article-title">{article.title}</h1>

            <div className="article-meta">
              {article.source} • {new Date(article.publishedAt).toLocaleString("en-IN", {
                dateStyle: "long",
                timeStyle: "short"
              })}
            </div>

            {/* Image Check Results */}
            {imageCheckResult && (
              <div style={{
                marginTop: "20px",
                padding: "20px",
                backgroundColor: imageCheckResult.prediction === "REAL" ? "#d1fae5" : "#fee2e2",
                border: `2px solid ${imageCheckResult.prediction === "REAL" ? "#10b981" : "#ef4444"}`,
                borderRadius: "12px"
              }}>
                <h3 style={{
                  margin: "0 0 12px 0",
                  color: imageCheckResult.prediction === "REAL" ? "#065f46" : "#991b1b",
                  fontSize: "18px",
                  fontWeight: "600"
                }}>
                  {imageCheckResult.prediction === "REAL" ? "✅ Image Analysis: REAL" : "⚠️ Image Analysis: FAKE"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "14px" }}>
                  <div>
                    <strong>Confidence:</strong> {(imageCheckResult.confidence * 100).toFixed(2)}%
                  </div>
                  <div>
                    <strong>Real Probability:</strong> {(imageCheckResult.real_probability * 100).toFixed(2)}%
                  </div>
                  <div>
                    <strong>Fake Probability:</strong> {(imageCheckResult.fake_probability * 100).toFixed(2)}%
                  </div>
                  <div>
                    <strong>Raw Score:</strong> {imageCheckResult.raw_score.toFixed(4)}
                  </div>
                </div>
              </div>
            )}

            {/* Image Check Error */}
            {imageCheckError && (
              <div style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "8px"
              }}>
                <p style={{ margin: 0, color: "#856404" }}>
                  ⚠️ {imageCheckError}
                </p>
              </div>
            )}

            {loadingSummary && (
              <div className="loading-summary">
                <Spinner />
                <p>Fetching summary from trusted sources...</p>
              </div>
            )}

            {summaryError && (
              <div className="summary-error" style={{
                padding: "15px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "8px",
                marginTop: "20px"
              }}>
                <p style={{ margin: 0, color: "#856404" }}>
                  ⚠️ {summaryError}
                </p>
                <button
                  onClick={() => fetchArticleSummary(article)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    backgroundColor: "#ffc107",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {articleSummary && (
              <div className="article-summary-section">
                <h2>What Trusted Sources Say</h2>
                <p className="summary-text">{articleSummary.summary}</p>

                {articleSummary.citations && articleSummary.citations.length > 0 && (
                  <div className="citations">
                    <h3>Sources:</h3>
                    {articleSummary.citations.map((citation, idx) => (
                      <div key={idx} className="citation">
                        <strong>{citation.source_name}</strong>
                        <p>{citation.title}</p>
                        <a href={citation.url} target="_blank" rel="noopener noreferrer">
                          Read full article →
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="original-article">
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-original">
                Read Original Article →
              </a>
            </div>
          </div>

          {showKnowledgeGraph && !showChatbot && (
            <div className="article-graph-content">
              {loadingGraph ? (
                <div className="loading-graph">
                  <Spinner />
                  <p>Generating knowledge graph...</p>
                </div>
              ) : (
                <KnowledgeGraph graphData={knowledgeGraph} />
              )}
            </div>
          )}

          {showChatbot && (
            <div className="article-chat-content">
              {loadingGraph ? (
                <div className="loading-graph">
                  <Spinner />
                  <p>Initializing chatbot and generating enriched knowledge graph...</p>
                </div>
              ) : knowledgeGraph && knowledgeGraph.extraction_data ? (
                <Chatbot
                  extractionData={knowledgeGraph.extraction_data}
                  articleTitle={article.title}
                />
              ) : (
                <div className="chatbot-error">
                  <p>Unable to initialize chatbot. Please try again.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
