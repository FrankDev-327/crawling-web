const axios = require("axios");
const cheerio = require("cheerio");

const MAX_PAGES = 100;
const visited = new Set();
const queue = ["https://ipfabric.io/"];

function normalize(url) {
    try {
        const u = new URL(url);
        u.hash = "";        
        return u.toString();
    } catch {
        return null;
    }
}

function extractLinks(html, baseUrl) {
    const links = [];
    const $ = cheerio.load(html);

    $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        try {
            const url = new URL(href, baseUrl);
            if (url.protocol.startsWith("http") || url.protocol.startsWith("https")) {
                const normalizedUrl = normalize(url.toString());
                if (normalizedUrl) links.push(normalizedUrl);
            }
        } catch {
            console.error("extract like failed:", url);
         }
    });

    return links;
}

async function crawl() {
    while (queue.length && visited.size < MAX_PAGES) {
        const url = queue.shift();
        if (visited.has(url)) continue;

        visited.add(url);
        console.log("Crawling:", url);

        try {
            const res = await axios.get(url, { timeout: 5000, validateStatus: function (status) {
                return status >= 200 && status < 300;;
            }});
            const links = extractLinks(res.data, url);

            if (links.length > 0) {
                for (const link of links) {
                    if (!visited.has(link)) {
                        queue.push(link);
                    }
                }
            }

        } catch {
            console.error("Failed:", url);
        }
    }

    console.log(`Done. Visited ${visited.size} pages.`);
}

crawl();