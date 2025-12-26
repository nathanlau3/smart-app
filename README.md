<img alt="AI-Powered Police Report Analysis System" src="./assets/hero.png">
<h1 align="center">AI-Powered Document & Report Intelligence Platform</h1>

<p align="center">
A production-ready AI system for intelligent document analysis and police report management with voice interaction, semantic search, and geospatial visualization.
</p>

## ✨ Features

### 🤖 AI Agent with Emotions
- **Intelligent Voice Assistant:** Voice-enabled AI agent with 7 emotion states (neutral, happy, sad, excited, thinking, confused, empathetic)
- **Multi-modal Interaction:** Speech recognition (Indonesian) and text-to-speech with multiple voice options
- **Real-time Animations:** Visual agent with color-coded emotions and audio level visualization

### 📊 Police Report Intelligence (K3I System)
- **Smart Maps:** Interactive geospatial visualization with heatmaps and marker clustering using Mapbox GL
- **Report Analytics:** Comprehensive statistics, trend analysis, and category breakdown
- **Semantic Search:** AI-powered search across reports using multilingual embeddings
- **External API Sync:** Automatic synchronization with K3I police report API

### 💬 Advanced RAG Chat
- **Multi-Source Retrieval:** Query both uploaded documents and police reports simultaneously
- **AI Tools:** 5 specialized tools for report analysis:
  - Count reports with filters
  - Get aggregated statistics
  - Generate comprehensive summaries
  - Search detailed reports
  - Analyze multi-dimensional trends
- **Streaming Responses:** Real-time AI responses with emotion detection
- **Bilingual Support:** English and Bahasa Indonesia

### 🔐 Security & Storage
- **Row-Level Security:** Production-ready security policies for all user data
- **Document Upload:** Secure file storage with automatic processing
- **User Authentication:** Supabase Auth with multiple providers
- **Vector Embeddings:** Automatic embedding generation for semantic search

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 14 + React + TypeScript + shadcn/ui + Mapbox GL   │
│  - Voice I/O (Web Speech API + OpenAI TTS)                 │
│  - Animated Agent with Emotions                             │
│  - Interactive Maps & Charts                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Edge Functions                    │
│  - /chat: Multi-tool AI agent with RAG                      │
│  - /process: Document parsing & sectioning                  │
│  - /embed: Embedding generation orchestration               │
│  - /sync-reports: K3I API synchronization                   │
│  - /geo-reports: Geospatial data endpoints                  │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           ↓                          ↓
┌──────────────────────┐    ┌─────────────────────────────────┐
│  Embedding Service   │    │   PostgreSQL + pgvector         │
│  FastAPI + Python    │    │  - documents & document_sections│
│  Port 8001           │    │  - reports & report_embeddings  │
│                      │    │  - HNSW vector indexes          │
│  multilingual-e5     │    │  - RLS policies                 │
│  -small (384 dim)    │    │  - Automatic triggers           │
└──────────────────────┘    └─────────────────────────────────┘
           │                          │
           └────────┬─────────────────┘
                    ↓
         ┌──────────────────────┐
         │    External APIs     │
         │  - OpenAI GPT-4      │
         │  - OpenAI TTS        │
         │  - K3I Police API    │
         │  - Mapbox GL         │
         └──────────────────────┘
```

## 🧱 Prerequisites

- Unix-based OS (if Windows, use WSL2)
- Docker Desktop
- Node.js 18+
- Python 3.9+ (for embedding service)
- OpenAI API key
- Mapbox API token (for maps)

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/supabase-community/chatgpt-your-files.git
cd chatgpt-your-files
```

### 2. Install dependencies

```bash
# Frontend dependencies
npm install

# Embedding service dependencies
cd embedding-service
pip install -r requirements.txt
cd ..
```

### 3. Start Supabase

```bash
# Initialize Supabase
npx supabase init

# Start local Supabase stack
npx supabase start

# Apply migrations
npx supabase migration up

# Set environment variables
npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY |
    grep NEXT_PUBLIC > .env.local
```

### 4. Configure API Keys

Create `supabase/functions/.env`:

```bash
OPENAI_API_KEY=your-openai-api-key
```

