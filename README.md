<h1 align="center">
   Genkit <> Weaviate Plugin
</h1>

<h4 align="center">Weaviate Community Plugin for Google Genkit</h4>

<div align="center">
   <img alt="GitHub version" src="https://img.shields.io/github/v/release/xavidop/genkitx-weaviate">
   <img alt="NPM Downloads" src="https://img.shields.io/npm/dw/genkitx-weaviate">
   <img alt="GitHub License" src="https://img.shields.io/github/license/xavidop/genkitx-weaviate">
   <img alt="Static Badge" src="https://img.shields.io/badge/yes-a?label=maintained">
</div>

<div align="center">
   <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues/xavidop/genkitx-weaviate?color=blue">
   <img alt="GitHub Issues or Pull Requests" src="https://img.shields.io/github/issues-pr/xavidop/genkitx-weaviate?color=blue">
   <img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/xavidop/genkitx-weaviate">
</div>

</br>

**`genkitx-weaviate`** is a community plugin for using [Weaviate](https://weaviate.io/) vector database with
[Genkit](https://github.com/firebase/genkit). Built by [**Xavier Portilla Edo**](https://github.com/xavidop).

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Configuration Options](#configuration-options)
- [Usage](#usage)
  - [Indexer](#indexer)
    - [Basic Examples](#basic-examples)
    - [Within a Flow](#within-a-flow)
  - [Retriever](#retriever)
    - [Basic Examples](#basic-examples-1)
    - [Within a Flow](#within-a-flow-1)
- [Examples](#examples)
- [Features](#features)
- [API Reference](#api-reference)
  - [Main Exports](#main-exports)
- [Contributing](#contributing)
- [Need Support?](#need-support)
- [Credits](#credits)
- [License](#license)


## Installation

Install the plugin in your project with your favorite package manager:

```bash
npm install genkitx-weaviate
```

or

```bash
pnpm add genkitx-weaviate
```

## Configuration

To use the plugin, you need to configure it with your Weaviate instance details:

```typescript
import { genkit } from 'genkit';
import { weaviate } from 'genkitx-weaviate';
import { textEmbedding004 } from '@genkit-ai/vertexai';

const ai = genkit({
  plugins: [
    weaviate({
      clientParams: {
        host: 'localhost', // or 'your-cluster.weaviate.network' for Weaviate Cloud
        port: 8080, // optional, defaults to 8080 for local, 443 for cloud
        grpcPort: 50051, // optional, defaults to 50051 for local
        apiKey: process.env.WEAVIATE_API_KEY, // optional, for Weaviate Cloud
      },
      collections: [
        {
          collectionName: 'Documents',
          embedder: textEmbedding004,
        },
      ],
    }),
  ],
});
```

### Configuration Options

- **clientParams**: Configuration for the Weaviate client
  - `host`: Hostname of your Weaviate instance (without protocol) - e.g., `'localhost'` or `'my-cluster.weaviate.network'`
  - `port`: Optional HTTP port (default: 8080 for local, 443 for cloud)
  - `grpcPort`: Optional gRPC port (default: 50051 for local)
  - `secure`: Optional boolean for secure connection (default: false for local, true for cloud)
  - `apiKey`: Optional API key for authentication (required for Weaviate Cloud)
  - `headers`: Optional custom headers
  - `timeout`: Optional timeout in milliseconds (default: 30000)

- **collections**: Array of collection configurations
  - `collectionName`: Name of the Weaviate collection
  - `embedder`: Optional embedder to use for this collection
  - `embedderOptions`: Optional embedder configuration
  - `createCollectionIfMissing`: Whether to create the collection if it doesn't exist (default: true)
  - `collectionConfig`: Optional collection configuration

## Usage

The plugin provides two main functionalities: `index` and `retrieve`. You can use them directly or within a Genkit flow.

### Indexer

The indexer stores documents and their embeddings in a Weaviate collection.

#### Basic Examples

```typescript
import { weaviateIndexerRef } from 'genkitx-weaviate';

const indexer = weaviateIndexerRef({
  collectionName: 'Documents',
});

const documents = [
  { 
    text: 'Weaviate is a vector database',
    metadata: { source: 'docs' }
  },
  { 
    text: 'Genkit is an AI framework',
    metadata: { source: 'docs' }
  },
];

await ai.index({ indexer, documents });
```

#### Within a Flow

```typescript
export const indexerFlow = ai.defineFlow(
  {
    name: 'indexerFlow',
    inputSchema: z.array(z.object({
      text: z.string(),
      metadata: z.record(z.any()).optional(),
    })),
    outputSchema: z.string(),
  },
  async (documents) => {
    const indexer = weaviateIndexerRef({
      collectionName: 'Documents',
    });

    await ai.index({ indexer, documents });
    return 'Documents indexed successfully';
  }
);
```

### Retriever

The retriever searches for similar documents in a Weaviate collection based on vector similarity.

#### Basic Examples

```typescript
import { weaviateRetrieverRef } from 'genkitx-weaviate';

const retriever = weaviateRetrieverRef({
  collectionName: 'Documents',
});

const results = await ai.retrieve({ 
  retriever, 
  query: 'What is a vector database?',
  options: {
    k: 5, // Number of results to return
    distance: 0.7, // Optional distance threshold
  }
});
```

#### Within a Flow

```typescript
export const retrieverFlow = ai.defineFlow(
  {
    name: 'retrieverFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (query) => {
    const retriever = weaviateRetrieverRef({
      collectionName: 'Documents',
    });

    const docs = await ai.retrieve({ 
      retriever, 
      query,
      options: { k: 5 }
    });

    const llmResponse = await ai.generate({
      prompt: `Answer the question based on the following context:\n\nContext: ${docs.map(d => d.text).join('\n\n')}\n\nQuestion: ${query}`,
    });

    return llmResponse.text;
  }
);
```

## Examples

You can find more examples in the [examples](./examples/) folder.

## Features

- **Easy Integration**: Simple setup with Genkit
- **Multiple Collections**: Support for multiple Weaviate collections
- **Flexible Configuration**: Customizable collection settings
- **Type Safety**: Full TypeScript support
- **Latest Weaviate Client**: Uses weaviate-client v3.10.0
- **Auto-Collection Creation**: Automatically creates collections if they don't exist
- **Metadata Support**: Store and retrieve document metadata
- **Distance Filtering**: Filter results by similarity distance
- **Batch Operations**: Efficient batch insertion and retrieval

## API Reference

For detailed API documentation, please refer to the TypeScript definitions in the source code.

### Main Exports

- `weaviate(params)`: Main plugin function
- `weaviateIndexerRef(params)`: Create an indexer reference
- `weaviateRetrieverRef(params)`: Create a retriever reference
- `WeaviateClientWrapper`: Client wrapper class
- Types: `WeaviatePluginParams`, `WeaviateClientParams`, `CollectionConfig`

## Contributing

Want to contribute to the project? That's awesome! Head over to our [Contribution Guidelines](./CONTRIBUTING.md).

## Need Support?

> [!NOTE]  
> This repository depends on Google's Genkit. For issues and questions related to Genkit, please refer to instructions available in [Genkit's repository](https://github.com/firebase/genkit).

Reach out by opening a discussion on [GitHub Discussions](https://github.com/xavidop/genkitx-weaviate/discussions).

## Credits

This plugin is proudly maintained by [**Xavier Portilla Edo**](https://github.com/xavidop).

## License

This project is licensed under the [Apache 2.0 License](./LICENSE).

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-lightgrey.svg)](./LICENSE)
