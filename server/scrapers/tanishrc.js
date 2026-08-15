const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://tanishrc.in";

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
    "starter kit",
    "complete kit",
    "frame kit",
    "power pack",
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

function extractPrice(text) {
  if (!text) {
    return null;
  }

  const clean = text.replace(/,/g, "");

  const matches = [
    /₹\s*(\d+(?:\.\d+)?)/i,
    /Rs\.?\s*(\d+(?:\.\d+)?)/i,
    /INR\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of matches) {
    const match = clean.match(pattern);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

async function searchTanishRC(query) {
  console.log(`🔎 Tanish RC search: ${query}`);

  const searchUrls = [
    `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=product`,
    `${BASE_URL}/shop/?s=${encodeURIComponent(query)}&post_type=product`,
    `${BASE_URL}/?post_type=product&s=${encodeURIComponent(query)}`,
  ];

  const products = [];
  const seen = new Set();

  for (let page = 0; page < searchUrls.length; page++) {
    const searchUrl = searchUrls[page];

    try {
      console.log(`   🌐 Tanish URL: ${searchUrl}`);

      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language":
            "en-US,en;q=0.9",
        },
        timeout: 20000,
      });

      const $ = cheerio.load(response.data);

      /*
       * Try WooCommerce product links.
       */
      $('a[href*="/product/"]').each((index, element) => {
        const link = $(element);

        let href = link.attr("href");

        if (!href) {
          return;
        }

        if (!href.startsWith("http")) {
          href = `${BASE_URL}${href}`;
        }

        const url = href.split("?")[0];

        if (seen.has(url)) {
          return;
        }

        let name = link
          .find(
            "h1, h2, h3, h4, .woocommerce-loop-product__title, .product-title, .product-name"
          )
          .first()
          .text()
          .trim();

        /*
         * Sometimes title is in the parent product card.
         */
        if (!name) {
          const container = link.closest(
            "li.product, .product, .type-product, .product-card, .product-item"
          );

          name = container
            .find(
              ".woocommerce-loop-product__title, .product-title, .product-name, h2, h3, h4"
            )
            .first()
            .text()
            .trim();
        }

        /*
         * Last fallback.
         */
        if (!name) {
          name = link.text().trim();
        }

        if (!name || name.length < 5) {
          return;
        }

        const normalizedName = normalize(name);

        if (
          normalizedName === "add to cart" ||
          normalizedName === "read more" ||
          normalizedName === "quick view" ||
          normalizedName === "notify me"
        ) {
          return;
        }

        /*
         * Strict matching.
         */
        if (!matchesProduct(name, query)) {
          return;
        }

        /*
         * Remove bundles for component searches.
         */
        if (isBundleProduct(name, query)) {
          console.log(
            `🚫 Tanish RC bundle removed: ${name}`
          );
          return;
        }

        const container = link.closest(
          "li.product, .product, .type-product, .product-card, .product-item"
        );

        let priceText = "";

        if (container.length) {
          priceText = container
            .find(
              ".price, .woocommerce-Price-amount, .amount, .product-price"
            )
            .first()
            .text()
            .trim();
        }

        if (!priceText) {
          priceText = link.text().trim();
        }

        const price = extractPrice(priceText);

        seen.add(url);

        products.push({
          store: "Tanish RC",
          name,
          price,
          currency: "INR",
          url,
        });
      });

      /*
       * Also look for product cards that may not use
       * the standard WooCommerce selectors.
       */
      $(
        ".product, .product-card, .product-item, li.type-product"
      ).each((index, element) => {
        const card = $(element);

        let name = card
          .find(
            ".woocommerce-loop-product__title, .product-title, .product-name, h2, h3, h4"
          )
          .first()
          .text()
          .trim();

        if (!name || name.length < 5) {
          return;
        }

        if (!matchesProduct(name, query)) {
          return;
        }

        if (isBundleProduct(name, query)) {
          console.log(
            `🚫 Tanish RC bundle removed: ${name}`
          );
          return;
        }

        const linkElement = card
          .find("a[href*='/product/']")
          .first();

        let href = linkElement.attr("href");

        if (!href) {
          return;
        }

        if (!href.startsWith("http")) {
          href = `${BASE_URL}${href}`;
        }

        const url = href.split("?")[0];

        if (seen.has(url)) {
          return;
        }

        const priceText = card
          .find(
            ".price, .woocommerce-Price-amount, .amount, .product-price"
          )
          .first()
          .text()
          .trim();

        const price = extractPrice(priceText);

        seen.add(url);

        products.push({
          store: "Tanish RC",
          name,
          price,
          currency: "INR",
          url,
        });
      });

      /*
       * If we found products, no need to keep trying
       * alternative search URLs.
       */
      if (products.length > 0) {
        break;
      }

    } catch (error) {
      console.error(
        `❌ Tanish RC page ${page + 1} error: ${error.message}`
      );
    }
  }

  console.log(
    `✅ Tanish RC exact matches: ${products.length}`
  );

  return products;
}

module.exports = searchTanishRC;