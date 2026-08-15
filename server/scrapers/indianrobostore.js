const axios = require('axios');
const cheerio = require('cheerio');

async function searchIndianRoboStore(query) {
  try {
    const url = `https://indianrobostore.com/?s=${encodeURIComponent(query)}&post_type=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const results = [];

    $('.product, .product-grid-item').each((_, el) => {
      const name = $(el).find('.wd-entities-title, .product-title').text().trim();
      const link = $(el).find('a').attr('href');
      const priceText = $(el).find('.price .amount').last().text().replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);

      if (name && link && !isNaN(price)) {
        results.push({
          store: 'Indian Robo Store',
          name,
          price,
          currency: 'INR',
          url: link,
        });
      }
    });

    return results;
  } catch (error) {
    return [];
  }
}

module.exports = searchIndianRoboStore;