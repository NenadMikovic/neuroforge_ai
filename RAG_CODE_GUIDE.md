# RAG Implementation - Code Review Guide

This guide helps you understand the RAG implementation by reading the code in the right order.

## Getting Oriented (5 minutes)

Start here to understand the big picture:

1. [RAG_SUMMARY.md](./RAG_SUMMARY.md) - Overview and key features
2. [RAG_QUICKSTART.md](./RAG_QUICKSTART.md) - How to use it
3. [RAG_FILES.md](./RAG_FILES.md) - Where everything is

## Understanding the Architecture (15 minutes)

Read these in order to understand how it all works:

1. **[RAG_PIPELINE.md](./RAG_PIPELINE.md)** - Read "Architecture" section
   - Understand 5 main components
   - Learn data flow
   - See database schema

2. **[lib/rag/ragService.ts](./lib/rag/ragService.ts)** - Main orchestrator
   - Understand `indexDocument()` - how docs are processed
   - Understand `retrieveContext()` - how retrieval works
   - Understand `createRAGPrompt()` - how context is injected

## Deep Dive by Component (30 minutes)

### Component 1: Document Processing

**Files**: [lib/rag/documentProcessor.ts](./lib/rag/documentProcessor.ts)

- How PDFs are extracted
- How DOCX files are parsed
- Error handling

### Component 2: Text Splitting

**Files**: [lib/rag/textSplitter.ts](./lib/rag/textSplitter.ts)

- Recursive splitting algorithm
- How overlap is maintained
- Semantic boundary detection

### Component 3: Embeddings

**Files**: [lib/rag/embeddings.ts](./lib/rag/embeddings.ts)

- Xenova transformers setup
- Cosine similarity calculation
- Batch processing
- Vector storage encoding

### Component 4: Vector Retrieval

**Files**: [lib/rag/vectorRetriever.ts](./lib/rag/vectorRetriever.ts)

- Similarity search implementation
- Hit tracking
- Statistics calculation
- Reindexing logic

## API Implementation (20 minutes)

### Document Upload Flow

**File**: [app/api/documents/upload/route.ts](./app/api/documents/upload/route.ts)

1. Receives file upload
2. Validates file type/size
3. Calls RAGService to index
4. Returns document info

### Document Management

**Files**:

- [app/api/documents/route.ts](./app/api/documents/route.ts) - List documents
- [app/api/documents/[id]/route.ts](./app/api/documents/[id]/route.ts) - Delete document
- [app/api/documents/[id]/reindex/route.ts](./app/api/documents/[id]/reindex/route.ts) - Reindex embeddings

### Retrieval Metrics

**File**: [app/api/retrieval/metrics/route.ts](./app/api/retrieval/metrics/route.ts)

- Get usage statistics
- Top documents by hits
- User analytics

### Enhanced Chat API

**File**: [app/api/chat/route.ts](./app/api/chat/route.ts)

- Added RAG context generation
- Embedding query
- Chunk retrieval
- Source tracking

## UI Implementation (20 minutes)

### Upload Component

**File**: [app/components/DocumentUpload.tsx](./app/components/DocumentUpload.tsx)

- Drag-and-drop interface
- Progress tracking
- Error handling
- File validation

### Document Management

**File**: [app/components/DocumentSidebar.tsx](./app/components/DocumentSidebar.tsx)

- List documents
- Show chunk counts
- Delete/reindex buttons
- Expandable details

### Metrics Display

**File**: [app/components/RetrievalMetrics.tsx](./app/components/RetrievalMetrics.tsx)

- Show top documents
- Visual hit count bars
- Auto-refresh

### Chat Enhancement

**File**: [app/components/ChatWindow.tsx](./app/components/ChatWindow.tsx)

- Display sources with expandable details
- Show similarity scores
- Source attribution

### Pages

**Files**:

- [app/documents/page.tsx](./app/documents/page.tsx) - Document management page
- [app/chat/page.tsx](./app/chat/page.tsx) - Updated with documents link

