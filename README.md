# NewsApp - AI-Verified News Feed

A modern news aggregator that fetches news from NewsAPI.org and automatically filters out fake news using AI verification powered by Gemini.

## Features

- **AI-Powered Fake News Detection**: Automatically verifies each article against trusted sources (CNN, BBC, NYT, etc.) using Google Gemini.
- **Verification Badge**: Only displays verified ("REAL") or unverifiable news. Filters out content flagged as "FAKE".
- **Knowledge Graph Visualization**: Interactive force-directed graph (using D3/Canvas) showing entities (People, Orgs, Locations) and their relationships.
- **AI News Chatbot**: Integrated conversational assistant that answers questions about specific articles using context from the knowledge graph.
- **Multimodal Detection**: Uses a custom ML model combining **CLIP** image embeddings and **Node2Vec** graph embeddings to detect manipulated content.
- **Optimized Performance**: Parallel verification (5 worker threads), smart in-memory caching, and batch processing to reduce latency.
- **Comprehensive Coverage**: Categories include Top Headlines, Science, Technology, Business, Health, and Entertainment.

## System Architecture

High-level overview of the NewsApp ecosystem:

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React UI<br/>Vite + TailwindCSS]
        Graph[D3 Knowledge Graph<br/>Canvas Visualization]
        Chat[AI Chatbot Interface]
    end
    
    subgraph "Backend Layer - FastAPI"
        API[REST API<br/>Port 5005]
        Cache[In-Memory Cache<br/>Hash Map]
        Workers[Thread Pool<br/>5 Workers]
    end
    
    subgraph "AI/ML Services"
        Gemini[Gemini 2.0 Flash<br/>Verification + NER]
        ML[Multimodal ML Model<br/>CLIP + Node2Vec]
    end
    
    subgraph "Data Sources"
        NewsAPI[NewsAPI.org<br/>Article Fetch]
        RSS[Google News RSS<br/>Verification Context]
        Wiki[Wikipedia API<br/>Entity Enrichment]
    end
    
    subgraph "Storage"
        Neo4j[(Neo4j Graph DB<br/>Entity Relationships)]
    end
    
    UI -->|HTTP| API
    Graph -->|WebSocket| API
    Chat -->|HTTP| API
    
    API --> Cache
    API --> Workers
    Workers --> Gemini
    Workers --> ML
    
    API --> NewsAPI
    API --> RSS
    API --> Wiki
    API --> Neo4j
    
    Gemini -.->|Entity Data| Neo4j
    
    style UI fill:#60a5fa,stroke:#2563eb,stroke-width:2px,color:#fff
    style Graph fill:#60a5fa,stroke:#2563eb,stroke-width:2px,color:#fff
    style Chat fill:#60a5fa,stroke:#2563eb,stroke-width:2px,color:#fff
    style API fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style Cache fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#000
    style Workers fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#000
    style Gemini fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style ML fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style Neo4j fill:#f87171,stroke:#dc2626,stroke-width:2px,color:#fff
