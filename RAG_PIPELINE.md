# RAG Pipeline Documentation

## Overview

This document describes the full Retrieval-Augmented Generation (RAG) pipeline implemented in the NeuroForge AI system. The RAG system enables the chat model to access and utilize relevant information from uploaded documents to provide more accurate and contextually relevant answers.

## Architecture

The RAG pipeline consists of five main components:

### 1. Document Processing (`lib/rag/documentProcessor.ts`)

Handles extraction of text from various document formats:

- **PDF**: Uses `pdf-parse` library
- **DOCX**: Uses `mammoth` library
- **TXT**: Plain text file reading

Features:

- File validation (type and size checking)
- Metadata extraction (filename, size, upload date)
- Error handling and logging

### 2. Text Splitting (`lib/rag/textSplitter.ts`)

Implements recursive text splitting with semantic awareness:

- **Separators**: Hierarchical splitting by paragraphs, sentences, spaces
- **Chunk Size**: Configurable (default 1000 tokens)
- **Overlap**: Configurable (default 100 tokens) to maintain context between chunks
- **Algorithm**: Recursive approach that tries semantic boundaries first

### 3. Embedding Generation (`lib/rag/embeddings.ts`)

Generates vector embeddings using lightweight transformers:

- **Model**: `Xenova/all-MiniLM-L6-v2` (384-dimensional embeddings)
- **Framework**: `@xenova/transformers` (runs locally in JavaScript)
- **Features**:
  - Single and batch embedding generation
  - Cosine similarity calculation
  - Vector normalization
  - Buffer conversion for database storage

### 4. Vector Retrieval (`lib/rag/vectorRetriever.ts`)

Performs similarity search and retrieval metrics tracking:

- **Storage**: SQLite database with vector fields
- **Similarity**: Cosine similarity search across all vectors
- **Retrieval Tracking**: Records hit counts and timestamps
- **Operations**:
  - Retrieve top-k similar chunks
  - Delete document vectors
  - Reindex documents
  - Generate retrieval statistics

### 5. RAG Orchestration (`lib/rag/ragService.ts`)

Main service that coordinates all components:

```
Document Upload
    ↓
Extract Text (DocumentProcessor)
    ↓
Split into Chunks (TextSplitter)
    ↓
Generate Embeddings (EmbeddingsModule)
    ↓
Store in Database (VectorRetriever)
```

## Database Schema

### Document Table

```
- id: String (primary key)
- userId: String (foreign key)
- name: String (filename)
- type: String (pdf/docx/txt)
- originalPath: String
- metadata: JSON
- chunks: DocumentChunk[]
- retrievalMetrics: RetrievalMetric[]
```

### DocumentChunk Table

```
- id: String (primary key)
- documentId: String (foreign key)
- chunkIndex: Int (position in document)
- content: String (text content)
- embedding: Bytes (vector as binary)
- retrievalMetrics: RetrievalMetric[]
```

### MessageSource Table

```
- messageId: String (links to Message)
- documentId: String (links to Document)
- chunkId: String (links to DocumentChunk)
- rankPosition: Int (retrieval rank)
- similarity: Float (cosine similarity score)
```

### RetrievalMetric Table

```
- documentId: String
- chunkId: String
- userId: String
- hitCount: Int (retrieval frequency)
- lastRetrieved: DateTime
```

## API Endpoints

### Document Management

#### POST `/api/documents/upload`

Upload and process a document.

**Request**:

```bash
curl -X POST /api/documents/upload \
  -F "file=@document.pdf" \
  -F "userId=user123"
```

**Response**:

```json
{
  "success": true,
  "document": {
    "id": "doc_123",
    "name": "document.pdf",
    "type": "pdf",
    "chunkCount": 45,
    "uploadedAt": "2026-03-03T...",
    "metadata": {...}
  },
  "processingTime": 3500
}
```

#### GET `/api/documents?userId=xxx`

List all documents for a user.

**Response**:

```json
{
  "success": true,
  "documents": [
    {
      "id": "doc_123",
      "name": "document.pdf",
      "type": "pdf",
      "chunkCount": 45,
      "uploadedAt": "2026-03-03T..."
    }
  ]
}
```

#### DELETE `/api/documents/[id]?userId=xxx`

Delete a document and its vectors.

#### POST `/api/documents/[id]/reindex?userId=xxx`

Reindex a document (regenerate embeddings).

### Retrieval Metrics

#### GET `/api/retrieval/metrics?userId=xxx&type=all|top`

Get retrieval statistics.

**Query Parameters**:

