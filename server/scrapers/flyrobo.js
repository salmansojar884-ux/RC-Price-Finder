const axios = require("axios");
const cheerio = require("cheerio");
const { matchesProduct } = require("../utils/matcher");

const BASE_URL = "https://www.flyrobo.in";

function isBundleProduct(name, query) {
  const product = name.toLowerCase();
  const search = query.toLowerCase();

  const userWantsBundle =
    search.includes("bundle") ||
    search.includes("combo") ||
    search.includes("kit") ||
    search.includes("set");

  if (userWantsBundle) return false;

  const bundleWords = [
    "bundle", "combo", "combo kit", "starter kit", "complete kit",
    "frame kit", "motor and", "motor with", "esc and", "esc with", "propeller", "propellers"
  ];

  return bundleWords.some((word) => product.includes(word));
}

async function searchFlyRobo(query) {
  const searchUrl = `${BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(query)}`;

  try {
    console.log(`🔎 FlyRobo search: ${query}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const products = [];
    const seen = new Set();

    $(".product-item, .product-item-info, .item.product").each((_, element) => {
      const container = $(element);

      const linkTag = container.find("a.product-item-link, a.product-item-photo, a").first();
      let url = linkTag.attr("href");

      if (!url) return;
      if (url.startsWith("/")) url = `${BASE_URL}${url}`;
      if (!url.startsWith(BASE_URL)) return;
      url = url.split("#")[0];

      if (seen.has(url)) return;

      let name = container
        .find(".product-item-link, .product-name, .product-title, h2, h3")
        .first()
        .text()
        .trim();

      if (!name) name = linkTag.text().trim();
      if (!name || name.length < 3) return;

      if (!matchesProduct(name, query)) return;

      if (isBundleProduct(name, query)) {
        console.log(`🚫 FlyRobo bundle removed: ${name}`);
        return;
      }

      const priceText = container
        .find(".price, .price-box, .price-wrapper, .special-price, .regular-price")
        .first()
        .text()
        .trim();

      const match = priceText
        .replace(/,/g, "")
        .match(/₹?\s*(\d+(?:\.\d+)?)/);

      const price = match ? Number(match[1]) : null;
      const isOutOfStock = container.text().toLowerCase().includes("out of stock") || 
                           container.text().toLowerCase().includes("unavailable");

      seen.add(url);

      products.push({
        store: "FlyRobo",
        title: name,
        name: name,
        price: price,
        currency: "INR",
        url: url,
        inStock: !isOutOfStock,
      });
    });

    console.log(`✅ FlyRobo exact matches: ${products.length}`);
    return products;
  } catch (error) {
    console.error(`❌ FlyRobo error: ${error.message}`);
    return [];
  }
}

module.exports = searchFlyRobo;