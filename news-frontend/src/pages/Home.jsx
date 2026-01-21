import { useEffect, useState, useRef } from "react";
import { fetchNews } from "../api";
import NewsCard from "../components/NewsCard";
import Spinner from "../components/Spinner";

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [fakeArticles, setFakeArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ real_count: 0, fake_count: 0, unverified_count: 0 });
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchNews({ page: 1, query: "" })
      .then(data => {
        setArticles(data.articles || []);
        setFakeArticles(data.fake_news_detected || []);
        setStats(data.stats || { real_count: 0, fake_count: 0, unverified_count: 0 });
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch news:", error);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <header className="header">
        <h1>AI-Verified News Feed</h1>
        <p>Real-time fake news detection powered by AI</p>
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginTop: "12px", fontSize: "14px" }}>
          <span style={{ color: "#155724" }}>✅ Verified: {stats.real_count}</span>
          <span style={{ color: "#856404" }}>? Unverified: {stats.unverified_count}</span>
          {stats.fake_count > 0 && <span style={{ color: "#721c24" }}>❌ Blocked: {stats.fake_count}</span>}
        </div>
        {stats.fake_count > 0 && (
          <div style={{ 
            background: "#f8d7da",
            borderRadius: "8px", 
            padding: "12px", 
            margin: "12px auto", 
            maxWidth: "500px",
            color: "#721c24"
          }}>
            <strong>🛡️ Fake News Detected:</strong> {stats.fake_count} article{stats.fake_count > 1 ? 's' : ''} automatically hidden to protect you
          </div>
        )}
      </header>

      {fakeArticles.length > 0 && (
        <div className="blocked-news-section">
          <h3>🛡️ Blocked Fake News</h3>
          <p className="blocked-subtitle">These articles were identified as fake news and blocked:</p>
          <div className="blocked-news-list">
            {fakeArticles.map(article => (
              <div key={article.id} className="blocked-news-item">
                <span className="blocked-icon">❌</span>
                <div className="blocked-content">
                  <h4>{article.title}</h4>
                  <span className="blocked-source">{article.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="news-container">
        <h2 className="section-title">✅ Verified Real News (Top {articles.length})</h2>
        {loading && <Spinner />}
        
        {!loading && articles.length === 0 && (
          <p style={{ textAlign: "center", color: "#666" }}>
            No verified news available right now.
          </p>
        )}

        {!loading && articles.map(a => (
          <NewsCard key={a.id} article={a} />
        ))}
      </div>
    </>
  );
}
