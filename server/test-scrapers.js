const fs = require("fs");
const path = require("path");

// Target scrapers folder inside /server
const scrapersDir = path.join(__dirname, "scrapers");

if (!fs.existsSync(scrapersDir)) {
  console.error(`❌ Directory not found: ${scrapersDir}`);
  process.exit(1);
}

const scraperFiles = fs.readdirSync(scrapersDir).filter((file) => file.endsWith(".js"));

const scrapers = scraperFiles.map((file) => {
  const name = file.replace(".js", "");
  return {
    name,
    fn: require(path.join(scrapersDir, file)),
  };
});

const TEST_QUERIES = [
  "2207.5 motor",
  "flysky i6",
];

function validateResult(item) {
  const errors = [];
  if (!item.store) errors.push("missing store");
  if (!item.title && !item.name) errors.push("missing title/name");
  if (typeof item.price !== "number" && item.price !== null) errors.push("invalid price format");
  if (item.currency !== "INR") errors.push("invalid currency");
  if (!item.url || !item.url.startsWith("http")) errors.push("invalid url");
  if (typeof item.inStock !== "boolean") errors.push("missing/invalid inStock");
  return errors;
}

async function runTests() {
  console.log("========================================");
  console.log(`🚀 TESTING ${scrapers.length} SCRAPERS FROM /server/scrapers`);
  console.log("========================================\n");

  for (const query of TEST_QUERIES) {
    console.log(`\n🔍 --- QUERY: "${query}" ---`);
    const startTime = Date.now();

    const results = await Promise.allSettled(
      scrapers.map(async (s) => {
        const start = Date.now();
        const items = await s.fn(query);
        const duration = Date.now() - start;
        return { scraper: s.name, items, duration };
      })
    );

    let totalProducts = 0;

    results.forEach((res, index) => {
      const scraperName = scrapers[index].name;

      if (res.status === "rejected") {
        console.log(`❌ [${scraperName}] FAILED (Error: ${res.reason.message})`);
        return;
      }

      const { items, duration } = res.value;
      totalProducts += items.length;

      let schemaErrors = 0;
      items.forEach((item) => {
        const errs = validateResult(item);
        if (errs.length > 0) schemaErrors++;
      });

      const schemaStatus = schemaErrors === 0 ? "Schema Valid ✅" : `Schema Errors: ${schemaErrors} ⚠️`;
      console.log(
        `📦 [${scraperName}] Found ${items.length} items in ${duration}ms (${schemaStatus})`
      );

      if (items.length > 0) {
        const sample = items[0];
        console.log(
          `   └─ Sample: "${sample.title || sample.name}" | ₹${sample.price} | InStock: ${sample.inStock}`
        );
      }
    });

    console.log(`\n⏱️ Total Query Time: ${Date.now() - startTime}ms | Total Matches: ${totalProducts}`);
  }

  console.log("\n========================================");
  console.log("🎉 TEST COMPLETE");
  console.log("========================================");
}

runTests();