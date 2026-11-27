import { pipeline, env } from "@huggingface/transformers";
import { Embeddings } from "@langchain/core/embeddings";
import path from "path";

env.cacheDir =
  process.env.MODEL_CACHE_DIR ||
  path.join(process.cwd(), ".model-cache");

env.allowLocalModels = false;

const createExtractor = () =>
  pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2",
    {
      dtype: "q8",
      device: "cpu",
    }
  );

let extractorPromise:
  ReturnType<typeof createExtractor> | null = null;

const getExtractor = async () => {
  if (!extractorPromise) {
    console.log("Loading local embedding model...");

    extractorPromise = createExtractor().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
};

class LocalEmbeddings extends Embeddings {
  constructor() {
    super({
      maxConcurrency: 1,
      maxRetries: 0,
    });
  }

  async embedDocuments(
    texts: string[]
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const extractor = await getExtractor();

    const vectors: number[][] = [];
    const batchSize = 4;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const output = await extractor(batch, {
        pooling: "mean",
        normalize: true,
      });

      vectors.push(...(output.tolist() as number[][]));

      console.log(
        `Embedded ${vectors.length}/${texts.length} chunks`
      );
    }

    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const vectors = await this.embedDocuments([text]);

    return vectors[0];
  }
}

export const embeddings = new LocalEmbeddings();