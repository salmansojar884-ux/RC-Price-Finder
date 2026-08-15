const axios = require('axios');

async function searchQuadKart(query) {
  try {
    const url = `https://www.quadkart.in/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const products = data.resources?.results?.products || [];

    return products.map((item) => ({
      store: 'QuadKart',
      name: item.title,
      price: parseFloat(item.price),
      currency: 'INR',
      url: `https://www.quadkart.in${item.url}`,
    }));
  } catch (error) {
    return [];
  }
}

module.exports = searchQuadKart;