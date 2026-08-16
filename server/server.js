import express from "express";
import cors from "cors";

// Import scrapers using ESM syntax
import searchRobu from "./scrapers/robu.js";
import searchRobocraze from "./scrapers/robocraze.js";
import searchSilverline from "./scrapers/silverline.js";
import searchDRKStore from "./scrapers/drkstore.js";
import searchAnubisRC from "./scrapers/anubisrc.js";
import searchVortexRC from "./scrapers/vortexrc.js";
import searchTanishRC from "./scrapers/tanishrc.js";
import searchFlyRobo from "./scrapers/flyrobo.js";
import searchHiTechXYZ from "./scrapers/hitechxyz.js";
import searchIndianRoboStore from "./scrapers/indianrobostore.js";
import searchFPVStore from "./scrapers/fpvstore.js";
import searchRCMumbai from "./scrapers/rcmumbai.js";
import searchFPVGuru from "./scrapers/fpvguru.js";
import searchQuadKart from "./scrapers/quadkart.js";

const app = express();

// Global CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

const stores = [
  { name: "Robu", url: "https://robu.in/" },
  { name: "Robocraze", url: "https://robocraze.com/" },
  { name: "Silverline Electronics", url: "https://www.silverlineelectronics.in/" },
  { name: "DRK Store", url: "https://www.drkstore.in/" },
  { name: "Anubis RC", url: "https://anubisrc.com/" },
  { name: "Vortex RC", url: "https://www.vortex-rc.com/" },
  { name: "Tanish RC", url: "https://tanishrc.in/" },
  { name: "FlyRobo", url: "https://www.flyrobo.in/" },
  { name: "HiTech XYZ", url: "https://hitechxyz.in/" },
  { name: "Indian Robo Store", url: "https://indianrobostore.com/" },
  { name: "FPV Store", url: "https://fpvstore.in/" },
  { name: "RC Mumbai", url: "https://rcmumbai.com/" },
  { name: "FPV Guru", url: "https://fpvguru.in/" },
  { name: "QuadKart", url: "https://www.quadkart.in/" },
];

const searchEngines = [
  { name: "Robu", search: searchRobu },
  { name: "Robocraze", search: searchRobocraze },
  { name: "Silverline Electronics", search: searchSilverline },
  { name: "DRK Store", search: searchDRKStore },
  { name: "Anubis RC", search: searchAnubisRC },
  { name: "Vortex RC", search: searchVortexRC },
  { name: "Tanish RC", search: searchTanishRC },
  { name: "FlyRobo", search: searchFlyRobo },
  { name: "HiTech XYZ", search: searchHiTechXYZ },
  { name: "Indian Robo Store", search: searchIndianRoboStore },
  { name: "FPV Store", search: searchFPVStore },
  { name: "RC Mumbai", search: searchRCMumbai },
  { name: "FPV Guru", search: searchFPVGuru },
  { name: "QuadKart", search: searchQuadKart },
];

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "RC Price Finder API is running",
    connectedStores: searchEngines.length,
    totalStores: stores.length,
  });
});

// Stores list endpoint
app.get("/api/stores", (req, res) => {
  res.json(stores);
});

// Search API route across all 14 stores
app.get("/api/search", async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: "Please provide a valid search query." });
  }

  try {
    const resultsFromStores = await Promise.all(
      searchEngines.map(async (store) => {
        try {
          return await store.search(query);
        } catch (error) {
          console.error(`Error scraping ${store.name}:`, error.message);
          return [];
        }
      })
    );

    const rawResults = resultsFromStores.flat();
    const uniqueResults = [];
    const seen = new Set();

    for (const item of rawResults) {
      if (!item || !item.url) continue;
      const key = `${item.store || "Store"}|${item.url}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(item);
      }
    }

    uniqueResults.sort((a, b) => {
      if (a.price === null || a.price === undefined) return 1;
      if (b.price === null || b.price === undefined) return -1;
      return a.price - b.price;
    });

    const storesWithResults = new Set(uniqueResults.map((item) => item.store));

    return res.json({
      query,
      storesChecked: searchEngines.length,
      totalStores: stores.length,
      storesWithResults: storesWithResults.size,
      totalResults: uniqueResults.length,
      results: uniqueResults,
    });
  } catch (error) {
    console.error("Search Handler Error:", error);
    return res.status(500).json({ error: "Failed to fetch search results.", details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 RC Price Finder API running on port ${PORT}`);
  console.log(`🏪 Connected stores: ${searchEngines.length} / ${stores.length}`);
});