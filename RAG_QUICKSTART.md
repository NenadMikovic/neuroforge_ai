# RAG Quick Start Guide

## Installation & Setup

### 1. Ensure Dependencies are Installed

```bash
npm install
```

If you recently pulled the code and RAG dependencies are missing:

```bash
npm install pdf-parse docx @xenova/transformers form-data dotenv
```

### 2. Run Database Migration

```bash
npm run dev
# Prisma will run the migration automatically
```

Or manually:

```bash
npx prisma migrate dev
```

### 3. Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Using the RAG System

### Step 1: Upload Documents

1. Navigate to **Documents** page (📚 Documents link in chat header)
2. Upload PDF, DOCX, or TXT files (max 100MB each)
3. Wait for processing to complete
4. See chunk count and upload time

### Step 2: Ask Questions

1. Go back to **Chat** page
2. Type a question related to your documents
3. System automatically retrieves relevant chunks
4. Response includes source documents

### Step 3: View Sources

1. Click on message to reveal sources
2. See which documents were used
3. Check similarity scores
4. Understand where the answer came from

### Step 4: Monitor Usage

1. On **Documents** page, check **Usage** section
2. See top documents by retrieval count
3. Understand which documents are most useful
4. Consider uploading more relevant papers if hits are low

## Common Tasks

### Reindex a Document

**Why**: If you have updated embeddings or changed chunk settings

1. Go to **Documents** page
2. Click on document to expand
3. Click **Reindex** button
4. Wait for completion

### Delete a Document

1. Go to **Documents** page
2. Click on document to expand
3. Click **Delete** button
4. Confirm deletion

### Disable RAG for a Question

Send request with `enableRAG: false`:

```javascript
// In ChatWindow or custom request
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({
    userId,
    conversationId,
    message: "Ask without documents",
    enableRAG: false, // Disable RAG for this message
  }),
});
```

## Performance Tips

### Optimal Document Sizes

- **Small documents**: 5-50 pages (good for specificity)
- **Medium documents**: 50-200 pages (balanced)
- **Large documents**: 200+ pages (needs more chunks)

### Better Results

1. **Upload relevant documents**: Only include papers/docs related to your questions
2. **Clear text**: OCR'd PDFs work better than scanned images
3. **Organize documents**: Group by topic
4. **Monitor metrics**: Check which documents get used most

### Troubleshooting

**Q: Uploaded document but getting no sources in responses**
A:

- Check document has actual text (try Ctrl+A in PDF viewer)
- Verify chunks were created: Check Documents page shows chunk count
- Try asking a direct question about content in the document
- Increase chunk count by uploading longer documents

**Q: Sources show but similarity is low (<0.5)**
A:

- Questions might be too different from document content
- Try more specific questions matching document text
- Upload more detailed documents on the topic

**Q: Embedding generation is slow**
A:

- First load of model takes 30 seconds
- Subsequent documents are much faster
- Check available disk space (model is ~200MB)

**Q: Database file growing large**
A:

- Expected: each chunk stores a 1.5KB embedding
- 1000 chunks = ~1.5MB database growth
- This is normal and efficient

## Advanced Configuration

### Change Chunk Size

Edit `lib/rag/ragService.ts`:

```typescript
// Current settings
new RAGService(1000, 100, 5);
//              ^^^^  ^^^  ^
//              size  overlap top-k

// Smaller chunks (better for accuracy)
new RAGService(500, 50, 5);

// Larger chunks (more context)
new RAGService(2000, 200, 5);
```

### Change Retrieval Threshold

Edit `lib/rag/vectorRetriever.ts`:

```typescript
// Current: 0.3 (30% similarity)
this.retriever = new VectorRetriever(topK, 0.3);

// Stricter: 0.6 (60% similarity)
this.retriever = new VectorRetriever(topK, 0.6);

// Looser: 0.1 (10% similarity)
this.retriever = new VectorRetriever(topK, 0.1);
```

### Change Embedding Model

Edit `lib/rag/embeddings.ts`:

```typescript
// Current model
"Xenova/all-MiniLM-L6-v2";

// Faster (4.4MB)
"Xenova/all-MiniLM-L6-v2";

// More powerful (33MB)
"Xenova/bge-base-en-v1.5";

// Lightweight (67MB)
"Xenova/bge-large-en-v1.5";
```

## API Reference

### Upload Document

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@paper.pdf" \
  -F "userId=user123"
```

### List Documents

```bash
curl "http://localhost:3000/api/documents?userId=user123"
```

### Delete Document

```bash
curl -X DELETE "http://localhost:3000/api/documents/doc_id?userId=user123"
```

### Get Metrics

```bash
curl "http://localhost:3000/api/retrieval/metrics?userId=user123&type=top"
```

### Chat with RAG

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "conversationId": "conv123",
    "message": "What does the paper say about...",
    "enableRAG": true
  }'
```

## Next Steps

1. ✅ Upload your first document
2. ✅ Ask a question about its content
3. ✅ Check the sources in the response
4. ✅ Monitor retrieval metrics
5. 🔄 Upload more specialized documents for your domain
6. 📊 Review what queries work best
7. 🎯 Fine-tune chunk size if needed

For more details, see [RAG_PIPELINE.md](./RAG_PIPELINE.md)
