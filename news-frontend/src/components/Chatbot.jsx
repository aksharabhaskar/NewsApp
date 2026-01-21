import { useState, useRef, useEffect } from "react";
import Spinner from "./Spinner";

export default function Chatbot({ extractionData, articleTitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when component mounts
    setMessages([
      {
        role: "assistant",
        content: `Hi! I'm your AI assistant for this article. I can answer questions about the entities, relationships, and enriched context from Wikipedia and related news. What would you like to know about "${articleTitle}"?`
      }
    ]);
  }, [articleTitle]);

  async function sendMessage(e) {
    e.preventDefault();
    
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput("");
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    
    try {
      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction_data: extractionData,
          question: userMessage,
          article_title: articleTitle
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: data.answer 
        }]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: `Sorry, I encountered an error: ${error.detail || "Unknown error"}` 
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't process your question. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <h3>💬 Ask About This Article</h3>
        <p className="chatbot-subtitle">Powered by Enriched Knowledge Graph</p>
      </div>
      
      <div className="chatbot-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-message ${msg.role === "user" ? "user-message" : "assistant-message"}`}
          >
            <div className="message-avatar">
              {msg.role === "user" ? "👤" : "🤖"}
            </div>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="chat-message assistant-message">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <Spinner />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="chatbot-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          className="chatbot-input"
          placeholder="Ask a question about this article..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || !extractionData}
        />
        <button 
          type="submit" 
          className="chatbot-send-button"
          disabled={loading || !input.trim() || !extractionData}
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
