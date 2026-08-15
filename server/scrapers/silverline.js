const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.silverlineelectronics.in";

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesProduct(name, query) {
  const product = normalize(name);
  const search = normalize(query);

  const tokens = search.split(" ");
  return tokens.every((token) => product.includes(token));
}

function isBundleProduct(name, query) {
  const product = normalize(name);
  const search = normalize(query);

  const userWantsBundle =
    search.includes("bundle") ||
    search.includes("combo") ||
    search.includes("kit") ||
    search.includes("set") ||
    search.includes("pack");

  if (userWantsBundle) return false;

  const bundleWords = [
    "bundle",
    "combo",
    "starter kit",
    "complete kit",
    "frame kit",
    "motor and",
    "motor with",
    "esc and",
    "esc with",
    "propeller",
    "propellers",
    "accessories pack",
    "pack",
  ];

  return bundleWords.some((word) => product.includes(word));
}

async function searchSilverline(query) {
  console.log(`🔎 Silverline search: ${query}`);

  const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;

  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(data);
    const results = [];
    const seen = new Set();

    $(
      ".card, .product-card, .product-item, .grid__item, article.product-grid-item"
    ).each((_, el) => {
      const container = $(el);

      let name = container
        .find(
          "h2, h3, .card__heading, .product-title, .product-card__title, .product-item__title"
        )
        .first()
        .text()
        .trim();

      if (!name || name.length < 3) return;

      const linkTag = container.find('a[href*="/products/"]').first();
      let link = linkTag.attr("href");

      if (!link) return;
      if (!link.startsWith("http")) link = `${BASE_URL}${link}`;
      link = link.split("?")[0].split("#")[0];

      if (seen.has(link)) return;

      if (!matchesProduct(name, query)) return;
      if (isBundleProduct(name, query)) {
        console.log(`🚫 Silverline bundle removed: ${name}`);
        return;
      }

      let priceText = container
        .find(".price, .money, .price-item--sale, .price-item, .product-price")
        .first()
        .text()
        .trim();

      const priceMatch = priceText
        .replace(/,/g, "")
        .match(/₹?\s*(\d+(?:\.\d+)?)/);

      const price = priceMatch ? Number(priceMatch[1]) : null;
      const isOutOfStock =
        container.text().toLowerCase().includes("sold out") ||
        container.text().toLowerCase().includes("out of stock");

      seen.add(link);

      results.push({
        store: "Silverline Electronics",
        title: name,
        name: name,
        price: price,
        currency: "INR",
        url: link,
        inStock: !isOutOfStock,
      });
    });

    console.log(`✅ Silverline exact matches: ${results.length}`);
    return results;
  } catch (error) {
    console.error(`❌ Silverline error: ${error.message}`);
    return [];
  }
}

module.exports = searchSilverline;