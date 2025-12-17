# Examples for genkitx-weaviate

This directory contains example implementations demonstrating how to use the `genkitx-weaviate` plugin with Firebase Genkit.

## Prerequisites

Before running these examples, make sure you have:

1. Node.js >= 20.0.0 installed
2. A Weaviate instance running (local or cloud)
3. An OpenAI API key (for embeddings and LLM)

## Setup

### 1. Install Dependencies

From the root of the repository:

```bash
npm install
npm run build
```

Then in this examples directory:

```bash
cd examples
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in this directory with the following variables:

```env
# OpenAI API Key (required for embeddings and LLM)
OPENAI_API_KEY=your_openai_api_key_here

# Weaviate Configuration (Local)
WEAVIATE_HOST=http://localhost:8080

# Optional: Weaviate Cloud Configuration
# WEAVIATE_HOST=https://your-cluster.weaviate.network
# WEAVIATE_API_KEY=your_weaviate_api_key
```

### 3. Start Weaviate (Local)

If you don't have a Weaviate instance running, you can start one locally using Docker:

```bash
docker run -d \
  -p 8080:8080 \
  -p 50051:50051 \
  --name weaviate \
  -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
  -e PERSISTENCE_DATA_PATH=/var/lib/weaviate \
  -e QUERY_DEFAULTS_LIMIT=25 \
  -e DEFAULT_VECTORIZER_MODULE=none \
  -e CLUSTER_HOSTNAME=node1 \
  cr.weaviate.io/semitechnologies/weaviate:latest
```

For more information, see the [Weaviate documentation](https://docs.weaviate.io/deploy/installation-guides/docker-installation).

## Running the Examples

### Build and Start the Development Server

```bash
npm run build
npm run genkit:start
```

This will:
1. Compile the TypeScript code
2. Start the Genkit development UI
3. Watch for file changes and rebuild automatically

The Genkit Developer UI will open in your browser at http://localhost:4000

## Available Flows

### 1. Retriever Flow

**Name:** `retrieverFlow`

**Description:** Demonstrates basic retrieval from Weaviate. Takes a query string and returns an AI-generated response based on retrieved documents.

**Input:** String (query)

**Example:**
```json
"What is Weaviate?"
```

### 2. Indexer Flow

**Name:** `indexerFlow`

**Description:** Indexes a local PDF file into Weaviate. Uses the sample PDF in the `doc/` folder.

**Input:** String (ignored, can be empty)

**Example:**
```json
""
```

### 3. Indexer URL Flow

**Name:** `indexerUrlFlow`

**Description:** Indexes content from URLs into Weaviate. Demonstrates web scraping and indexing.

**Input:** String (ignored, can be empty)

**Example:**
```json
""
```

### 4. Retriever With Filters Flow

**Name:** `retrieverWithFiltersFlow`

**Description:** Advanced retrieval with Weaviate filters. Shows how to filter results by category and distance threshold.

**Input:** Object with query and optional category

**Example:**
```json
{
  "query": "What is vector search?",
  "category": "documentation"
}
```

## Project Structure

```
examples/
├── doc/               # Sample documents for indexing
│   └── sample.pdf     # Example PDF file
├── src/               # Source code
│   └── index.ts       # Main example flows
├── lib/               # Compiled JavaScript (generated)
├── .env               # Environment variables (create this)
├── .env.example       # Environment variables template
├── .gitignore         # Git ignore file
├── package.json       # Node.js dependencies
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## Key Concepts Demonstrated

### Indexing

The examples show two ways to index data into Weaviate:

1. **Local files**: Using `file://` URLs to index local documents
2. **Web URLs**: Using HTTP/HTTPS URLs to index web content

### Retrieval

The examples demonstrate:

1. **Basic retrieval**: Simple vector search with k-nearest neighbors
2. **Filtered retrieval**: Using Weaviate filters to narrow down results
3. **Distance thresholds**: Setting similarity thresholds for results

### Integration with Genkit

The examples show how to:

1. Configure the Weaviate plugin with embedders
2. Use retrievers in Genkit flows
3. Use indexers in Genkit flows
4. Combine retrieval with LLM generation (RAG pattern)

## Troubleshooting

### Connection Issues

If you can't connect to Weaviate:

1. Verify Weaviate is running: `docker ps`
2. Check the connection settings in `.env`
3. Ensure the port (default 8080) is not blocked

### Embedding Issues

If you get embedding errors:

1. Verify your OpenAI API key is correct
2. Check you have sufficient API credits
3. Ensure the embedding model exists (`text-embedding-3-small`)

### Build Errors

If you encounter build errors:

1. Ensure you've built the main plugin: `npm run build` in the root directory
2. Delete `node_modules` and `package-lock.json`, then run `npm install` again
3. Make sure you're using Node.js >= 20.0.0

## Learn More

- [genkitx-weaviate Documentation](https://github.com/xavidop/genkitx-weaviate)
- [Firebase Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Weaviate Documentation](https://weaviate.io/developers/weaviate)
- [Weaviate Client Documentation](https://weaviate.io/developers/weaviate/client-libraries/typescript)

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](../LICENSE) file for details.
