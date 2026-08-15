const axios = require("axios");
const cheerio = require("cheerio");

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

  // Exact phrase match
  if (product.includes(search)) {
    return true;
  }

  // Require every search word
  const tokens = search.split(" ");

  return tokens.every((token) => {
    return product.includes(token);
  });
}

function isBundleProduct(name, query) {
  const product = normalize(name);
  const search = normalize(query);

  /*
   * When searching for a single component,
   * reject products that are clearly bundles.
   */

  const bundleWords = [
    "bundle",
    "combo",
    "combo kit",
    "kit",
    "set",
    "pack",
    "frame kit",
    "motor and",
    "motor with",
    "motor +",
    "esc and",
    "esc with",
    "esc +",
    "propeller",
    "propellers",
    "battery and",
    "battery with",
    "charger and",
    "charger with",
  ];

  /*
   * Only apply bundle filtering to component searches.
   *
   * If the user is intentionally searching for a
   * bundle/kit/set, don't remove it.
   */
  const userWantsBundle =
    search.includes("bundle") ||
    search.includes("combo") ||
    search.includes("kit") ||
    search.includes("set") ||
    search.includes("pack");

  if (userWantsBundle) {
    return false;
  }

  return bundleWords.some((word) => product.includes(word));
}

async function searchRobocraze(query) {
  const searchUrl =
    `https://robocraze.com/search?q=${encodeURIComponent(query)}`;

  try {
    console.log(`🔎 Robocraze search: ${query}`);

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
        : `https://robocraze.com${href}`;

      // Remove duplicate product URLs
      if (seen.has(url)) return;

      let name = link
        .find(
          "h2, h3, .card__heading, .product-title"
        )
        .first()
        .text()
        .trim();

      // Some Shopify cards don't put the name in the heading
      if (!name) {
        name = link.text().trim();
      }

      // Ignore empty/invalid names
      if (!name || name.length < 5) return;

      // Ignore Shopify placeholder
      if (normalize(name) === "notify me") return;

      // STRICT PRODUCT MATCH
      if (!matchesProduct(name, query)) {
        return;
      }

      // REMOVE BUNDLES
      if (isBundleProduct(name, query)) {
        console.log(`🚫 Bundle removed: ${name}`);
        return;
      }

      const container = link.closest(
        ".card, .product-card, .product-item, .grid__item"
      );

      const priceText = container
        .find(".price, .money, .price-item")
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
        store: "Robocraze",
        name,
        price,
        currency: "INR",
        url,
      });
    });

    console.log(
      `✅ Robocraze exact matches: ${products.length}`
    );

    return products;
  } catch (error) {
    console.error(
      `❌ Robocraze error: ${error.message}`
    );

    return [];
  }
}

module.exports = searchRobocraze;