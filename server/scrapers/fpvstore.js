const axios = require('axios');

async function searchFPVStore(query) {
  try {
    const url = `https://fpvstore.in/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const products = data.resources?.results?.products || [];

    return products.map((item) => ({
      store: 'FPV Store',
      name: item.title,
      price: parseFloat(item.price),
      currency: 'INR',
      url: `https://fpvstore.in${item.url}`,
    }));
  } catch (error) {
    return [];
  }
}

module.exports = searchFPVStore;