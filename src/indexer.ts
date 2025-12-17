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

import { indexerRef, Document } from "@genkit-ai/ai/retriever";
import { z, type Genkit } from "genkit";
import { WeaviateClientWrapper, CollectionConfig } from "./client";
import { v4 as uuidv4 } from "uuid";
import type { EmbedderArgument } from "genkit/embedder";

/**
 * Schema for Weaviate indexer options.
 */
export const WeaviateIndexerOptionsSchema = z.object({
  /**
   * Whether to create the collection if it doesn't exist.
   */
  createCollectionIfMissing: z.boolean().optional().default(true),

  /**
   * Custom collection configuration.
   */
  collectionConfig: z
    .object({
      description: z.string().optional(),
      properties: z
        .array(
          z.object({
            name: z.string(),
            dataType: z.string(),
            description: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export type WeaviateIndexerOptions = z.infer<
  typeof WeaviateIndexerOptionsSchema
>;

/**
 * Creates a reference to a Weaviate indexer.
 *
 * @param params Configuration for the indexer reference
 * @param params.collectionName Name of the Weaviate collection
 * @param params.displayName Optional display name for the indexer
 * @returns An indexer reference object
 *
 * @example
 * ```typescript
 * const indexer = weaviateIndexerRef({
 *   collectionName: 'Documents'
 * });
 * ```
 */
export const weaviateIndexerRef = (params: {
  collectionName: string;
  displayName?: string;
}) => {
  return indexerRef({
    name: `weaviate/${params.collectionName}`,
    info: {
      label: params.displayName ?? `Weaviate - ${params.collectionName}`,
    },
    configSchema: WeaviateIndexerOptionsSchema.optional(),
  });
};

/**
 * Creates a Weaviate indexer action.
 *
 * This indexer stores documents and their embeddings in a Weaviate collection.
 * It automatically creates the collection if it doesn't exist.
 *
 * @param ai Genkit instance
 * @param collectionName Name of the Weaviate collection to index into
 * @param client Weaviate client wrapper instance
 * @param embedder The embedder to use for generating embeddings
 * @param embedderOptions Optional embedder options
 * @returns An indexer action that can be used with Genkit
 *
 * @example
 * ```typescript
 * const indexer = weaviateIndexer(ai, 'Documents', client, textEmbedding004);
 * await ai.index({
 *   indexer,
 *   documents: [
 *     { text: 'Hello world', metadata: { source: 'test' } }
 *   ]
 * });
 * ```
 */
export function weaviateIndexer<EmbedderCustomOptions extends z.ZodTypeAny>(
  ai: Genkit,
  collectionName: string,
  client: WeaviateClientWrapper,
  embedder: EmbedderArgument<EmbedderCustomOptions>,
  embedderOptions?: z.infer<EmbedderCustomOptions>,
) {
  return ai.defineIndexer(
    {
      name: `weaviate/${collectionName}`,
      configSchema: WeaviateIndexerOptionsSchema.optional(),
    },
    async (docs: Document[], options?: WeaviateIndexerOptions) => {
      // Create collection if it doesn't exist and option is enabled
      if (options?.createCollectionIfMissing !== false) {
        const collectionConfig: CollectionConfig = {
          name: collectionName,
          description: options?.collectionConfig?.description,
          properties: options?.collectionConfig?.properties,
        };
        await client.createCollection(collectionConfig);
      }

      // Generate embeddings for all documents
      const embeddings = await Promise.all(
        docs.map((doc) =>
          ai.embed({
            embedder,
            content: doc,
            options: embedderOptions,
          }),
        ),
      );

      // Prepare objects for insertion
      const objects = embeddings
        .map((value, i) => {
          const doc = docs[i];
          const docEmbeddings = value;

          // Create one doc per docEmbedding
          const embeddingDocs = doc.getEmbeddingDocuments(docEmbeddings);

          return docEmbeddings.map((docEmbedding, j) => {
            return {
              id: uuidv4(),
              properties: {
                content: embeddingDocs[j].data,
                contentType: embeddingDocs[j].dataType || "",
                metadata: JSON.stringify(embeddingDocs[j].metadata || {}),
              },
              vector: docEmbedding.embedding,
            };
          });
        })
        .flat();

      // Insert objects into Weaviate
      await client.insertObjects(collectionName, objects);
    },
  );
}
