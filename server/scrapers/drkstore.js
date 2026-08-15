const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.drkstore.in";

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
    "starter kit",
    "complete kit",
    "frame kit",
    "motor and",
    "motor with",
    "esc and",
    "esc with",
    "propeller",
    "propellers",
  ];

  return bundleWords.some((word) =>
    product.includes(word)
  );
}

async function searchDRKStore(query) {
  console.log(`🔎 DRK Store search: ${query}`);

  const results = [];
  const seen = new Set();

  try {
    // DRK has 761+ products and displays 12 products per page.
    // Search the first 20 catalog pages.
    for (let page = 1; page <= 20; page++) {

      const shopUrl =
        page === 1
          ? `${BASE_URL}/shop/`
          : `${BASE_URL}/shop/page/${page}/`;

      console.log(`   📄 DRK Store page ${page}`);

      let response;

      try {
        response = await axios.get(shopUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

            "Accept-Language":
              "en-US,en;q=0.9",

            Connection:
              "keep-alive",
          },

          timeout: 30000,

          maxRedirects: 5,
        });

      } catch (error) {
        console.log(
          `   ⚠️ DRK page ${page} failed: ${error.message}`
        );

        continue;
      }

      const $ = cheerio.load(response.data);

      $(
        "li.product, .product.type-product"
      ).each((index, element) => {

        const product = $(element);

        let name = product
          .find(
            ".woocommerce-loop-product__title"
          )
          .first()
          .text()
          .trim();

        if (!name) {
          name = product
            .find("h2, h3")
            .first()
            .text()
            .trim();
        }

        if (!name || name.length < 3) {
          return;
        }

        const link = product
          .find("a")
          .first();

        let url = link.attr("href");

        if (!url) {
          return;
        }

        if (!url.startsWith("http")) {
          url = `${BASE_URL}${url}`;
        }

        if (seen.has(url)) {
          return;
        }

        // Strict search matching
        if (!matchesProduct(name, query)) {
          return;
        }

        // Remove bundles for individual-component searches
        if (isBundleProduct(name, query)) {
          console.log(
            `🚫 DRK Store bundle removed: ${name}`
          );

          return;
        }

        let priceText = product
          .find(
            ".price, .woocommerce-Price-amount, .amount"
          )
          .first()
          .text()
          .trim();

        const priceMatch = priceText
          .replace(/,/g, "")
          .match(/₹?\s*(\d+(?:\.\d+)?)/);

        const price = priceMatch
          ? Number(priceMatch[1])
          : null;

        seen.add(url);

        results.push({
          store: "DRK Store",
          name,
          price,
          currency: "INR",
          url,
        });
      });

      // If the page has no products, stop.
      const productCount = $(
        "li.product, .product.type-product"
      ).length;

      if (productCount === 0) {
        console.log(
          `   ⛔ No products found on page ${page}.`
        );

        break;
      }
    }

    console.log(
      `✅ DRK Store exact matches: ${results.length}`
    );

    return results;

  } catch (error) {

    console.error(
      `❌ DRK Store error: ${error.message}`
    );

    return [];
  }
}

module.exports = searchDRKStore;