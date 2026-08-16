function matchesProduct(title, query) {
  if (!title || !query) return false;
  
  const titleLower = title.toLowerCase();
  const keywords = query.toLowerCase().trim().split(/\s+/);
  
  return keywords.every(keyword => titleLower.includes(keyword));
}

module.exports = { matchesProduct };