/**
 * Copyright 2025 Xavier Portilla Edo
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { genkitPlugin, type GenkitPlugin } from "genkit/plugin";
import {
  WeaviateClientWrapper,
  type WeaviateClientParams,
  type CollectionConfig,
} from "./client";
import { weaviateRetriever, weaviateRetrieverRef } from "./retriever";
import { weaviateIndexer, weaviateIndexerRef } from "./indexer";
import type { EmbedderArgument } from "genkit/embedder";
import { z, type Genkit } from "genkit";

/**
 * Configuration for a Weaviate collection in the plugin.
 */
export interface WeaviateCollectionParams {
  /**
   * Name of the collection in Weaviate.
   */
  collectionName: string;

  /**
   * Optional embedder reference to use for this collection.
   * If not provided, you must manually provide embeddings.
   */
  embedder?: EmbedderArgument; // EmbedderArgument type from genkit

  /**
   * Optional custom embedder options.
   */
  embedderOptions?: z.ZodTypeAny;

  /**
   * Whether to create the collection if it doesn't exist.
   * @default true
   */
  createCollectionIfMissing?: boolean;

  /**
   * Optional collection configuration.
   */
  collectionConfig?: Partial<CollectionConfig>;
}

/**
 * Parameters for the Weaviate plugin.
 */
export interface WeaviatePluginParams {
  /**
   * Weaviate client configuration.
   */
  clientParams: WeaviateClientParams;

  /**
   * Array of collections to configure.
   */
  collections: WeaviateCollectionParams[];
}

/**
 * Weaviate plugin for Genkit.
 *
 * This plugin provides indexer and retriever functionality for Weaviate vector database.
 * It supports multiple collections, each with their own configuration.
 *
 * @param params Plugin configuration parameters
 * @returns A Genkit plugin instance
 *
 * @example
 * ```typescript
 * import { genkit } from 'genkit';
 * import { weaviate } from 'genkitx-weaviate';
 * import { textEmbedding004 } from '@genkit-ai/vertexai';
 *
 * const ai = genkit({
 *   plugins: [
 *     weaviate({
 *       clientParams: {
 *         host: 'localhost',
 *         port: 8080,
 *         grpcPort: 50051
 *       },
 *       collections: [
 *         {
 *           collectionName: 'Documents',
 *           embedder: textEmbedding004
 *         }
 *       ]
 *     })
 *   ]
 * });
 *
 * // Use the indexer
 * const indexer = weaviateIndexerRef({ collectionName: 'Documents' });
 * await ai.index({ indexer, documents });
 *
 * // Use the retriever
 * const retriever = weaviateRetrieverRef({ collectionName: 'Documents' });
 * const results = await ai.retrieve({ retriever, query: 'search query' });
 * ```
 */
export function weaviate(params: WeaviatePluginParams): GenkitPlugin {
  return genkitPlugin("weaviate", async (ai: Genkit) => {
    // Create a single client instance for all collections
    const client = new WeaviateClientWrapper(params.clientParams);

    // Configure actions for each collection
    for (const collection of params.collections) {
      // Each collection must have an embedder
      if (!collection.embedder) {
        throw new Error(
          `Embedder is required for collection '${collection.collectionName}'`,
        );
      }

      // Create retriever for this collection
      weaviateRetriever(
        ai,
        collection.collectionName,
        client,
        collection.embedder,
        collection.embedderOptions,
      );

      // Create indexer for this collection
      weaviateIndexer(
        ai,
        collection.collectionName,
        client,
        collection.embedder,
        collection.embedderOptions,
      );
    }
  });
}

// Export all public APIs
export {
  WeaviateClientWrapper,
  type WeaviateClientParams,
  type CollectionConfig,
  weaviateRetriever,
  weaviateRetrieverRef,
  weaviateIndexer,
  weaviateIndexerRef,
};

export default weaviate;
