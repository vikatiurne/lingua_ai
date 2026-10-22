// Function words are never vocabulary to learn — mistakes with them are
// grammar. Shared by the evaluator and the deterministic candidate collectors.
export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "so", "to",
  "of", "in", "on", "at", "by", "for", "with", "about", "from", "as", "into",
  "over", "under", "it", "its", "this", "that", "these", "those", "is", "am",
  "are", "was", "were", "be", "been", "being", "has", "have", "had", "do",
  "does", "did", "will", "would", "can", "could", "should", "may", "might",
  "must", "i", "you", "he", "she", "we", "they", "me", "him", "her", "us",
  "them", "my", "your", "his", "our", "their", "not", "no", "yes", "there",
  "here", "one",
]);
