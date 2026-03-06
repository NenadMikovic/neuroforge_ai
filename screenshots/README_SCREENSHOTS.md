# Screenshots Needed for README

Take screenshots of the following pages and save them in this directory with the exact filenames shown below:

## Required Screenshots

### 1. `homepage.png`

- **URL**: http://localhost:3000
- **What to capture**: Full homepage including hero section, features grid, and "How To Use" section
- **Recommended viewport**: 1920x1080 or larger
- **Notes**: Scroll to show the key sections, or take multiple shots and stitch if needed

### 2. `chat-interface.png`

- **URL**: http://localhost:3000/chat
- **What to capture**: Chat interface showing:
  - Conversation sidebar with multiple conversations
  - Active chat window with a conversation demonstrating RAG retrieval
  - Message with source citations visible
- **Recommended viewport**: 1920x1080
- **Notes**: Start a conversation and ask: "Summarize any uploaded document" to show RAG in action

### 3. `admin-dashboard.png`

- **URL**: http://localhost:3000/admin/dashboard
- **What to capture**: Admin dashboard showing:
  - Metrics cards (conversations, messages, tools executed)
  - Charts and graphs
  - Real-time statistics
- **Recommended viewport**: 1920x1080
- **Notes**: Ensure you have some activity (conversations, tool executions) to show real data

### 4. `document-management.png`

- **URL**: http://localhost:3000/documents
- **What to capture**: Document management interface showing:
  - Upload area
  - List of uploaded documents
  - Document details/metadata
- **Recommended viewport**: 1920x1080
- **Notes**: Upload at least one document before taking screenshot

### 5. `tool-management.png`

- **URL**: http://localhost:3000/tools
- **What to capture**: Tools dashboard showing:
  - Available tools (python_exec, sql_query, file_search, system_metrics)
  - Tool descriptions and status
  - Configuration options if available
- **Recommended viewport**: 1920x1080

### 6. `retrieval-metrics.png`

- **URL**: http://localhost:3000/admin/retrieval
- **What to capture**: Retrieval metrics page showing:
  - Similarity scores
  - Retrieved document chunks
  - RAG performance statistics
- **Recommended viewport**: 1920x1080
- **Notes**: Execute a few RAG queries first to populate metrics

## After Taking Screenshots

1. Save all images in this `screenshots/` directory with exact filenames above
2. Verify images are high quality (PNG format recommended)
3. Ensure text is readable and UI elements are clear
4. The README.md already has the correct paths configured

## Alternative: Use Placeholder Images

If you want to share the README before taking screenshots, you can temporarily use https://via.placeholder.com:

```markdown
![Homepage](https://via.placeholder.com/1920x1080/6366f1/ffffff?text=Homepage)
```

But replace with actual screenshots for final version.
