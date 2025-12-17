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

import {
  CommonRetrieverOptionsSchema,
  Document,
  retrieverRef,
} from "@genkit-ai/ai/retriever";
import { z, type Genkit } from "genkit";
import { WeaviateClientWrapper } from "./client";
import type { EmbedderArgument } from "genkit/embedder";
import type { FilterValue } from "weaviate-client";

/**
 * Schema for Weaviate retriever options.
 */
const WeaviateRetrieverOptionsSchema = CommonRetrieverOptionsSchema.extend({
  /**
   * Optional distance threshold for filtering results.
   * Lower values mean more similar results.
   */
  distance: z.number().optional(),

  /**
   * Optional Weaviate filters to apply to the query.
   * Use weaviate.filter() API to construct complex filters.
   * This is passed directly to the Weaviate query.
   */
  filters: z.custom<FilterValue>().optional(),
});

export type WeaviateRetrieverOptions = z.infer<
  typeof WeaviateRetrieverOptionsSchema
>;

/**
 * Creates a reference to a Weaviate retriever.
 *
 * @param params Configuration for the retriever reference
 * @param params.collectionName Name of the Weaviate collection
 * @param params.displayName Optional display name for the retriever
 * @returns A retriever reference object
 *
 * @example
 * ```typescript
 * const retriever = weaviateRetrieverRef({
 *   collectionName: 'Documents'
 * });
 * ```
 */
export const weaviateRetrieverRef = (params: {
  collectionName: string;
  displayName?: string;
}) => {
  return retrieverRef({
    name: `weaviate/${params.collectionName}`,
    info: {
      label: params.displayName ?? `Weaviate - ${params.collectionName}`,
    },
    configSchema: WeaviateRetrieverOptionsSchema.optional(),
  });
};

/**
 * Creates a Weaviate retriever action.
 *
 * This retriever searches for similar documents in a Weaviate collection
 * based on vector similarity.
 *
 * @param ai Genkit instance
 * @param collectionName Name of the Weaviate collection to search
 * @param client Weaviate client wrapper instance
 * @param embedder The embedder to use for generating query embeddings
 * @param embedderOptions Optional embedder options
 * @returns A retriever action that can be used with Genkit
 *
 * @example
 * ```typescript
 * const retriever = weaviateRetriever(ai, 'Documents', client, textEmbedding004);
 * const results = await ai.retrieve({
 *   retriever,
 *   query: 'What is machine learning?',
 *   options: { k: 5 }
 * });
 * ```
 */
export function weaviateRetriever<EmbedderCustomOptions extends z.ZodTypeAny>(
  ai: Genkit,
  collectionName: string,
  client: WeaviateClientWrapper,
  embedder: EmbedderArgument<EmbedderCustomOptions>,
  embedderOptions?: z.infer<EmbedderCustomOptions>,
) {
  return ai.defineRetriever(
    {
      name: `weaviate/${collectionName}`,
      configSchema: WeaviateRetrieverOptionsSchema,
    },
    async (content: Document, options: WeaviateRetrieverOptions) => {
      // Generate embeddings for the query content
      const queryEmbeddings = await ai.embed({
        embedder,
        content,
        options: embedderOptions,
      });

      // Search for similar documents using the first embedding
      const results = await client.search(
        collectionName,
        queryEmbeddings[0].embedding,
        options.k ?? 10,
        {
          distance: options.distance,
          filters: options.filters,
        },
      );

      // Convert Weaviate objects to Genkit documents
      const documents = results.objects.map((obj) => {
        const properties = obj.properties as Record<string, unknown>;
        const contentText = (properties.content || "") as string;
        const contentType = (properties.contentType || "") as string;

        // Parse metadata if it's a JSON string
        let metadata: Record<string, unknown> | undefined;
        if (properties.metadata) {
          try {
            metadata = JSON.parse(properties.metadata as string) as Record<
              string,
              unknown
            >;
          } catch {
            metadata = { metadata: properties.metadata };
          }
        }

        // Add distance from metadata if available
        if (obj.metadata?.distance !== undefined && metadata) {
          metadata._distance = obj.metadata.distance;
        }

        return Document.fromData(contentText, contentType, metadata);
      });

      return {
        documents,
      };
    },
  );
}