```

---

### 1. News Verification Pipeline
The core logic for verifying news credibility:

```mermaid
graph TB
    Start([User Request]) --> Fetch[Fetch Articles<br/>from NewsAPI]
    Fetch --> Check{Check<br/>Cache?}
    Check -->|Hit| Cached[Return Cached Result]
    Check -->|Miss| Batch[Batch Articles<br/>Groups of 10]
    
    Batch --> Pool[Thread Pool Executor<br/>5 Concurrent Workers]
    
    Pool --> Worker1[Worker 1]
    Pool --> Worker2[Worker 2]
    Pool --> Worker3[Worker 3]
    Pool --> Worker4[Worker 4]
    Pool --> Worker5[Worker 5]
    
    Worker1 --> RSS1[Google News RSS<br/>Search Context]
    Worker2 --> RSS2[Google News RSS<br/>Search Context]
    Worker3 --> RSS3[Google News RSS<br/>Search Context]
    Worker4 --> RSS4[Google News RSS<br/>Search Context]
    Worker5 --> RSS5[Google News RSS<br/>Search Context]
    
    RSS1 --> Gemini1[Gemini Verification<br/>Cross-check Sources]
    RSS2 --> Gemini2[Gemini Verification<br/>Cross-check Sources]
    RSS3 --> Gemini3[Gemini Verification<br/>Cross-check Sources]
    RSS4 --> Gemini4[Gemini Verification<br/>Cross-check Sources]
    RSS5 --> Gemini5[Gemini Verification<br/>Cross-check Sources]
    
    Gemini1 --> Label1[REAL/FAKE/UNVERIFIABLE<br/>+ Confidence Score]
    Gemini2 --> Label2[REAL/FAKE/UNVERIFIABLE<br/>+ Confidence Score]
    Gemini3 --> Label3[REAL/FAKE/UNVERIFIABLE<br/>+ Confidence Score]
    Gemini4 --> Label4[REAL/FAKE/UNVERIFIABLE<br/>+ Confidence Score]
    Gemini5 --> Label5[REAL/FAKE/UNVERIFIABLE<br/>+ Confidence Score]
    
    Label1 --> Store[Store in Cache]
    Label2 --> Store
    Label3 --> Store
    Label4 --> Store
    Label5 --> Store
    
    Store --> Filter{Filter<br/>Results}
    Cached --> Display
    Filter -->|REAL or<br/>UNVERIFIABLE| Display[Display to User]
    Filter -->|FAKE| Discard[Discard Article]
    
    style Start fill:#60a5fa,stroke:#2563eb,stroke-width:3px,color:#fff
    style Display fill:#34d399,stroke:#059669,stroke-width:3px,color:#fff
    style Discard fill:#f87171,stroke:#dc2626,stroke-width:3px,color:#fff
    style Pool fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#000
    style Store fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#000
    style Cached fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
```

### 2. Knowledge Graph Generation
How unstructured text is converted into a structured graph:

```mermaid
graph TB
    subgraph "Input Processing"
        Article[Article Content<br/>Title + Body + URL]
        Image[Article Image<br/>Optional]
    end
    
    subgraph "AI Entity Extraction"
        Article --> Gemini[Gemini 2.0 Flash<br/>Named Entity Recognition]
        Gemini --> Entities[Entities Identified:<br/>Person, Org, Location,<br/>Date, Event]
    end
    
    subgraph "Enrichment Pipeline"
        Entities --> RSS[Google News RSS<br/>Related Articles]
        Entities --> Wiki[Wikipedia API<br/>Background Info]
        RSS --> Enrich[Enriched Context]
        Wiki --> Enrich
    end
    
    subgraph "Graph Storage"
        Enrich --> Neo4j[(Neo4j Database)]
        Neo4j --> Nodes[Entity Nodes]
        Neo4j --> Edges[Relationship Edges]
    end
    
    subgraph "Visualization"
        Nodes --> D3[D3.js + Canvas<br/>Force-Directed Graph]
        Edges --> D3
        D3 --> UI[Interactive UI<br/>Zoom, Pan, Click]
    end
    
    subgraph "AI Chatbot"
        Neo4j --> Context[Graph Context]
        Context --> Chatbot[Gemini Chatbot<br/>Q&A about Articles]
        UI -.->|User Question| Chatbot
    end
    
    style Article fill:#60a5fa,stroke:#2563eb,stroke-width:2px,color:#fff
    style Gemini fill:#a78bfa,stroke:#7c3aed,stroke-width:3px,color:#fff
    style Neo4j fill:#f87171,stroke:#dc2626,stroke-width:3px,color:#fff
    style D3 fill:#34d399,stroke:#059669,stroke-width:2px,color:#fff
    style Chatbot fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
