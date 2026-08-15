const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://anubisrc.com";

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

  const wantsBundle =
    search.includes("bundle") ||
    search.includes("combo") ||
    search.includes("kit") ||
    search.includes("set");

  if (wantsBundle) {
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

  return bundleWords.some((word) => {
    return product.includes(word);
  });
}

async function searchAnubisRC(query) {
  console.log(`🔎 Anubis RC search: ${query}`);

  const results = [];
  const seen = new Set();

  try {
    // ============================================
    // USE WORDPRESS SEARCH
    // ============================================

    const searchUrl =
      `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=product`;

    console.log(
      `   🌐 Anubis URL: ${searchUrl}`
    );

    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9",

        Referer:
          `${BASE_URL}/`,

        Connection:
          "keep-alive",
      },

      timeout: 30000,

      maxRedirects: 10,
    });

    const $ = cheerio.load(response.data);

    // ============================================
    // FIND PRODUCT LINKS
    // ============================================

    $('a[href*="/product/"]').each(
      (index, element) => {

        const link = $(element);

        let url = link.attr("href");

        if (!url) {
          return;
        }

        if (!url.startsWith("http")) {
          url = `${BASE_URL}${url}`;
        }

        // Remove URL fragments
        url = url.split("#")[0];

        if (seen.has(url)) {
          return;
        }

        // ========================================
        // GET PRODUCT NAME
        // ========================================

        let name = link
          .find(
            "h2, h3, h4, .woocommerce-loop-product__title"
          )
          .first()
          .text()
          .trim();

        if (!name) {
          name = link.text().trim();
        }

        if (!name || name.length < 3) {
          return;
        }

        // ========================================
        // IGNORE NON-PRODUCT LINKS
        // ========================================

        const normalizedName = normalize(name);

        if (
          normalizedName === "read more" ||
          normalizedName === "quick view" ||
          normalizedName === "add to cart"
        ) {
          return;
        }

        // ========================================
        // STRICT MATCH
        // ========================================

        if (!matchesProduct(name, query)) {
          return;
        }

        // ========================================
        // REMOVE BUNDLES
        // ========================================

        if (isBundleProduct(name, query)) {
          console.log(
            `🚫 Anubis bundle removed: ${name}`
          );

          return;
        }

        // ========================================
        // FIND PRICE
        // ========================================

        const container = link.closest(
          "li, article, .product, .type-product"
        );

        let priceText = container
          .find(
            ".price, .woocommerce-Price-amount, .amount"
          )
          .first()
          .text()
          .trim();

        if (!priceText) {
          priceText = link
            .parent()
            .find(
              ".price, .woocommerce-Price-amount, .amount"
            )
            .first()
            .text()
            .trim();
        }

        const priceMatch = priceText
          .replace(/,/g, "")
          .match(
            /₹?\s*(\d+(?:\.\d+)?)/ 
          );

        const price = priceMatch
          ? Number(priceMatch[1])
          : null;

        seen.add(url);

        results.push({
          store: "Anubis RC",
          name,
          price,
          currency: "INR",
          url,
        });
      }
    );

    // ============================================
    // IF SEARCH RESULTS DIDN'T WORK,
    // TRY WORDPRESS SEARCH WITHOUT post_type
    // ============================================

    if (results.length === 0) {

      console.log(
        "   🔄 Trying Anubis secondary search..."
      );

      const fallbackUrl =
        `${BASE_URL}/?s=${encodeURIComponent(query)}`;

      const fallbackResponse =
        await axios.get(fallbackUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

            "Accept-Language":
              "en-US,en;q=0.9",
          },

          timeout: 30000,

          maxRedirects: 10,
        });

      const $$ = cheerio.load(
        fallbackResponse.data
      );

      $$('a[href*="/product/"]').each(
        (index, element) => {

          const link = $$(element);

          let url = link.attr("href");

          if (!url) {
            return;
          }

          if (!url.startsWith("http")) {
            url = `${BASE_URL}${url}`;
          }

          url = url.split("#")[0];

          if (seen.has(url)) {
            return;
          }

          let name = link
            .find(
              "h2, h3, h4, .woocommerce-loop-product__title"
            )
            .first()
            .text()
            .trim();

          if (!name) {
            name = link.text().trim();
          }

          if (!name || name.length < 3) {
            return;
          }

          if (!matchesProduct(name, query)) {
            return;
          }

          if (isBundleProduct(name, query)) {
            console.log(
              `🚫 Anubis bundle removed: ${name}`
            );

            return;
          }

          const container = link.closest(
            "li, article, .product, .type-product"
          );

          const priceText = container
            .find(
              ".price, .woocommerce-Price-amount, .amount"
            )
            .first()
            .text()
            .trim();

          const priceMatch = priceText
            .replace(/,/g, "")
            .match(
              /₹?\s*(\d+(?:\.\d+)?)/ 
            );

          const price = priceMatch
            ? Number(priceMatch[1])
            : null;

          seen.add(url);

          results.push({
            store: "Anubis RC",
            name,
            price,
            currency: "INR",
            url,
          });
        }
      );
    }

    // ============================================
    // REMOVE DUPLICATES
    // ============================================

    const uniqueResults = [];

    const resultUrls = new Set();

    for (const product of results) {

      if (resultUrls.has(product.url)) {
        continue;
      }

      resultUrls.add(product.url);

      uniqueResults.push(product);
    }

    // ============================================
    // SORT CHEAPEST FIRST
    // ============================================

    uniqueResults.sort((a, b) => {

      if (a.price === null) {
        return 1;
      }

      if (b.price === null) {
        return -1;
      }

      return a.price - b.price;
    });

    console.log(
      `✅ Anubis RC exact matches: ${uniqueResults.length}`
    );

    return uniqueResults;

  } catch (error) {

    console.error(
      `❌ Anubis RC error: ${error.message}`
    );

    return [];
  }
}

module.exports = searchAnubisRC;