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

import weaviate, {
  WeaviateClient,
  ApiKey,
  type WeaviateObject,
  type FilterValue,
} from "weaviate-client";

/**
 * Configuration parameters for the Weaviate client.
 */
export interface WeaviateClientParams {
  /**
   * The hostname of the Weaviate instance (without protocol).
   * @example "localhost", "my-cluster.weaviate.network"
   */
  host: string;

  /**
   * The port of the HTTP server.
   * @default 8080 for local, 443 for cloud
   */
  port?: number;

  /**
   * The port of the gRPC server.
   * @default 50051 for local
   */
  grpcPort?: number;

  /**
   * Whether to use a secure connection (HTTPS/gRPC secure).
   * @default false for local, true for cloud
   */
  secure?: boolean;

  /**
   * Optional API key for authentication.
   */
  apiKey?: string;

  /**
   * Optional custom headers.
   */
  headers?: Record<string, string>;

  /**
   * Optional timeout in milliseconds.
   * @default 30000
   */
  timeout?: number;
}

/**
 * Parameters for collection configuration.
 */
export interface CollectionConfig {
  /**
   * Name of the collection.
   */
  name: string;

  /**
   * Description of the collection.
   */
  description?: string;

  /**
   * Properties of the collection.
   */
  properties?: Array<{
    name: string;
    dataType: string;
    description?: string;
  }>;
}

/**
 * Result from a search query.
 */
export interface SearchResult {
  /**
   * Array of matching objects.
   */
  objects: WeaviateObject<undefined, undefined>[];

  /**
   * Total number of results.
   */
  total?: number;
}

/**
 * Wrapper class for Weaviate client operations.
 * Provides simplified methods for interacting with Weaviate vector database.
 */
export class WeaviateClientWrapper {
  private client!: WeaviateClient;
  private params: WeaviateClientParams;
  private initPromise: Promise<void>;

  constructor(params: WeaviateClientParams) {
    this.params = params;
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    // Prepare common connection options
    const connectionOptions = {
      headers: this.params.headers,
      ...(this.params.apiKey && {
        authCredentials: new ApiKey(this.params.apiKey),
      }),
    };

    // Initialize the Weaviate client
    if (this.params.apiKey) {
      this.client = await weaviate.connectToWeaviateCloud(
        this.params.host,
        connectionOptions,
      );
    } else {
      // Local connection - use defaults for local if not specified
      const port = this.params.port ?? 8080;
      const grpcPort = this.params.grpcPort ?? 50051;

      this.client = await weaviate.connectToLocal({
        host: this.params.host,
        port,
        grpcPort,
        ...connectionOptions,
      });
    }
  }

  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Get the underlying Weaviate client.
   */
  async getClient(): Promise<WeaviateClient> {
    await this.ensureInitialized();
    return this.client;
  }

  /**
   * Check if a collection exists.
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    await this.ensureInitialized();
    try {
      const collection = this.client.collections.get(collectionName);
      await collection.config.get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a collection if it doesn't exist.
   */
  async createCollection(config: CollectionConfig): Promise<void> {
    await this.ensureInitialized();
    const exists = await this.collectionExists(config.name);
    if (exists) {
      return;
    }

    await this.client.collections.create({
      name: config.name,
      description: config.description,
      vectorizers: weaviate.configure.vectorizer.none(), // Use self-provided vectors
      properties: [
        {
          name: "content",
          dataType: weaviate.configure.dataType.TEXT,
          description: "Document content",
        },
        {
          name: "metadata",
          dataType: weaviate.configure.dataType.TEXT,
          description: "Document metadata as JSON string",
        },
      ],
    });
  }

  /**
   * Insert objects into a collection.
   */
  async insertObjects(
    collectionName: string,
    objects: Array<{
      properties: Record<string, unknown>;
      vector: number[];
      id?: string;
    }>,
  ): Promise<void> {
    await this.ensureInitialized();
    const collection = this.client.collections.get(collectionName);

    // Use insertMany for batch insertion
    await collection.data.insertMany(
      objects.map(
        (obj) =>
          ({
            ...(obj.id && { id: obj.id }),
            properties: obj.properties as Record<string, string>,
            vectors: obj.vector,
          }) as const,
      ),
    );
  }

  /**
   * Search for similar vectors in a collection.
   *
   * @param collectionName Name of the collection to search
   * @param vector The query vector
   * @param limit Maximum number of results to return
   * @param options Search options including filters
   * @param options.distance Maximum distance threshold for results
   * @param options.filters Weaviate filters - use weaviate.filter() to build complex filters,
   *                        or pass a FilterValue directly. For simple property equality,
   *                        the retriever will handle basic metadata filtering.
   * @returns Search results with matching objects
   */
  async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    options?: {
      distance?: number;
      filters?: FilterValue;
    },
  ): Promise<SearchResult> {
    await this.ensureInitialized();
    const collection = this.client.collections.get(collectionName);

    // Build query options
    const result = await collection.query.nearVector(vector, {
      limit,
      returnMetadata: ["distance"],
      ...(options?.distance !== undefined && { distance: options.distance }),
      ...(options?.filters && { filters: options.filters }),
    });

    return {
      objects: result.objects,
      total: result.objects.length,
    };
  }

  /**
   * Delete objects from a collection.
   */
  async deleteObjects(collectionName: string, ids: string[]): Promise<void> {
    await this.ensureInitialized();
    const collection = this.client.collections.get(collectionName);

    for (const id of ids) {
      await collection.data.deleteById(id);
    }
  }

  /**
   * Delete a collection.
   */
  async deleteCollection(collectionName: string): Promise<void> {
    await this.ensureInitialized();
    await this.client.collections.delete(collectionName);
  }

  /**
   * Get collection statistics.
   */
  async getCollectionStats(collectionName: string): Promise<{
    objectCount: number;
    name: string;
  }> {
    await this.ensureInitialized();
    const collection = this.client.collections.get(collectionName);
    const config = await collection.config.get();

    // Get object count using aggregate
    const aggregate = await collection.aggregate.overAll();

    return {
      name: config.name,
      objectCount: aggregate.totalCount,
    };
  }

  /**
   * Close the client connection.
   */
  async close(): Promise<void> {
    // Weaviate client v3 doesn't require explicit closing
    // This method is here for compatibility
  }
}
