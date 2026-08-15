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

  if (product.includes(search)) {
    return true;
  }

  const tokens = search.split(" ");

  return tokens.every((token) => {
    return product.includes(token);
  });
}

function isBundleProduct(name, query) {
  const product = normalize(name);
  const search = normalize(query);

  const userWantsBundle =
    search.includes("bundle") ||
    search.includes("combo") ||
    search.includes("kit") ||
    search.includes("set");

  if (userWantsBundle) {
    return false;
  }

  const bundleWords = [
    "bundle",
    "combo",
    "combo kit",
    "starter kit",
    "accessories pack",
    "pack",
  ];

  return bundleWords.some((word) =>
    product.includes(word)
  );
}

async function searchSilverline(query) {
  const searchUrl =
    `${BASE_URL}/search?q=${encodeURIComponent(query)}`;

  try {
    console.log(`🔎 Silverline search: ${query}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    const products = [];
    const seen = new Set();

    $('a[href*="/products/"]').each((index, element) => {
      const link = $(element);
      const href = link.attr("href");

      if (!href) return;

      const url = href.startsWith("http")
        ? href
        : `${BASE_URL}${href}`;

      if (seen.has(url)) return;

      let name = link
        .find(
          "h2, h3, .card__heading, .product-title, .product-card__title"
        )
        .first()
        .text()
        .trim();

      if (!name) {
        name = link.text().trim();
      }

      if (!name || name.length < 5) {
        return;
      }

      if (!matchesProduct(name, query)) {
        return;
      }

      if (isBundleProduct(name, query)) {
        console.log(`🚫 Silverline bundle removed: ${name}`);
        return;
      }

      const container = link.closest(
        ".card, .product-card, .product-item, .grid__item"
      );

      const priceText = container
        .find(
          ".price, .money, .price-item, .product-price"
        )
        .first()
        .text()
        .trim();

      const match = priceText
        .replace(/,/g, "")
        .match(/₹?\s*(\d+(?:\.\d+)?)/);

      const price = match
        ? Number(match[1])
        : null;

      seen.add(url);

      products.push({
        store: "Silverline Electronics",
        name,
        price,
        currency: "INR",
        url,
      });
    });

    console.log(
      `✅ Silverline exact matches: ${products.length}`
    );

    return products;
  } catch (error) {
    console.error(
      `❌ Silverline error: ${error.message}`
    );

    return [];
  }
}

module.exports = searchSilverline;