export class EmbeddingService {
  constructor(private embeddingServiceUrl: string) {}

  async generateEmbeddings(
    texts: string[],
    textType: "query" | "document" = "query",
  ): Promise<number[][]> {
    console.log("Fetching embeddings from:", this.embeddingServiceUrl);

    const response = await fetch(`${this.embeddingServiceUrl}/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texts, text_type: textType }),
    });

    console.log("Embedding response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Embedding service error:", errorText);
      throw new Error("Failed to generate embeddings");
    }

    const { embeddings } = await response.json();
    console.log("Embeddings generated:", embeddings.length);

    return embeddings;
  }

  generateQueryVariations(
    userQuery: string,
    previousMessage?: string,
  ): string[] {
    const variations: string[] = [userQuery];

    // 1. With previous context (for follow-up questions)
    if (previousMessage && previousMessage.length < 200) {
      variations.push(`${previousMessage} ${userQuery}`.trim());
    }

    // 2. Extract key terms for focused search (remove question words)
    const questionWords = [
      "apa",
      "bagaimana",
      "mengapa",
      "dimana",
      "siapa",
      "kapan",
      "berapa",
      "what",
      "how",
      "why",
      "where",
      "who",
      "when",
      "yang",
      "kamu",
      "ketahui",
      "tentang",
      "adalah",
      "you",
      "know",
      "about",
      "the",
      "is",
      "are",
    ];

    // Create a focused version by removing filler words
    const words = userQuery.split(/\s+/);
    const keyTerms = words.filter(
      (w) => !questionWords.includes(w.toLowerCase()) && w.length > 2,
    );
    if (keyTerms.length >= 2) {
      variations.push(keyTerms.join(" "));
    }

    // 3. HyDE-lite: Declarative statements that match document style
    if (userQuery.length < 150) {
      // Indonesian declarative
      variations.push(`Informasi ${keyTerms.join(" ")}`);
      // Document-style match
      variations.push(`${keyTerms.join(" ")} adalah`);
    }

    // Deduplicate and limit to 5 variations
    const unique = [...new Set(variations)].filter((v) => v.length > 3);
    console.log("[EmbeddingService] Query variations:", unique);
    return unique.slice(0, 5);
  }
}
