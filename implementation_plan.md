# Migrate RAG Architecture from Atlas Vector Search to Pinecone

Migrate the vector search backend from MongoDB Atlas `$vectorSearch` aggregation pipeline to Pinecone as a dedicated vector database, while keeping MongoDB for all application data (documents, users, study plans, etc.).

## User Review Required

> [!IMPORTANT]
> **Pinecone API Key Required**: You will need a Pinecone account and API key. After approval, please provide your Pinecone API key so I can add it to `.env`. You can get one free at [pinecone.io](https://www.pinecone.io/).

> [!WARNING]
> **Existing Vector Data**: After migration, the existing `DocumentChunk` collection's `embedding` field in MongoDB will no longer be used for search. The `embedding` array will be removed from the schema to save storage. Existing documents will need to be re-uploaded (or a one-time migration script run) to populate Pinecone.

## Open Questions

> [!IMPORTANT]
> 1. **Pinecone Plan**: Are you using the free (Starter) plan or a paid plan? This affects index configuration (serverless vs. pod-based, and region choices).
> 2. **Re-indexing**: Would you like a one-time migration script to re-process all existing documents into Pinecone, or will you re-upload them manually?

## Current Architecture

```
Upload: PDF → Extract Text → Chunk → HuggingFace Embeddings → Store chunks + embeddings in MongoDB DocumentChunk
Query:  Question → HuggingFace Embedding → MongoDB $vectorSearch on DocumentChunk → Top 5 chunks → LLM context
Delete: Document deleted from MongoDB (but DocumentChunks NOT cleaned up currently)
```

**Current embedding model**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) via HuggingFace Inference API

## Target Architecture

```
Upload: PDF → Extract Text → Chunk → HuggingFace Embeddings → Store chunk metadata in MongoDB DocumentChunk → Store vectors in Pinecone
Query:  Question → HuggingFace Embedding → Pinecone query (filtered by documentId + userId) → Top 5 chunks → Fetch text from MongoDB → LLM context  
Delete: Delete DocumentChunks from MongoDB + Delete vectors from Pinecone (by documentId filter)
```

## Proposed Changes

### Dependencies

#### [MODIFY] [package.json](file:///c:/Users/user/Documents/Vscode/StudyMate/Backend/package.json)
- Add `@pinecone-database/pinecone` SDK

---

### Configuration

#### [MODIFY] [.env](file:///c:/Users/user/Documents/Vscode/StudyMate/Backend/.env)
- Add `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` environment variables

#### [NEW] `Backend/src/config/pinecone.ts`
- Initialize Pinecone client with API key
- Export a function to get the target index reference
- Add index initialization logic (create index if not exists, 384 dimensions to match `all-MiniLM-L6-v2`)

---

### Models

#### [MODIFY] [DocumentChunk.ts](file:///c:/Users/user/Documents/Vscode/StudyMate/Backend/src/models/DocumentChunk.ts)
- Remove the `embedding` field (no longer stored in MongoDB — stored in Pinecone instead)
- Add `userId` field for Pinecone metadata correlation
- Add `pageNumber` field (optional, for future use)
- Keep `text`, `documentId`, `chunkIndex` for metadata retrieval

---

### Services

#### [NEW] `Backend/src/services/embeddingService.ts`
- Reusable wrapper around the existing HuggingFace embeddings config
- `embedTexts(texts: string[])` — batch embed documents
- `embedQuery(query: string)` — embed a single query
- Centralizes embedding logic so it can be swapped easily in the future

#### [NEW] `Backend/src/services/pineconeService.ts`
- `upsertVectors(vectors)` — batch upsert vectors with metadata to Pinecone
- `queryVectors(embedding, filter, topK)` — query Pinecone with metadata filtering
- `deleteByDocumentId(documentId)` — delete all vectors for a given document
- Handles Pinecone-specific error handling and retries

#### [MODIFY] [ragService.ts](file:///c:/Users/user/Documents/Vscode/StudyMate/Backend/src/services/ragService.ts)
- **`processDocumentForRAG`**: Rewrite to:
  1. Chunk text (same `RecursiveCharacterTextSplitter`)
  2. Generate embeddings via `embeddingService`
  3. Save chunk metadata (text, documentId, userId, chunkIndex) to MongoDB `DocumentChunk` (without embedding array)
  4. Upsert vectors to Pinecone via `pineconeService` with metadata: `{ chunkId, documentId, userId, chunkIndex, content }`
- **`retrieveRelevantChunks`**: Rewrite to:
  1. Embed query via `embeddingService`
  2. Query Pinecone via `pineconeService` with filter `{ documentId }` (and optionally `userId`)
  3. Return matched chunks with text content (stored in Pinecone metadata)
- **`askDocument`**: Keep same interface, internally uses updated `retrieveRelevantChunks`
- Accept `userId` parameter for Pinecone metadata filtering

---

### Controllers

#### [MODIFY] [documentController.ts](file:///c:/Users/user/Documents/Vscode/StudyMate/Backend/src/controllers/documentController.ts)
- **`uploadDocument`**: Pass `userId` to `processDocumentForRAG`
- **`deleteDocument`**: Add cleanup logic:
  1. Delete `DocumentChunk` records from MongoDB
  2. Delete vectors from Pinecone via `pineconeService.deleteByDocumentId()`

#### [MODIFY] [aiController.ts](file:///c:/Users/user/Documents/Vscode/StudyMate/Backend/src/controllers/aiController.ts)
- **`chatWithDocument`**: Pass `userId` from `req.user` to `askDocument` for Pinecone metadata filtering

---

### File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | MODIFY | Add Pinecone SDK |
| `.env` | MODIFY | Add Pinecone env vars |
| `config/pinecone.ts` | NEW | Pinecone client + index init |
| `models/DocumentChunk.ts` | MODIFY | Remove embedding field, add userId |
| `services/embeddingService.ts` | NEW | Reusable embedding wrapper |
| `services/pineconeService.ts` | NEW | Pinecone CRUD operations |
| `services/ragService.ts` | MODIFY | Use Pinecone instead of Atlas Vector Search |
| `controllers/documentController.ts` | MODIFY | Pass userId, add delete sync |
| `controllers/aiController.ts` | MODIFY | Pass userId to chat |

## Verification Plan

### Manual Verification
1. Upload a new PDF → confirm chunks are stored in MongoDB (without embeddings) and vectors appear in Pinecone dashboard
2. Chat with the document → confirm relevant chunks are retrieved from Pinecone and the LLM responds with context
3. Delete a document → confirm both MongoDB chunks and Pinecone vectors are cleaned up
4. Verify multi-document support — upload 2+ PDFs and chat with each to ensure correct filtering
5. Check the backend console for proper logging of Pinecone operations
