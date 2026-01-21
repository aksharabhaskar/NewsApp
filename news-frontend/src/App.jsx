import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Search, Globe, Share2, MessageSquare,
  Send, X, Sparkles, Zap, ChevronRight, Activity,
  Maximize2, ArrowRight, BrainCircuit, XCircle
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
const cn = (...inputs) => twMerge(clsx(inputs));

const cleanChars = (text) => text ? text.replace(/\[\+\d+\s+chars\]/gi, '') : '';

const API_BASE = "http://localhost:5005";

// --- API & DATA HANDLING ---

const useNewsFeed = () => {
  const [data, setData] = useState({
    main: null,
    secondary: [],
    trending: [],
    stats: { real_count: 0, fake_count: 0, unverified_count: 0 },
    fakeArticles: [],
    loading: true
  });

  useEffect(() => {
    const fetchNewsData = async () => {
      try {
        const res = await fetch(`${API_BASE}/news?q=space OR technology OR science`);
        if (!res.ok) throw new Error("API issues");
        const json = await res.json();

        const processArticle = (a) => ({
          ...a,
          summary: cleanChars(a.description || a.content || ""),
          content: cleanChars(a.content || a.description || ""),
          date: a.publishedAtIST || a.publishedAt || "Recently",
          category: a.category || "General",
          author: a.author || a.source || "Editorial",
          verification: a.verification || { conclusion: "UNVERIFIABLE" }
        });

        const articles = (json.articles || []).map(processArticle);

        if (articles.length > 0) {
          setData({
            main: articles[0],
            secondary: articles.slice(1, 5),
            trending: articles.slice(5, 9),
            stats: json.stats || { real_count: articles.length, fake_count: 0, unverified_count: 0 },
            fakeArticles: (json.fake_news_detected || []).map(processArticle),
            loading: false
          });
        } else {
          throw new Error("No articles");
        }
      } catch (e) {
        console.error("Using fallback data due to API error:", e);
        // Fallback Mock Data
        setData({
          main: {
            id: "fallback-1",
            title: "Russia's Youngest-ever Astronauts Blast Off to Space Station",
            summary: "On Thursday, three Russian astronauts lifted off on the Moscow-17 spacecraft from the Sputnik 1 Satellite Launch Center deep in the Gobi Desert.",
            category: "Space",
            author: "Daniel Albarta",
            date: "Oct 22, 2026",
            image: "https://images.unsplash.com/photo-1541873676-a18131494184?q=80&w=2518&auto=format&fit=crop",
            content: "The crew, consisting of the youngest team ever assembled by Roscosmos, successfully achieved orbit...",
            verification: { conclusion: "REAL" }
          },
          secondary: [
            { id: "f-2", title: "Musk seeks $134B from OpenAI", category: "Tech", author: "Donn Robinson", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800", date: "2h ago", summary: "Elon Musk is demanding damages alleging the AI company defrauded him.", verification: { conclusion: "UNVERIFIABLE" } },
            { id: "f-3", title: "Rocket Lab Resumes Launches", category: "Space", author: "Natalia Freigman", image: "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=800", date: "4h ago", summary: "Electron rocket set to return to flight.", verification: { conclusion: "REAL" } },
            { id: "f-4", title: "Ancient Lakes on Mars", category: "Science", author: "Antonio Roberto", image: "https://images.unsplash.com/photo-1614728853975-66624a631d80?w=800", date: "6h ago", summary: "Curiosity rover finds new evidence.", verification: { conclusion: "REAL" } },
            { id: "f-5", title: "AI Fairness Regulations", category: "Policy", author: "Sarah Jenkins", image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800", date: "8h ago", summary: "New global standards for AI safety.", verification: { conclusion: "UNVERIFIABLE" } }
          ],
          trending: [
            { title: "If Alien Life is Artificially Intelligent, It May be Stranger than We Can Imagine", author: "Donn Robinson", date: "Oct 22", category: "Space and Universe", readTime: "9 mins read", verification: { conclusion: "REAL" } },
            { title: "Climate change has pushed Earth into 'Uncharted territory': report", author: "Max Wellerman", date: "Oct 21", category: "Our Planet", readTime: "35 mins read", verification: { conclusion: "UNVERIFIABLE" } },
            { title: "Humanity at Risk from AI 'Race to the Bottom', Says Tech Expert", author: "Sean Paula", date: "Oct 19", category: "Technology", readTime: "8 mins read", verification: { conclusion: "REAL" } },
            { title: "UN Science Body Head Fears Lower Chance of Keeping Global Warming Below 1.5C", author: "Laura Fransisco", date: "Oct 19", category: "Our Planet", readTime: "10 mins read", verification: { conclusion: "REAL" } }
          ],
          stats: { real_count: 6, fake_count: 2, unverified_count: 4 },
          fakeArticles: [],
          loading: false
        });
      }
    };

    fetchNewsData();
  }, []);

  return data;
};

// --- COMPONENTS ---

const LoadingScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 border-4 border-neutral-800 rounded-full"
          />
          <motion.div
            className="absolute inset-0 border-4 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <motion.p
          className="text-lg font-light tracking-widest text-neutral-400 uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          Verifying articles...
        </motion.p>
      </div>
    </motion.div>
  );
};

