const axios = require("axios");
const cheerio = require("cheerio");

async function searchRobu(query) {
  const searchUrl =
    `https://robu.in/?s=${encodeURIComponent(query)}` +
    `&post_type=product`;

  try {
    console.log(`🔎 Robu search: ${query}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    const products = [];

    $("li.product, .product").each((index, element) => {
      if (products.length >= 20) return;

      const item = $(element);

      const name = item
        .find(
          ".woocommerce-loop-product__title, .product-title, h2, h3"
        )
        .first()
        .text()
        .trim();

      const url = item
        .find("a")
        .first()
        .attr("href");

      const priceText = item
        .find(".price")
        .first()
        .text()
        .trim();

      if (!name || !url) return;

      const priceMatch = priceText
        .replace(/,/g, "")
        .match(/₹?\s*(\d+(?:\.\d+)?)/);

      const price = priceMatch
        ? Number(priceMatch[1])
        : null;

      products.push({
        store: "Robu",
        name,
        price,
        currency: "INR",
        url,
      });
    });

    console.log(`✅ Robu results: ${products.length}`);

    return products;
  } catch (error) {
    console.error("❌ Robu error:", error.message);

    return [];
  }
}

module.exports = searchRobu;