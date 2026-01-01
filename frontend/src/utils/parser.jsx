/**
 * Parse evaluation response from judge LLM into structured format
 * @param {string} text - Raw evaluation text from judge LLM
 * @returns {Object} Parsed evaluation result
 * @property {Object|null} gradingBasis - Parsed JSON grading criteria results
 * @property {number|null} score - Numerical score (0 or 1)
 * @property {Object|null} json - Parsed JSON data with answer_score
 * @property {string|null} explanation - Text explanation of the evaluation
 * @throws {Error} If JSON parsing fails for grading basis or JSON sections
 */
export function parseEvaluation(text) {
  const result = {
    gradingBasis: null,
    score: null,
    json: null,
    explanation: null,
  }

  // Helper to extract section content
  const extractSection = (label) => {
    const regex = new RegExp(`\\[${label}\\]:\\s*([\\s\\S]*?)(?=\\n\\[|$)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }

  // Log the raw text for debugging
  console.log(
    'Parsing evaluation response:',
    text.substring(0, 500) + (text.length > 500 ? '...' : ''),
  )

  // Grading Basis (JSON)
  const gradingBasisRaw = extractSection('Grading Basis')
  if (gradingBasisRaw) {
    try {
      result.gradingBasis = JSON.parse(gradingBasisRaw)
    } catch {
      throw new Error('Invalid JSON in [Grading Basis]')
    }
  }

  // Score
  const scoreRaw = extractSection('Score')
  if (scoreRaw) {
    const numMatch = scoreRaw.match(/(\d+(\.\d+)?)/)
    result.score = numMatch ? Number(numMatch[1]) : scoreRaw
  }

  // JSON
  const jsonRaw = extractSection('JSON')
  if (jsonRaw) {
    try {
      result.json = JSON.parse(jsonRaw)
    } catch {
      throw new Error('Invalid JSON in [JSON]')
    }
  }

  // Explanation
  result.explanation = extractSection('Explanation')

  // If score not found, try from JSON answer_score, then calculate from gradingBasis
  if (result.score == null) {
    if (result.json && typeof result.json.answer_score === 'number') {
      result.score = result.json.answer_score
      if (!result.explanation) {
        result.explanation = `Score from JSON: ${result.score}`
      }
    } else if (result.gradingBasis) {
      const criteriaCount = Object.keys(result.gradingBasis).length
      const passCount = Object.values(result.gradingBasis).filter(
        (status) => status === 'PASS',
      ).length
      result.score = passCount > criteriaCount / 2 ? 1 : 0
      if (!result.explanation) {
        result.explanation = `Calculated score: ${passCount}/${criteriaCount} criteria passed`
      }
    }
  }

  // Score is only extracted from [Score] section or calculated from [Grading Basis]
  // No fallback extraction from raw text to prevent false positives

  console.log('Parsed evaluation result:', result)
  return result
}
