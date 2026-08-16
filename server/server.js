const express = require("express");
const cors = require("cors");

// Import scrapers
const searchFlyRobo = require("./scrapers/flyrobo");
// Import your other scrapers here (e.g., robu, quadkart, etc.)

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("RC Price Aggregator API is running.");
});

// Search API route
app.get("/api/search", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    // Run scrapers in parallel
    const resultsArrays = await Promise.all([
      searchFlyRobo(query),
      // Add execution calls for other scrapers here
    ]);

    // Flatten all scraper results into a single array
    const allResults = resultsArrays.flat();

    return res.json({
      query,
      storesChecked: resultsArrays.length,
      totalStores: resultsArrays.length,
      storesWithResults: resultsArrays.filter((arr) => arr.length > 0).length,
      totalResults: allResults.length,
      results: allResults,
    });
  } catch (error) {
    console.error("Search Handler Error:", error);
    return res.status(500).json({ error: "Failed to fetch search results." });
  }
});

// Bind to Render dynamic port or fallback to 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});