const Navbar = ({ onHomeClick }) => (
  <nav className="flex items-center justify-between py-6 px-6 md:px-12 bg-black z-40">
    <div
      className="text-xl font-bold tracking-tight text-white uppercase cursor-pointer hover:text-blue-400 transition-colors"
      onClick={onHomeClick}
    >
      Indie Space
    </div>
    <div className="hidden lg:flex items-center gap-10 text-[13px] font-semibold text-neutral-400">
      <a href="#" className="hover:text-white transition-colors">FAKE</a>
      <a href="#" className="hover:text-white transition-colors">REAL</a>
      <a href="#" className="hover:text-white transition-colors">VERIFIED</a>
    </div>
    <div className="flex items-center gap-6">
      <button className="hidden md:block px-6 py-2 rounded-full border border-neutral-700 text-xs font-bold text-white hover:bg-white hover:text-black transition-all">
        Sign up for our newsletter
      </button>
      <Menu className="w-5 h-5 text-neutral-400 hover:text-white cursor-pointer lg:hidden" />
    </div>
  </nav>
);

const VerificationTag = ({ conclusion }) => {
  if (conclusion === 'REAL') return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">REAL</span>;
  if (conclusion === 'FAKE') return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">FAKE</span>;
  return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">NOT VERIFIED</span>;
};

const ArticleCard = ({ article, onClick, featured = false, horizontal = false }) => {
  return (
    <motion.div
      layoutId={`card-${article.id}`}
      className={cn(
        "group cursor-pointer flex p-4 border border-neutral-900 bg-neutral-950/30 hover:bg-neutral-900/40 rounded-xl transition-colors",
        featured ? "flex-col h-full gap-4" : horizontal ? "flex-row items-center gap-4" : "flex-col gap-4"
      )}
      onClick={() => onClick(article)}
    >
      <div className={cn(
        "overflow-hidden rounded-lg bg-neutral-900 relative shrink-0",
        featured ? "aspect-[4/3] w-full" : horizontal ? "w-32 h-24 order-2" : "aspect-[16/9] w-full"
      )}>
        <motion.img
          layoutId={`img-${article.id}`}
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className={cn("flex flex-col gap-2 min-w-0", horizontal ? "order-1 flex-1" : "")}>
        <div className="flex items-center gap-2">
          <VerificationTag conclusion={article.verification?.conclusion} />
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            <span>{article.category || "News"}</span>
            <span>•</span>
            <span>{article.publishedAtIST || article.date}</span>
          </div>
        </div>
        <h3 className={cn("font-bold leading-tight group-hover:text-blue-400 transition-colors", featured ? "text-4xl md:text-5xl" : "text-lg")}>
          {article.title}
        </h3>
        {featured && (
          <p className="text-neutral-400 text-lg mt-2">
            {article.summary}
          </p>
        )}
      </div>
    </motion.div>
  );
};

