# Vector Indexes and Semantic Search

## Overview

Neo4j 5.x supports native vector indexes for similarity search on embeddings (ML models, semantic search).

## Create Vector Index

```cypher
CREATE VECTOR INDEX index_name IF NOT EXISTS
FOR (n:Document) ON (n.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine'
}}
```

**Parameters:**

- `vector.dimensions`: Must match your embedding model (OpenAI = 1536, sentence-transformers varies)
- `vector.similarity_function`: `'cosine'` (most common), `'euclidean'`, or `'dot'`

## Vector Index on Relationships

```cypher
CREATE VECTOR INDEX rel_embedding_idx IF NOT EXISTS
FOR ()-[r:SIMILAR_TO]-() ON (r.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 768,
  `vector.similarity_function`: 'cosine'
}}
```

## Query Vector Index

```cypher
-- Find 10 most similar documents to query embedding
CALL db.index.vector.queryNodes('document_embedding_idx', 10, $queryEmbedding)
YIELD node, score
RETURN node.title, node.content, score
ORDER BY score DESC
```

## Practical Pattern: Semantic Search

```cypher
-- Search with filtering
CALL db.index.vector.queryNodes('document_embedding_idx', 20, $queryEmbedding)
YIELD node AS doc, score
WHERE doc.status = 'published'
  AND score > 0.7  -- Similarity threshold
RETURN doc.title, doc.summary, score
ORDER BY score DESC
LIMIT 10
```

## Index Management

```cypher
-- List all vector indexes
SHOW INDEXES WHERE type = 'VECTOR'

-- Drop vector index
DROP INDEX index_name IF EXISTS

-- Wait for population
CALL db.awaitIndexes()
```

## When to Use

| Use Case               | Recommendation                      |
| ---------------------- | ----------------------------------- |
| Semantic search        | Vector index with cosine similarity |
| Document similarity    | Vector index on content embeddings  |
| Recommendation systems | Vector index + graph traversal      |
| RAG applications       | Vector search + knowledge graph     |