Add to `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### 5. Start Embedding Service

```bash
cd embedding-service
uvicorn main:app --port 8001 --reload
```

### 6. Start Edge Functions

```bash
npx supabase functions serve
```

### 7. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
chatgpt-your-files/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── chat/                    # AI chat interface
│   ├── files/                   # Document upload
│   ├── smart-maps/              # Interactive maps
│   └── sync-report/             # Report sync dashboard
├── components/
│   ├── AnimatedAgent.tsx        # Emotion-aware AI agent
│   ├── EmotionDisplay.tsx       # Visual emotion states
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── hooks/
│   │   └── use-pipeline.ts      # Client-side embeddings
│   └── utils.ts
├── supabase/
│   ├── functions/
│   │   ├── chat/                # Multi-tool AI agent
│   │   ├── embed/               # Embedding orchestration
│   │   ├── process/             # Document processing
│   │   ├── sync-reports/        # K3I API sync
│   │   └── geo-reports/         # Geospatial endpoints
│   └── migrations/              # Database schema
├── embedding-service/
│   └── main.py                  # FastAPI embedding service
└── sample-files/                # Test documents
```

## 🔧 Database Schema

### Core Tables

**documents**
- User-uploaded documents
- Links to storage objects
- Automatic processing trigger

**document_sections**
- Chunked document content
- Vector embeddings (384 dimensions)
- HNSW index for fast similarity search

**reports**
- Police report data (K3I)
- Geographic coordinates
- Category metadata
- Polda/Polres hierarchy

**report_embeddings**
- Searchable report content
- Vector embeddings for semantic search
- Bilingual content (Indonesian)

### Key Functions

