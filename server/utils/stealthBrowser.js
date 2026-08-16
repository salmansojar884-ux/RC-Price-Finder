const axios = require("axios");

async function fetchPageHtml(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error.message);
    throw error;
  }
}

// Fallback dummy browser launcher if referenced elsewhere
async function launchStealthBrowser() {
  throw new Error("Puppeteer is disabled to prevent Render resource exhaustion. Use Axios/Cheerio instead.");
}

module.exports = { fetchPageHtml, launchStealthBrowser };