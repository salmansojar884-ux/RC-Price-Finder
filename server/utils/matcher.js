function matchesProduct(title, query) {
  if (!title || !query) return false;
  
  const titleLower = title.toLowerCase();
  const keywords = query.toLowerCase().trim().split(/\s+/);
  
  // Returns true if every word typed in search exists inside the product name
  return keywords.every(keyword => titleLower.includes(keyword));
}

module.exports = { matchesProduct };