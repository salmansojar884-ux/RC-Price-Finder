const axios = require('axios');
const cheerio = require('cheerio');

async function searchHiTechXYZ(query) {
  try {
    const url = `https://hitechxyz.in/?s=${encodeURIComponent(query)}&post_type=product`;
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const results = [];

    $('.product').each((_, el) => {
      const name = $(el).find('.woocommerce-loop-product__title, .product-title').text().trim();
      const link = $(el).find('a').attr('href');
      const priceText = $(el).find('.price .amount').last().text().replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);

      if (name && link && !isNaN(price)) {
        results.push({
          store: 'HiTech XYZ',
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

module.exports = searchHiTechXYZ;