**match_document_sections(embedding, threshold)**
- Semantic search in documents
- Inner product similarity (<#>)

**match_reports(embedding, threshold)**
- Semantic search in police reports

**match_all_content(embedding, threshold, limit)**
- Unified search across documents and reports

## 🤖 AI Tools

The chat agent has access to 5 specialized tools:

1. **count_reports**: Count reports with optional filters
2. **get_report_stats**: Get aggregated statistics
3. **get_report_summary**: Generate comprehensive overview
4. **search_reports**: Retrieve detailed report information
5. **analyze_trends**: Multi-dimensional trend analysis

## 🎙️ Voice Features

### Speech Recognition
- Language: Indonesian (id-ID)
- Real-time transcription
- Push-to-talk or auto-detect

### Text-to-Speech
- **Web Speech API**: Browser-based (free)
- **OpenAI TTS**: 6 voice options (alloy, echo, fable, onyx, nova, shimmer)
- Auto-speak mode for AI responses
- Audio level visualization

## 🗺️ Smart Maps

- **Mapbox GL** integration
- Heatmap visualization
- Marker clustering
- Report filtering by:
  - Category
  - Location
  - Date range
- Interactive popups with report details
- Real-time data updates

## 📊 Report Analytics

- Statistical dashboards
- Category breakdown
- Regional analysis
- Trend visualization
- Officer tracking
- Comparative analytics

## 🌐 API Endpoints

### Edge Functions

**POST /functions/v1/chat**
- Streaming AI chat with RAG
- Tool use for structured queries
- Emotion-tagged responses

**POST /functions/v1/process**
- Process uploaded documents
- Generate embeddings
- Create searchable sections

**POST /functions/v1/embed**
- Generate embeddings via external service
- Batch processing support

**POST /functions/v1/sync-reports**
- Sync K3I API data
- Update report embeddings

**GET /functions/v1/geo-reports**
- Get geospatial report data
- Filter by category/location

### Embedding Service

**POST http://localhost:8001/embed**
```json
{
  "texts": ["Query text"],
  "is_query": true
}
```

Response:
```json
{
  "embeddings": [[0.1, 0.2, ...]]
}
```

## 🔐 Security

### Row-Level Security (RLS)

All tables have RLS policies enforcing:
- Users can only access their own documents
- Users can only access their own document sections
- Storage objects are isolated by user
- UUID-based path validation

### Authentication

- Supabase Auth integration
- Multiple auth providers supported
- JWT-based session management
- Secure token handling

## 🚢 Deployment

### Deploy to Production

1. **Create Supabase Project**
   ```bash
   # Link to your project
   npx supabase link --project-ref=your-project-ref

   # Push migrations
   npx supabase db push
   ```

2. **Set Secrets**
   ```bash
   npx supabase secrets set OPENAI_API_KEY=your-key
   ```

3. **Deploy Edge Functions**
   ```bash
   npx supabase functions deploy
   ```

4. **Deploy Embedding Service**
   - Deploy to Railway, Render, or your hosting provider
   - Update EMBEDDING_SERVICE_URL in Edge Functions

5. **Deploy Frontend**
   - Deploy to Vercel, Netlify, or Cloudflare Pages
   - Set environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_MAPBOX_TOKEN`

## 📚 Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **State**: React Query
- **Maps**: Mapbox GL + react-map-gl
- **Voice**: Web Speech API
- **Animations**: Lottie

### Backend
- **Platform**: Supabase
- **Functions**: Deno Edge Runtime
- **Database**: PostgreSQL 15
- **Vector**: pgvector with HNSW
- **Storage**: S3-compatible object storage

### AI/ML
- **LLM**: OpenAI GPT-4 / Llama
- **Embeddings**: intfloat/multilingual-e5-small (384 dim)
- **TTS**: OpenAI TTS API
- **Framework**: Vercel AI SDK
- **Streaming**: Server-Sent Events (SSE)

### Embedding Service
- **Framework**: FastAPI
- **Language**: Python 3.9+
- **Model**: Sentence Transformers
- **Optimization**: Batch processing, caching

## 🧪 Testing

### Sample Questions for Chat

**Document Questions:**
- "What documents have been uploaded?"
- "Search for information about [topic]"
- "Summarize the key points from the documents"

**Report Questions (Indonesian):**
- "Berapa jumlah laporan bulan ini?"
- "Tampilkan statistik laporan berdasarkan kategori"
- "Analisis tren laporan di wilayah Jakarta"
- "Cari laporan tentang pencurian"

### Sample Files

Test documents are available in `./sample-files/`:
- `roman-empire-1.md`
- `roman-empire-2.md`
- `roman-empire-3.md`

## 🛠️ Development

### Database Migrations

```bash
# Create new migration
npx supabase migration new migration-name

# Apply migrations
npx supabase migration up

# Generate types
npx supabase gen types typescript --local > supabase/functions/_lib/database.ts
```

### Edge Function Development

```bash
# Create new function
npx supabase functions new function-name

# Serve locally
npx supabase functions serve

# View logs
npx supabase functions serve --debug
```

### Embedding Service Development

```bash
cd embedding-service
uvicorn main:app --reload --port 8001
```

## 📈 Performance Optimization

### Vector Search
- HNSW index for fast approximate search
- Inner product operator (<#>) for normalized vectors
- Threshold filtering to limit results

### Embeddings
- External service to avoid Edge Function CPU limits
- Batch processing for efficiency
- Request caching

### Frontend
- React Query for data caching
- Streaming responses for faster perceived performance
- Code splitting and lazy loading
- Optimized bundle size

## 🐛 Troubleshooting

### Edge Functions not working
- Check Docker is running
- Verify `npx supabase start` completed successfully
- Check function logs: `npx supabase functions serve --debug`

### Embeddings failing
- Ensure embedding service is running on port 8001
- Check Python dependencies are installed
- Verify model downloads (first run takes time)

### Voice features not working
- Check browser microphone permissions
- Verify OpenAI API key is set
- Test browser compatibility (Chrome/Edge recommended)

### Maps not loading
- Verify Mapbox token is valid
- Check network requests in browser DevTools
- Ensure token has correct permissions

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com)
- Powered by [OpenAI](https://openai.com)
- Maps by [Mapbox](https://mapbox.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
- Embeddings by [Sentence Transformers](https://www.sbert.net)

## 📞 Support

- Issues: [GitHub Issues](https://github.com/supabase-community/chatgpt-your-files/issues)
- Discussions: [GitHub Discussions](https://github.com/supabase-community/chatgpt-your-files/discussions)
- Documentation: [Supabase Docs](https://supabase.com/docs)

## 🔗 Resources

### Supabase
- [Supabase AI & Vector](https://supabase.com/docs/guides/ai)
- [pgvector Guide](https://supabase.com/docs/guides/ai/vector-columns)
- [Edge Functions](https://supabase.com/docs/guides/functions)

### AI/ML
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Sentence Transformers](https://www.sbert.net/)

### Maps
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)

---

<p align="center">Made with ❤️ using Supabase, OpenAI, and pgvector</p>
