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

import { startFlowServer } from '@genkit-ai/express';
import dotenv from 'dotenv';
import { genkit, z } from 'genkit';
import { Document } from 'genkit/retriever';
import { googleAI } from '@genkit-ai/google-genai';
import { weaviate, weaviateIndexerRef, weaviateRetrieverRef } from 'genkitx-weaviate';
import weaviateClient from 'weaviate-client';
import { chunk } from 'llm-chunk';
import { readFile } from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

dotenv.config();

const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY  }),
    weaviate({
      clientParams: {
        host: process.env.WEAVIATE_HOST || 'localhost',
        port: process.env.WEAVIATE_PORT ? parseInt(process.env.WEAVIATE_PORT) : 8080,
        grpcPort: process.env.WEAVIATE_GRPC_PORT ? parseInt(process.env.WEAVIATE_GRPC_PORT) : 50051,
        apiKey: process.env.WEAVIATE_API_KEY,
      },
      collections: [
        {
          collectionName: 'DemoCollection',
          embedder: 'googleai/text-embedding-004',
          createCollectionIfMissing: true,
        },
      ],
    })
  ],
  model: googleAI.model('gemini-2.5-flash'),
});

/**
 * Example flow demonstrating retrieval from Weaviate.
 * This flow:
 * 1. Takes a query string as input
 * 2. Uses the Weaviate retriever to find relevant documents
 * 3. Generates a response using the retrieved context
 */
export const retrieverFlow = ai.defineFlow(
  {
    name: 'retrieverFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (subject) => {
    const weaviateRetriever = weaviateRetrieverRef({
      collectionName: 'DemoCollection'
    });

    const docs = await ai.retrieve({ 
      retriever: weaviateRetriever, 
      query: subject, 
      options: {
        k: 5,
      }
    });
   
    const llmResponse = await ai.generate({
      prompt: `Using the following context, answer the question: ${subject}`,
      docs: docs,
    });
    
    return llmResponse.text;
  }
);

// Chunking configuration
const chunkingConfig = {
  minLength: 1000,
  maxLength: 2000,
  splitter: 'sentence' as const,
  overlap: 100,
  delimiters: '',
};

// Helper function to extract text from PDF
async function extractTextFromPdf(filePath: string) {
  const pdfFile = path.resolve(filePath);
  const dataBuffer = await readFile(pdfFile);
  const data = await pdf(dataBuffer);
  return data.text;
}

/**
 * Example flow demonstrating indexing local PDF files into Weaviate.
 * This flow:
 * 1. Reads a local PDF file from the doc folder
 * 2. Extracts text from the PDF
 * 3. Chunks the text into smaller segments
 * 4. Indexes the chunks into the Weaviate collection
 */
export const indexerFlow = ai.defineFlow(
  {
    name: 'indexerFlow',
    inputSchema: z.object({ filePath: z.string().describe('PDF file path') }),
    outputSchema: z.object({
      success: z.boolean(),
      documentsIndexed: z.number(),
      error: z.string().optional(),
    }),
  },
  async ({ filePath }) => {
    try {
      filePath = path.resolve(filePath);

      const weaviateIndexer = weaviateIndexerRef({
        collectionName: 'DemoCollection'
      });

      // Read the PDF and extract text
      const pdfTxt = await ai.run('extract-text', () => extractTextFromPdf(filePath));

      // Divide the PDF text into segments
      const chunks = await ai.run('chunk-it', async () => chunk(pdfTxt, chunkingConfig));

      // Convert chunks of text into documents to store in the index
      const documents = chunks.map((text) => {
        return Document.fromText(text, { filePath });
      });

      // Add documents to the index
      await ai.index({
        indexer: weaviateIndexer,
        documents,
      });

      return {
        success: true,
        documentsIndexed: documents.length,
      };
    } catch (err) {
      // For unexpected errors that throw exceptions
      return {
        success: false,
        documentsIndexed: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
);

/**
 * Example flow demonstrating advanced retrieval with filters.
 * This flow shows how to use Weaviate filters to narrow down search results.
 */
export const retrieverWithFiltersFlow = ai.defineFlow(
  {
    name: 'retrieverWithFiltersFlow',
    inputSchema: z.object({
      query: z.string(),
      category: z.string().optional(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    const weaviateRetriever = weaviateRetrieverRef({
      collectionName: 'DemoCollection'
    });

    // Example of using filters with Weaviate
    const filters = input.category 
      ? weaviateClient.filter.byProperty('category').equal(input.category)
      : undefined;

    const docs = await ai.retrieve({ 
      retriever: weaviateRetriever, 
      query: input.query, 
      options: {
        k: 5,
        filters,
        distance: 0.7, // Only return results with similarity > 0.3
      }
    });
   
    const llmResponse = await ai.generate({
      prompt: `Using the following context, answer the question: ${input.query}`,
      docs: docs,
    });
    
    return llmResponse.text;
  }
);

startFlowServer({
  flows: [retrieverFlow, indexerFlow, retrieverWithFiltersFlow],
});