## Database Changes (10 minutes)

**File**: [prisma/schema.prisma](./prisma/schema.prisma)

New models added:

- `Document` - Metadata for uploaded documents
- `DocumentChunk` - Text chunks with embeddings
- `MessageSource` - Links messages to source chunks
- `RetrievalMetric` - Tracks retrieval statistics

**File**: [lib/db/service.ts](./lib/db/service.ts)

New functions added:

- `addMessageSources()` - Link message to documents
- `getMessageSources()` - Retrieve sources for message
- `getRetrievalMetrics()` - Get user's retrieval stats
- `getTopDocumentsByRetrievals()` - Get most used documents

## Service Updates (5 minutes)

**File**: [lib/services/chatService.ts](./lib/services/chatService.ts)

Updates:

- Added `MessageSource` interface
- Added `sources` field to `Message` interface

## Reading Paths

### Path 1: "I want to understand the full flow" (60 minutes)

1. RAG_SUMMARY.md (5 min)
2. RAG_PIPELINE.md - Architecture section (10 min)
3. lib/rag/ragService.ts (10 min)
4. app/api/chat/route.ts (10 min)
5. lib/rag/vectorRetriever.ts (10 min)
6. lib/rag/embeddings.ts (5 min)
7. lib/rag/textSplitter.ts (5 min)
8. lib/rag/documentProcessor.ts (5 min)

### Path 2: "I want to modify the system" (90 minutes)

Start with Path 1, then:

1. app/api/documents/upload/route.ts (10 min)
2. All component files (30 min)
3. prisma/schema.prisma + lib/db/service.ts (10 min)
4. Configuration sections in RAG_PIPELINE.md (10 min)

### Path 3: "I just want to use it" (10 minutes)

1. RAG_SUMMARY.md (5 min)
2. RAG_QUICKSTART.md (5 min)

### Path 4: "I need to troubleshoot" (15 minutes)

1. RAG_QUICKSTART.md - Troubleshooting section (10 min)
2. Check relevant component based on issue (5 min)

## Code Quality

All code includes:

- ✅ TypeScript types
- ✅ Comprehensive comments
- ✅ Error handling
- ✅ Logging for debugging
- ✅ Input validation
- ✅ Database transactions

## Testing the Implementation

**Manual test flow**:

1. Open browser to `http://localhost:3000/documents`
2. Upload a PDF file
3. Wait for processing (should show chunk count)
4. Go to `/chat`
5. Ask a question about the PDF
6. Verify sources appear in response
7. Click to expand and view similarity scores
8. Go back to `/documents`
9. Check Usage stats dashboard
10. Click document → Reindex button
11. Click document → Delete button

**What to check in DevTools**:

- Network tab: Monitor API calls
  - POST /api/documents/upload
  - GET /api/documents
  - POST /api/chat (with sources in response)
  - GET /api/retrieval/metrics
- Console: Check for any errors
- Application → IndexedDB: Can see browser data

## Key Files to Customize

If you want to modify behavior:

1. **Change chunk size**:
   - Edit: `lib/rag/ragService.ts` constructor
   - Change: `new RAGService(1000, 100, 5)` → adjust first parameter

2. **Change retrieval count**:
   - Edit: `lib/rag/ragService.ts` constructor
   - Change: third parameter from 5 to desired number

3. **Change retrieval threshold**:
   - Edit: `lib/rag/vectorRetriever.ts` constructor
   - Change: second parameter from 0.3 to desired threshold

4. **Change embedding model**:
   - Edit: `lib/rag/embeddings.ts`
   - Change: model name in `pipeline()` call

5. **Change UI colors**:
   - Edit: Component files in `app/components/`
   - Search for: Tailwind classes like `bg-cyan-500`

6. **Add new document source tracking**:
   - Edit: `lib/db/service.ts`
   - Add new function to query MessageSource relationships

---

**Happy exploring!** Start with RAG_SUMMARY.md and work your way through based on your needs.
