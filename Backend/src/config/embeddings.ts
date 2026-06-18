import { HuggingFaceInferenceEmbeddings }
from "@langchain/community/embeddings/hf";
import dotenv from 'dotenv'
dotenv.config();

export const embeddings =
  new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: "sentence-transformers/all-MiniLM-L6-v2",
  });