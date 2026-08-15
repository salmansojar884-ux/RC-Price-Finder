const cheerio = require('cheerio');
const { fetchPageHtml } = require('../utils/stealthBrowser');
const { matchesProduct } = require('../utils/matcher');

const BASE_URL = 'https://robu.in';

async function searchRobu(query) {
    console.log(`🔎 Robu search: ${query}`);
    const results = [];
    const seen = new Set();
    let html = '';

    try {
        html = await fetchPageHtml(`${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=product`);
    } catch (e) {
        console.error(`❌ Robu fetch error: ${e.message}`);
        return [];
    }

    try {
        if (!html) return [];
        const $ = cheerio.load(html);

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
    } catch (e) {
        console.error(`❌ Robu parse error: ${e.message}`);
        return [];
    }
}

module.exports = searchRobu;