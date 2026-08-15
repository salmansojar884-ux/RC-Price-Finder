const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.flyrobo.in";

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

  return tokens.every((token) => product.includes(token));
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
    "complete kit",
    "frame kit",
    "motor and",
    "motor with",
    "esc and",
    "esc with",
    "propeller",
    "propellers"
  ];

  return bundleWords.some((word) =>
    product.includes(word)
  );
}

async function searchFlyRobo(query) {
  const searchUrl =
    `${BASE_URL}/catalogsearch/result/?q=${encodeURIComponent(query)}`;

  try {
    console.log(`🔎 FlyRobo search: ${query}`);
    console.log(`   🌐 FlyRobo URL: ${searchUrl}`);

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 20000
    });

    const $ = cheerio.load(response.data);

    const products = [];
    const seen = new Set();

    $('a[href]').each((index, element) => {
      const link = $(element);
      const href = link.attr("href");

      if (!href) return;

      let name = link
        .find(
          "h2, h3, .product-item-link, .product-name, .product-title"
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
        console.log(
          `🚫 FlyRobo bundle removed: ${name}`
        );
        return;
      }

      let url = href;

      if (url.startsWith("/")) {
        url = `${BASE_URL}${url}`;
      }

      if (!url.startsWith(BASE_URL)) {
        return;
      }

      if (seen.has(url)) {
        return;
      }

      const container = link.closest(
        ".product-item, .product, .item, .product-item-info"
      );

      const priceText = container
        .find(
          ".price, .price-box, .price-wrapper, .special-price, .regular-price"
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
        store: "FlyRobo",
        name,
        price,
        currency: "INR",
        url
      });
    });

    console.log(
      `✅ FlyRobo exact matches: ${products.length}`
    );

    return products;

  } catch (error) {
    console.error(
      `❌ FlyRobo error: ${error.message}`
    );

    return [];
  }
}

module.exports = searchFlyRobo;