- `type`: `all` (all metrics) or `top` (top documents)
- `limit`: Number of results (default 10)

**Response**:

```json
{
  "success": true,
  "metrics": [
    {
      "id": "doc_123",
      "name": "document.pdf",
      "retrievalCount": 15
    }
  ],
  "type": "top"
}
```

## Chat Integration

### Query Flow

1. **User sends message** to `/api/chat`
2. **Generate query embedding** from message text
3. **Retrieve relevant chunks** using similarity search
4. **Format context** from top-k chunks
5. **Inject context** into system prompt
6. **Generate response** with document context
7. **Return response with sources** in streaming format

### Response Format

```typescript
{
  type: "complete",
  content: "Assistant response...",
  messageId: "msg_123",
  sources: [
    {
      documentId: "doc_123",
      documentName: "document.pdf",
      chunkId: "chunk_456",
      similarity: 0.85
    }
  ]
}
```

## UI Components

### DocumentUpload Component

- Drag-and-drop file upload
- Progress tracking
- File validation
- Error handling

### DocumentSidebar Component

- List uploaded documents
- Show chunk count
- Delete documents
- Reindex documents

### RetrievalMetrics Component

- Top documents by usage
- Hit count visualization
- Auto-refresh every 30 seconds

### ChatWindow Enhancement

- Display sources for messages
- Show similarity scores
- Expandable source details

## Performance Considerations

### Embedding Generation

- **Speed**: ~1-2 seconds per document page
- **Memory**: ~200MB for model (loaded once)
- **Batching**: Processed in batches of 32 chunks

### Similarity Search

- **Speed**: O(n) where n = total chunks (typically <1ms for <1000 chunks)
- **Scalability**: Linear with number of chunks
- **Optimization**: Can be pre-computed or cached

### Database Storage

- **Embedding Size**: 384 floats = 1536 bytes per chunk
- **Index Type**: Full-text & vector fields
- **Query Performance**: Satisfactory for <100k chunks

## Configuration

### Environment Variables

```
DATABASE_URL=file:./dev.db
OLLAMA_URL=http://localhost:11434  # For inference
```

### RAG Parameters (in RAGService)

```typescript
const ragService = new RAGService(
  1000, // chunk size
  100, // chunk overlap
  5, // top-k retrieval
);
```

## Usage Examples

### Upload a Document

```typescript
const ragService = new RAGService();
const docInfo = await ragService.indexDocument(
  "./path/to/document.pdf",
  "My Document.pdf",
  "user123",
);
console.log(`Indexed ${docInfo.chunkCount} chunks`);
```

### Retrieve Context

```typescript
const embedding = await generateEmbedding("What is machine learning?");
const results = await ragService.retrieveContext(
  embedding,
  "user123",
  5, // top-k
);
results.forEach((r) => {
  console.log(`${r.documentName}: ${r.similarity.toFixed(2)}`);
});
```

### Use in Chat

```typescript
// Client automatically includes RAG context
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    userId: "user123",
    conversationId: "conv_123",
    message: "What does chapter 5 say about...",
    enableRAG: true, // Optional, default true
  }),
});
```

## Limitations and Future Work

### Current Limitations

- No hierarchical indexing (all chunks searched)
- Threshold filtering (similarity > 0.3) is hardcoded
- No document-level filtering
- Single embedding model

### Potential Improvements

1. **Hierarchical Indexing**: Tree-based retrieval structure
2. **Semantic Caching**: Cache common queries
3. **Re-ranking**: Use cross-encoder for result re-ranking
4. **Filtering**: Filter by document type, date, etc.
5. **Hybrid Search**: Combine semantic + keyword search
6. **Graph Embeddings**: Link chunks based on semantic similarity
7. **Multi-modal**: Support images, tables, etc.

## Troubleshooting

### Embedding Generation Slow

- Check available memory
- First load initializes model (~200MB)
- Subsequent calls are faster

### No Results Retrieved

- Check document upload completed
- Verify chunks were created (`SELECT COUNT(*) FROM DocumentChunk`)
- Check embedding similarity threshold (currently 0.3)

### Database Size Growing

- Monitor `DocumentChunk` table size
- Consider archiving old documents
- Embeddings are stored as Bytes (efficient)

## References

- [Xenova Transformers](https://github.com/xenova/transformers.js)
- [Sentence Transformers](https://www.sbert.net/)
- [RAG Survey](https://arxiv.org/abs/2312.10997)
- [Vector Similarity Search](https://en.wikipedia.org/wiki/Similarity_search)
