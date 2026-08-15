const axios = require('axios');
const cheerio = require('cheerio');
const { matchesProduct } = require('../utils/matcher');

const BASE_URL = 'https://robu.in';

async function searchRobu(query) {
    console.log(`🔎 Robu search: ${query}`);
    const results = [];
    const seen = new Set();

    try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=product`;
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);

        $('.product, .product-small, .product-item').each((_, element) => {
            const container = $(element);
            const title = container.find('.woocommerce-loop-product__title, .name, .product-title').text().trim();

            if (!title || !matchesProduct(title, query)) return;

            let url = container.find('a.woocommerce-LoopProduct-link, a').attr('href');
            if (!url || seen.has(url)) return;
            seen.add(url);

            const priceText = container.find('.price').text();
            const match = priceText.replace(/,/g, '').match(/₹?\s*(\d+(?:\.\d+)?)/);
            const price = match ? Number(match[1]) : null;

            const inStock = !container.hasClass('outofstock') && !container.text().toLowerCase().includes('out of stock');

            results.push({
                store: 'Robu',
                title: title,
                name: title,
                price: price,
                currency: 'INR',
                url: url,
                inStock: inStock
            });
        });

        console.log(`✅ Robu exact matches: ${results.length}`);
        return results;
    } catch (error) {
        console.error(`❌ Robu error: ${error.message}`);
        return [];
    }
}

module.exports = searchRobu;