```

### 3. Multimodal Fake News Detection
Advanced experimental model fusing visual and structural data:

```mermaid
graph TB
    subgraph "Image Processing"
        Img[Article Image<br/>RGB Format] --> CLIP[CLIP Encoder<br/>OpenAI Model]
        CLIP --> ImgVec[Image Embedding<br/>512D Vector]
    end
    
    subgraph "Graph Processing"
        KG[Knowledge Graph<br/>Neo4j Entities] --> N2V[Node2Vec<br/>Random Walk]
        N2V --> GraphVec[Graph Embedding<br/>512D Vector]
    end
    
    subgraph "Feature Fusion"
        ImgVec --> Concat[Vector Concatenation]
        GraphVec --> Concat
        Concat --> Fused[Fused Features<br/>1024D Vector]
    end
    
    subgraph "Neural Network"
        Fused --> FC1[Dense Layer<br/>512 units + ReLU]
        FC1 --> Dropout[Dropout 0.5]
        Dropout --> FC2[Dense Layer<br/>256 units + ReLU]
        FC2 --> Output[Output Layer<br/>Sigmoid Activation]
    end
    
    subgraph "Prediction"
        Output --> Pred{Threshold<br/>0.5}
        Pred -->|>= 0.5| Real[REAL News<br/>High Confidence]
        Pred -->|< 0.5| Fake[FAKE News<br/>Manipulated Content]
    end
    
    style CLIP fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style N2V fill:#a78bfa,stroke:#7c3aed,stroke-width:2px,color:#fff
    style Concat fill:#fbbf24,stroke:#f59e0b,stroke-width:2px,color:#000
    style Real fill:#34d399,stroke:#059669,stroke-width:3px,color:#fff
    style Fake fill:#f87171,stroke:#dc2626,stroke-width:3px,color:#fff
```

## Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS v4 (Alpha) + Framer Motion
- **Icons**: Lucide React
- **Visualization**: HTML5 Canvas (custom graph engine)

### Backend
- **Framework**: FastAPI (Python 3.8+)
- **AI Models**: Google Gemini 2.0 Flash
- **ML Frameworks**: TensorFlow/Keras, PyTorch components (for CLIP)
- **Database**: Neo4j (Graph DB)
- **Data Sources**: NewsAPI.org, Google News RSS, Wikipedia API

## Architecture & Optimization

Designed for speed and cost-efficiency:
- **Google News RSS**: Replaced expensive Gemini Search with free RSS for verification context (80% cost reduction).
- **Smart Caching**: In-memory hash map prevents verifying the same URL twice.
- **Parallel Execution**: Python `ThreadPoolExecutor` handles 5 concurrent verification tasks.
- **Code Splitting**: React lazy loading and virtualization for smooth UI performance.

---
## Project Setup & Run Guide

This guide will help you set up the NewsApp project on your local machine using the automated setup scripts.

### Prerequisites

Before running the scripts, ensure you have:

1.  **Docker Desktop** installed and running. ([Download Here](https://www.docker.com/products/docker-desktop/))
2.  **API Keys** ready:
    *   **NewsAPI Key**: Get it for free at [newsapi.org](https://newsapi.org/)
    *   **Gemini API Key**: Get it for free at [aistudio.google.com](https://aistudio.google.com/)

---

### Step 1: Run the Setup Script

We have provided automated scripts to configure your environment (`.env`) and start the application.

#### For Windows Users
1.  Open the project folder.
2.  Right-click on the file named `setup.ps1`.
3.  Select **"Run with PowerShell"**.
    *   *Alternatively, open a terminal in the folder and type: `.\setup.ps1`*

#### For Mac & Linux Users
1.  Open your terminal.
2.  Navigate to the project folder (`cd path/to/folder`).
3.  Run the following commands:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

**What the script does:**
*   Checks if Docker is installed and running.
*   Asks for your **NewsAPI** and **Gemini API** keys (only the first time).
*   Creates the `.env` configuration file automatically.
*   Stops any conflicting containers (like old versions).
*   Builds and starts the Docker containers.

---

### Step 2: Access the Application

Once the script finishes and the terminal shows "Uvicorn running", you can access the app:

*   **Frontend (News Feed):** [http://localhost:8085](http://localhost:8085)
*   **Backend (API Docs):** [http://localhost:5005/docs](http://localhost:5005/docs)

---

### Management Commands

#### Stopping the App
To stop the application, go to the terminal where it's running and press:
**`Ctrl + C`**

Or run this command in a new terminal:
```bash
docker-compose down
```

#### Restarting the App (Daily Usage)
You don't need to run the setup script every time. To start the app again later, just run:
```bash
docker-compose up
```

---

### Troubleshooting

**"Port is already allocated"**
If you see an error about ports `5005` or `8085` being in use:
1.  Run `docker-compose down` to clear old containers.
2.  Restart Docker Desktop.

**"Docker is not running"**
Make sure the Docker Desktop app is open and the whale icon is visible in your taskbar/menu bar.
 
 
