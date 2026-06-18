import { processDocumentForRAG, retrieveRelevantChunks, askDocument } from './src/services/ragService';

async function test() {
  try {
    await processDocumentForRAG("test-doc-id", "The capital of France is Paris.");
    console.log("SUCCESS processing");
    const docs = await retrieveRelevantChunks("test-doc-id", "What is the capital of France?");
    console.log("SUCCESS retrieving, found chunks:", docs.length);
    const result = await askDocument("test-doc-id", "What is the capital of France?");
    console.log("SUCCESS askDocument:", result.answer);
  } catch (e) {
    console.error("ERROR:", e);
  }
}

test();

test();
