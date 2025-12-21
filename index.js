const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

const MAX_PAGES = 100;
const visited = new Set();
const START_URL = "https://ipfabric.io/";
const queue = [START_URL];

function saveErrorUrlMessage(url, message) {
    const logMessage = url !== "" ? `URL : ${url}: Message - ${message}\n` : `Message - ${message}\n`;
    fs.appendFileSync("logs.txt", logMessage);
}

function normalize(url) {
    try {
        const u = new URL(url);
        u.hash = "";
        return u.toString();
    } catch (error) {
        return null;
    }
}

function extractLinks(html, baseUrl) {
    const links = [];
    const $ = cheerio.load(html);

    $("a[href]").each(async (_, el) => {
        try {
            const href = $(el).attr("href");
            let url = new URL(href, baseUrl);

            if (url?.protocol.includes("http") || url?.protocol.includes("https")) {
                const normalizedUrl = normalize(url.toString());
                if (normalizedUrl) links.push(normalizedUrl);
            }
        } catch (error) {
            saveErrorUrlMessage("", "extract link failed : " + error.message);
        }
    });

    return links;
}

async function crawl() {
    while (queue.length && visited.size < MAX_PAGES) {
        const url = queue.shift();
        if (visited.has(url)) continue;

        visited.add(url);
        //saveErrorUrlMessage("Crawling url success : " + url, "");
        console.log("Crawling url : " + url);

        try {
            const res = await axios.get(url, {
                timeout: 15000, validateStatus: function (status) {
                    return status >= 200 && status <= 300;
                }
            });

            const links = extractLinks(res.data, url);
            if (links.length > 0) {
                for (const link of links) {
                    if (!visited.has(link)) {
                        queue.push(link);
                    }
                }
            }

        } catch (error) {
            saveErrorUrlMessage(url, "Crawling failed : " + error.message);
        }
    }

    console.log(`Done. Visited ${visited.size} pages.`);
}

(async () => {
    await crawl();
})();