// --- GRAPH VISUALIZATION (Custom SVG) ---
const KnowledgeGraphView = ({ data, onNodeClick }) => {
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-4">
        <BrainCircuit className="w-12 h-12 opacity-20" />
        <p className="text-sm">Connecting to Intelligence Mesh...</p>
      </div>
    );
  }

  const width = 400;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;

  const nodes = data.nodes;
  const edges = data.edges;

  const layoutNodes = nodes.map((node, i) => {
    if (node.type === 'main') {
      return { ...node, x: cx, y: cy, r: 25, color: '#3b82f6' };
    }
    const angle = ((i - 1) / (nodes.length - 1)) * 2 * Math.PI;
    const radius = 120 + (i % 2) * 40;
    return {
      ...node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      r: 8 + (Math.random() * 8),
      color: node.type === 'PERSON' ? '#ec4899' : node.type === 'ORGANIZATION' ? '#f59e0b' : '#10b981'
    };
  });

  return (
    <div className="w-full h-[400px] bg-neutral-900/50 rounded-xl overflow-hidden relative border border-neutral-800">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 pointer-events-none">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Knowledge Graph</span>
        <span className="text-xs text-neutral-600">{nodes.length} Enriched Entities</span>
      </div>

      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="18" refY="4" orient="auto">
            <path d="M0,0 L0,8 L7,4 z" fill="#888" />
          </marker>
        </defs>

        {edges.map((edge, i) => {
          const source = layoutNodes.find(n => n.id === edge.source);
          const target = layoutNodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;

          return (
            <g key={i}>
              <motion.line
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.6 }}
                transition={{ duration: 1, delay: i * 0.05 }}
                x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                stroke="#666"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <motion.text
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                x={midX} y={midY - 5}
                fill="#999"
                fontSize="7"
                textAnchor="middle"
                className="font-bold uppercase tracking-tighter pointer-events-none"
              >
                {edge.relationship}
              </motion.text>
            </g>
          );
        })}

        {layoutNodes.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1, type: 'spring' }}
            whileHover={{ scale: 1.2 }}
            className="cursor-pointer"
            onClick={() => onNodeClick(node.label)}
          >
            <circle
              cx={node.x} cy={node.y} r={node.r + 4}
              fill={node.color} fillOpacity="0.2"
            />
            <circle
              cx={node.x} cy={node.y} r={node.r}
              fill={node.color} stroke="#171717" strokeWidth="2"
            />
            <text
              x={node.x} y={node.y + node.r + 12}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              className="font-sans font-medium pointer-events-none drop-shadow-md shadow-black"
            >
              {node.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
};


