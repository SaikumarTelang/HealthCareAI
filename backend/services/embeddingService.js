const { GoogleGenerativeAI } = require("@google/generative-ai");

class EmbeddingService {
  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    }
  }

  async getEmbedding(text) {
    if (!this.model) return null;
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error("Embedding generation error:", error);
      return null;
    }
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  euclideanDistance(vecA, vecB) {
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      sum += Math.pow(vecA[i] - vecB[i], 2);
    }
    return Math.sqrt(sum);
  }

  async getTopMatches(query, documents, limit = 3) {
    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) return [];

    const matches = await Promise.all(documents.map(async (doc) => {
      const docEmbedding = await this.getEmbedding(doc.text || doc.keywords.join(' '));
      if (!docEmbedding) return { ...doc, similarity: 0 };
      
      return {
        ...doc,
        similarity: this.cosineSimilarity(queryEmbedding, docEmbedding),
        distance: this.euclideanDistance(queryEmbedding, docEmbedding)
      };
    }));

    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
}

module.exports = new EmbeddingService();
