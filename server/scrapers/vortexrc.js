const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.vortex-rc.com";

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
    search.includes("set") ||
    search.includes("power pack");

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

async function searchVortexRC(query) {
  try {
    console.log(`🔎 Vortex RC search: ${query}`);

    /*
      Vortex-RC uses WooCommerce/WordPress.

      We first use the site's normal search page.
    */

    const searchUrl =
      `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=product`;

    console.log(`   🌐 Vortex URL: ${searchUrl}`);

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

    const products = [];
    const seen = new Set();

    /*
      WooCommerce product links normally contain /product/
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

      /*
        Remove tracking/query parameters.
      */
      const url = href.split("?")[0];

      if (seen.has(url)) {
        return;
      }

      /*
        Try several common WooCommerce title selectors.
      */
      let name = link
        .find(
          "h1, h2, h3, h4, .woocommerce-loop-product__title, .product-title"
        )
        .first()
        .text()
        .trim();

      /*
        If title wasn't found inside the link,
        try the surrounding product container.
      */
      if (!name) {
        const container = link.closest(
          ".product, .type-product, li.product"
        );

        name = container
          .find(
            ".woocommerce-loop-product__title, .product-title, h2, h3"
          )
          .first()
          .text()
          .trim();
      }

      if (!name || name.length < 5) {
        return;
      }

      /*
        Ignore duplicate/buttons.
      */
      if (normalize(name) === "add to cart") {
        return;
      }

      if (normalize(name) === "read more") {
        return;
      }

      if (normalize(name) === "quick view") {
        return;
      }

      /*
        Make sure the product actually matches
        the user's search.
      */
      if (!matchesProduct(name, query)) {
        return;
      }

      /*
        Remove bundles when user searches for
        an individual component.
      */
      if (isBundleProduct(name, query)) {
        console.log(
          `🚫 Vortex RC bundle removed: ${name}`
        );
        return;
      }

      /*
        Find price from the product card.
      */
      const container = link.closest(
        ".product, .type-product, li.product"
      );

      let priceText = container
        .find(
          ".price, .woocommerce-Price-amount, .amount"
        )
        .first()
        .text()
        .trim();

      /*
        Sometimes the link itself contains the price.
      */
      if (!priceText) {
        priceText = link.text().trim();
      }

      /*
        Extract Indian Rupee price.
      */
      const priceMatch = priceText
        .replace(/,/g, "")
        .match(/(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d+)?)/i);

      const price = priceMatch
        ? Number(priceMatch[1])
        : null;

      seen.add(url);

      products.push({
        store: "Vortex RC",
        name,
        price,
        currency: "INR",
        url,
      });
    });

    /*
      If normal search didn't find anything,
      try the WooCommerce product search endpoint.
    */
    if (products.length === 0) {
      console.log(
        "   🔄 Trying Vortex RC shop search..."
      );

      const shopUrl =
        `${BASE_URL}/shop/?s=${encodeURIComponent(query)}&post_type=product`;

      const shopResponse = await axios.get(shopUrl, {
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

      const $$ = cheerio.load(shopResponse.data);

      $$(
        "li.product a.woocommerce-LoopProduct-link, li.product a[href*='/product/']"
      ).each((index, element) => {
        const link = $$(element);

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
            ".woocommerce-loop-product__title, h2, h3"
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
            `🚫 Vortex RC bundle removed: ${name}`
          );
          return;
        }

        const container = link.closest(
          "li.product, .product"
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
            /(?:₹|Rs\.?|INR)?\s*(\d+(?:\.\d+)?)/i
          );

        const price = priceMatch
          ? Number(priceMatch[1])
          : null;

        seen.add(url);

        products.push({
          store: "Vortex RC",
          name,
          price,
          currency: "INR",
          url,
        });
      });
    }

    console.log(
      `✅ Vortex RC exact matches: ${products.length}`
    );

    return products;
  } catch (error) {
    console.error(
      `❌ Vortex RC error: ${error.message}`
    );

    return [];
  }
}

module.exports = searchVortexRC;