const ChatInterface = ({ articleTitle, extractionData }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          extraction_data: extractionData,
          article_title: articleTitle
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || "I couldn't process that connection." }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Ensure backend is running." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] border border-neutral-800 rounded-xl bg-neutral-900/30 overflow-hidden">
      <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex justify-between items-center">
        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Neural Mesh Explorer
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <Zap className="w-8 h-8 text-neutral-800 mb-2" />
            <p className="text-xs text-neutral-600 font-medium">Ask a question about how entities in this story are connected.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border",
              m.role === 'assistant' ? "bg-blue-600/20 border-blue-500/30 text-blue-400 border-none" : "bg-neutral-700 text-white border-neutral-600"
            )}>
              {m.role === 'assistant' ? <Zap className="w-3 h-3" /> : <span className="text-[10px]">U</span>}
            </div>
            <div className={cn("max-w-[80%] text-sm p-3 rounded-2xl",
              m.role === 'assistant' ? "bg-neutral-800/50 text-neutral-200" : "bg-blue-600 text-white"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2 items-center text-xs text-neutral-500 ml-9">
            <Activity className="w-3 h-3 animate-spin" /> Thinking...
          </div>
        )}
      </div>

      <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a follow-up..."
          className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
        />
        <button onClick={handleSend} className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const newsData = useNewsFeed();
  const [view, setView] = useState('home');
  const [article, setArticle] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [extractionData, setExtractionData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trustedSummary, setTrustedSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Gemini request estimator tracking
  // 1 verification (batch) + 1 KG generation (now only 1 request) + X chats
  const geminiEstimate = 1 + (extractionData ? 1 : 0);

  // Browser History Support
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.view) {
        setView(event.state.view);
        if (event.state.article) setArticle(event.state.article);
      } else {
        setView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView, art = null) => {
    setView(newView);
    if (art) setArticle(art);
    window.history.pushState({ view: newView, article: art }, '');
  };

  const handleNodeClick = async (nodeLabel) => {
    setSelectedNode({ name: nodeLabel, loading: true });
    try {
      const res = await fetch(`${API_BASE}/node-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_label: nodeLabel, extraction_data: extractionData })
      });
      const data = await res.json();
      setSelectedNode(data);
    } catch (e) {
      console.error(e);
      setSelectedNode({ name: nodeLabel, description: "Failed to fetch details." });
    }
  };

  const runImageAnalysis = async () => {
    if (!article || !extractionData) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch(`${API_BASE}/detect-fake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: article.image,
          entities: extractionData.entities,
          relations: extractionData.relations
        })
      });
      const result = await res.json();
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setAnalysisResult({ error: "Analysis failed." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleArticleClick = async (art) => {
    navigateTo('detail', art);
    setGraphData(null);
    setExtractionData(null);
    setAnalysisResult(null);

    try {
      const res = await fetch(`${API_BASE}/knowledge-graph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: art.title,
          description: art.summary,
          url: art.url
        })
      });
      const data = await res.json();
      setGraphData({ nodes: data.nodes, edges: data.edges });
      setExtractionData(data.extraction_data);
    } catch (e) {
      console.error(e);
      setGraphData({
        nodes: [{ id: "main", type: "main", label: art.title.slice(0, 20) }],
        edges: []
      });
    }

    // Fetch trusted summary
    setIsSummarizing(true);
    setTrustedSummary(null);
    try {
      const res = await fetch(`${API_BASE}/article-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: art.title,
          description: art.summary,
          content: art.content
        })
      });
      const data = await res.json();
      setTrustedSummary(data);
    } catch (e) {
      console.error(e);
      setTrustedSummary({ summary: "Failed to load summary from trusted sources." });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <AnimatePresence>
        {newsData.loading && <LoadingScreen onComplete={() => { }} />}
      </AnimatePresence>

      <Navbar onHomeClick={() => navigateTo('home')} />

      <main className="w-full">
        {/* Statistics Bar */}
        {!newsData.loading && view === 'home' && (
          <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-wrap gap-8 items-center text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Verified: <span className="text-white">{newsData.stats.real_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              Blocked: <span className="text-white">{newsData.stats.fake_count}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              Not Verified: <span className="text-white">{newsData.stats.unverified_count}</span>
            </div>
            <div className="ml-auto text-[10px] text-neutral-600">
              Gemini API Usage Estimate: <span className="text-blue-400">~{geminiEstimate} requests</span>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">

          {view === 'home' && !newsData.loading && newsData.main && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-[1400px] mx-auto px-6 md:px-12 py-10"
            >
              {/* --- FAKE NEWS ALERT SECTION --- */}
              {newsData.fakeArticles && newsData.fakeArticles.length > 0 && (
                <div className="mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldAlert className="w-24 h-24 text-rose-500" />
                  </div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-rose-500 rounded-lg">
                      <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-rose-500">Fake News Detected</h2>
                      <p className="text-xs text-rose-400/80 font-medium">The following articles have been flagged as misinformation and filtered from the main feed.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {newsData.fakeArticles.map((art, idx) => (
                      <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5 flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                          <img src={art.urlToImage || art.image} className="w-full h-full object-cover grayscale opacity-50" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-rose-500/20 text-rose-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Flagged</span>
                            <span className="text-[10px] text-neutral-600 truncate">{art.source?.name || art.author}</span>
                          </div>
                          <h4 className="text-sm font-bold text-neutral-400 truncate">{art.title}</h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* --- HERO SECTION (3 Columns) --- */}
              <div className="flex flex-col lg:flex-row gap-12 items-stretch">

                {/* Column 1: Main Story Text (35%) */}
                <div className="lg:w-[35%] flex flex-col justify-between py-4">
                  <div>
                    <div className="mb-4">
                      <VerificationTag conclusion={newsData.main.verification?.conclusion} />
                    </div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-6xl md:text-7xl lg:text-[84px] font-bold tracking-tighter leading-[0.95] text-white"
                    >
                      {newsData.main.title}
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-lg text-neutral-400 mt-8 leading-relaxed font-normal max-w-md"
                    >
                      {newsData.main.summary}
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-12 pt-8 flex items-center gap-3 text-[13px] font-medium text-neutral-500"
                  >
                    <span className="text-neutral-400">{newsData.main.category || "Space and Universe"}</span>
                    <span className="text-neutral-700">|</span>
                    <span className="text-neutral-400">{newsData.main.author || "Daniel Albarta"}</span>
                    <span className="text-neutral-700">|</span>
                    <span>{newsData.main.date || "October 22, 2023"}</span>
                  </motion.div>
                </div>

                {/* Column 2: Hero Image (40%) */}
                <div
                  className="lg:w-[40%] relative aspect-[3/4] lg:aspect-auto overflow-hidden cursor-pointer group"
                  onClick={() => handleArticleClick(newsData.main)}
                >
                  <motion.img
                    layoutId={`img-${newsData.main.id}`}
                    src={newsData.main.image}
                    alt={newsData.main.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                </div>

                {/* Column 3: Sidebar List (25%) */}
                <div className="lg:w-[25%] flex flex-col gap-8">
                  {newsData.secondary.slice(0, 4).map((art, idx) => (
                    <div
                      key={art.id}
                      className="flex gap-4 group cursor-pointer"
                      onClick={() => handleArticleClick(art)}
                    >
                      <div className="w-24 h-24 aspect-square shrink-0 bg-neutral-900 rounded-lg overflow-hidden relative">
                        <img
                          src={art.image}
                          alt={art.title}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <VerificationTag conclusion={art.verification?.conclusion} />
                          <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                            <span className="truncate">{art.author || "Daniel Albarta"}</span>
                            <span className="text-neutral-800">|</span>
                            <span className="shrink-0">{art.date || "Oct 22, 2023"}</span>
                          </div>
                        </div>
                        <h4 className="text-base font-bold leading-tight text-white group-hover:text-blue-400 transition-colors">
                          {art.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-1">
                          <span>{art.category || "Space"}</span>
                          <span className="text-neutral-800">|</span>
                          <span>{art.readTime || "4 mins read"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* --- HORIZONTAL BAR SECTION --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mt-20 pt-10 border-t border-neutral-900">
                {newsData.trending.slice(0, 4).map((art, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 group cursor-pointer"
                    onClick={() => handleArticleClick(art)}
                  >
                    <div className="flex items-center gap-2">
                      <VerificationTag conclusion={art.verification?.conclusion} />
                      <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                        <span>{art.author || "Sean Paula"}</span>
                        <span className="text-neutral-800">|</span>
                        <span>{art.date || "Oct 19, 2023"}</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-bold leading-tight text-white group-hover:text-blue-400 transition-colors">
                      {art.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      <span>{art.category || "Technology"}</span>
                      <span className="text-neutral-800">|</span>
                      <span>{art.readTime || "8 mins read"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- NEWEST STORIES SECTION --- */}
              <div className="mt-32">
                <div className="flex justify-between items-end mb-10 border-b border-neutral-900 pb-6">
                  <h2 className="text-4xl font-bold tracking-tight">Newest Stories</h2>
                  <a href="#" className="text-sm font-bold flex items-center gap-2 text-neutral-400 hover:text-white transition-colors uppercase tracking-widest">
                    see all <ChevronRight className="w-4 h-4" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {/* Reuse some existing data or just placeholders for now to match the UI */}
                  {[...newsData.secondary, ...newsData.trending].slice(0, 4).map((art, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-4 group cursor-pointer"
                      onClick={() => handleArticleClick(art)}
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-neutral-900">
                        <img
                          src={art.image || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800"}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          <span>{art.category || "Science"}</span>
                          <span className="text-neutral-800">|</span>
                          <span>{art.date || "Oct 22, 2023"}</span>
                        </div>
                        <h4 className="text-xl font-bold leading-tight text-white group-hover:text-blue-400 transition-colors">
                          {art.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'detail' && article && (
            <motion.div
              key="detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row gap-12 px-6 py-10 lg:px-12 max-w-[1400px] mx-auto min-h-screen"
            >
              {/* Left Content (60%) */}
              <div className="lg:w-[60%] space-y-8">
                <button
                  onClick={() => navigateTo('home')}
                  className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors"
                >
                  <ArrowRight className="rotate-180 w-4 h-4" /> Back to News
                </button>

                <div className="relative aspect-video overflow-hidden shadow-2xl">
                  <motion.img
                    layoutId={`img-${article.id}`}
                    src={article.image}
                    className="w-full h-full object-cover"
                  />
                  {/* Image Analysis Overlay */}
                  <div className="absolute bottom-6 right-6">
                    <button
                      onClick={runImageAnalysis}
                      disabled={isAnalyzing}
                      className="flex items-center gap-3 bg-black/60 backdrop-blur-xl border border-white/20 px-6 py-3 rounded-2xl text-xs font-bold hover:bg-black/80 transition-all shadow-2xl"
                    >
                      {isAnalyzing ? (
                        <>
                          <Activity className="w-4 h-4 animate-spin text-blue-400" />
                          Running Image Analysis...
                        </>
                      ) : (
                        <>
                          <Maximize2 className="w-4 h-4 text-blue-400" />
                          Deep Model Analysis
                        </>
                      )}
                    </button>

                    <AnimatePresence>
                      {analysisResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="mt-4 bg-neutral-900/90 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl shadow-3xl max-w-[400px] w-full"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Deep Neural Prediction</span>
                            <button onClick={() => setAnalysisResult(null)} className="text-neutral-500 hover:text-white"><X className="w-4 h-4" /></button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                              <p className="text-[10px] text-emerald-500/60 font-bold mb-1">REAL PROBABILITY</p>
                              <p className="text-2xl font-bold text-emerald-400">{(analysisResult.real_probability * 100).toFixed(1)}%</p>
                            </div>
                            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                              <p className="text-[10px] text-rose-500/60 font-bold mb-1">FAKE PROBABILITY</p>
                              <p className="text-2xl font-bold text-rose-400">{(analysisResult.fake_probability * 100).toFixed(1)}%</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mb-6">
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <p className="text-[8px] text-neutral-500 uppercase">Raw Score</p>
                              <p className="text-xs font-mono font-bold text-white">{analysisResult.raw_score?.toFixed(4)}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <p className="text-[8px] text-neutral-500 uppercase">Entities</p>
                              <p className="text-xs font-mono font-bold text-white">{extractionData?.entities?.length || 0}</p>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                              <p className="text-[8px] text-neutral-500 uppercase">Relations</p>
                              <p className="text-xs font-mono font-bold text-white">{extractionData?.relations?.length || 0}</p>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-3 h-3 text-blue-400" />
                              <span className="text-[10px] font-bold text-blue-400 uppercase">MODEL INSIGHT</span>
                            </div>
                            <p className="text-xs text-neutral-300 leading-relaxed italic">
                              "{analysisResult.analysis || `Prediction based on a confidence level of ${(analysisResult.confidence * 100).toFixed(1)}% using multi-modal attention (Image + Knowledge Graph).`}"
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-[8px] text-neutral-600 font-bold uppercase tracking-widest">
                            <Zap className="w-2 h-2" />
                            Model: Attention-based ResNet + GCN Fallback
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <VerificationTag conclusion={article.verification?.conclusion} />
                      <span className="text-neutral-500 font-bold tracking-wider text-sm uppercase">{article.category || "News"}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tighter">{article.title}</h1>
                    <div className="flex items-center gap-4 text-neutral-500 text-sm font-medium">
                      <span>{article.source || article.author || "Unknown Source"}</span>
                      <span>•</span>
                      <span>{article.publishedAtIST || article.date}</span>
                      <span>•</span>
                      <span>{article.readTime || "5 min read"}</span>
                    </div>
                  </div>

                  <div className="prose prose-invert prose-lg max-w-none text-neutral-300">
                    {isSummarizing ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-neutral-800 rounded w-3/4"></div>
                        <div className="h-4 bg-neutral-800 rounded w-5/6"></div>
                        <div className="h-4 bg-neutral-800 rounded w-2/3"></div>
                        <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-8">Synthesizing Trusted Sources...</p>
                      </div>
                    ) : trustedSummary ? (
                      <div className="space-y-6">
                        <p className="text-xl leading-relaxed text-white font-medium border-l-4 border-blue-600 pl-6 py-2 bg-blue-600/5">
                          {trustedSummary.summary}
                        </p>

                        {trustedSummary.citations?.length > 0 && (
                          <div className="mt-8 pt-8 border-t border-neutral-900">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Trusted Citations</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {trustedSummary.citations.map((cite, i) => (
                                <a
                                  key={i}
                                  href={cite.url}
                                  target="_blank"
                                  className="p-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex flex-col gap-1"
                                >
                                  <span className="text-[10px] font-bold text-blue-400 uppercase">{cite.source_name}</span>
                                  <span className="text-sm font-bold text-white line-clamp-1">{cite.title}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-12 pt-12 border-t border-neutral-900">
                          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-6">Article Original Content</h4>
                          {article.content ? (
                            article.content.split('\n').map((p, i) => (
                              <p key={i} className="mb-4 text-lg leading-relaxed opacity-60 text-neutral-400">{p}</p>
                            ))
                          ) : (
                            <p className="text-lg leading-relaxed opacity-60 text-neutral-400">{article.summary}</p>
                          )}
                        </div>
                      </div>
                    ) : article.content ? (
                      article.content.split('\n').map((p, i) => (
                        <p key={i} className="mb-4 text-lg leading-relaxed">{p}</p>
                      ))
                    ) : (
                      <p className="text-lg leading-relaxed">{article.summary}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Intelligence (40%) */}
              <div className="lg:w-[40%] space-y-6 lg:sticky lg:top-10 h-fit pb-10">
                {/* Graph */}
                <KnowledgeGraphView
                  data={graphData}
                  onNodeClick={handleNodeClick}
                />

                {/* Node Details UI */}
                <AnimatePresence>
                  {selectedNode && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <BrainCircuit className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{selectedNode.type || 'Entity'}</p>
                          <h4 className="text-lg font-bold">{selectedNode.name}</h4>
                        </div>
                      </div>

                      {selectedNode.loading ? (
                        <div className="flex items-center gap-3 text-sm text-neutral-500 animate-pulse py-4">
                          <Activity className="w-4 h-4 animate-spin" /> Retrieving context...
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-sm text-neutral-400 leading-relaxed italic border-l-2 border-neutral-800 pl-4">
                            {selectedNode.description || "No specific context found in article."}
                          </p>

                          {selectedNode.wikipedia_summary && (
                            <div className="p-3 bg-white/[0.02] rounded-lg">
                              <p className="text-[10px] font-bold text-neutral-600 uppercase mb-2">Wikipedia Insight</p>
                              <p className="text-xs text-neutral-400 line-clamp-3 mb-2">{selectedNode.wikipedia_summary}</p>
                              <a href={selectedNode.wikipedia_url} target="_blank" className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-1">
                                Read more on Wikipedia <ArrowRight className="w-2 h-2" />
                              </a>
                            </div>
                          )}

                          {selectedNode.related_news?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-neutral-600 uppercase mb-2">Internal Connections</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedNode.related_news.slice(0, 3).map((news, i) => (
                                  <div key={i} className="text-[10px] bg-neutral-800 px-2 py-1 rounded text-neutral-300">
                                    {news.title.slice(0, 30)}...
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat */}
                <ChatInterface
                  articleTitle={article.title}
                  extractionData={extractionData}
                />
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div >
  );
}