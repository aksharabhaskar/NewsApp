import { useNavigate } from "react-router-dom";

export default function NewsCard({ article }) {
  const navigate = useNavigate();

  const getVerificationBadge = () => {
    if (!article.verification) return null;
    
    const { conclusion } = article.verification;
    
    if (conclusion === "REAL") {
      return <span className="badge verified">✓ Verified</span>;
    } else if (conclusion === "UNVERIFIABLE") {
      return <span className="badge unverified">? Unverified</span>;
    }
    return null;
  };

  const handleClick = () => {
    // Store article in sessionStorage for the detail page
    sessionStorage.setItem(`article_${article.id}`, JSON.stringify(article));
    navigate(`/article/${article.id}`);
  };

  return (
    <div className="news-card" onClick={handleClick}>
      <img
        src={article.image || "https://via.placeholder.com/400x225"}
        alt=""
      />
      <div className="news-content">
        <div className="news-header">
          <h2>{article.title}</h2>
          {getVerificationBadge()}
        </div>
        <p>{article.description || ""}</p>
        <span className="meta">
          {article.source || "Unknown"} •{" "}
          {new Date(article.publishedAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
          })}
        </span>
      </div>
    </div>
  );
}
