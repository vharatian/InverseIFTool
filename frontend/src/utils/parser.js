export function parseEvaluation(text) {
  const result = {
    gradingBasis: null,
    score: null,
    json: null,
    explanation: null,
  };

  // Helper to extract section content
  const extractSection = (label) => {
    const regex = new RegExp(
      `\\[${label}\\]:\\s*([\\s\\S]*?)(?=\\n\\[|$)`,
      "i"
    );
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  // Grading Basis (JSON)
  const gradingBasisRaw = extractSection("Grading Basis");
  if (gradingBasisRaw) {
    try {
      result.gradingBasis = JSON.parse(gradingBasisRaw);
    } catch {
      throw new Error("Invalid JSON in [Grading Basis]");
    }
  }

  // Score
  const scoreRaw = extractSection("Score");
  if (scoreRaw) {
    const numMatch = scoreRaw.match(/(\d+(\.\d+)?)/);
    result.score = numMatch ? Number(numMatch[1]) : scoreRaw;
  }

  // JSON
  const jsonRaw = extractSection("JSON");
  if (jsonRaw) {
    try {
      result.json = JSON.parse(jsonRaw);
    } catch {
      throw new Error("Invalid JSON in [JSON]");
    }
  }

  // Explanation
  result.explanation = extractSection("Explanation");

  return result;
}
