const cheerio = require("cheerio");
const axios = require("axios");
const matchesProduct = require("../utils/matcher");

const BASE_URL = "https://www.quadkart.in";

async function searchQuadKart(query) {
  console.log(`🔎 QuadKart search: ${query}`);
  const results = [];
  const seen = new Set();

  try {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    $(".product, li.product, div.product-small").each((_, el) => {
      const container = $(el);
      const name = container.find(".product-title, .name, h2, h3, .woocommerce-loop-product__title, a").first().text().trim();
      if (!name || !matchesProduct(name, query)) return;

      let link = container.find("a").first().attr("href");
      if (!link || seen.has(link)) return;
      seen.add(link);

      let priceText = container.find(".price").text().trim();
      let matches = priceText.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
      let price = matches && matches.length > 0 ? parseFloat(matches[matches.length - 1]) : null;

      results.push({
        store: "QuadKart",
        title: name,
        name: name,
        price: price,
        currency: "INR",
        url: link,
        inStock: !container.text().toLowerCase().includes("out of stock")
      });
    });

    console.log(`✅ QuadKart exact matches: ${results.length}`);
    return results;
  } catch (e) {
    console.error(`❌ QuadKart error: ${e.message}`);
    return [];
  }
}

module.exports = searchQuadKart;