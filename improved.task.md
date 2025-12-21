# Distributed Web Crawler – Node.js + Redis Cluster

## Overview

This document describes the design and implementation approach for a horizontally scalable web crawler using **Node.js worker processes** and **Redis (optionally Redis Cluster)** for distributed coordination.

The goal is to allow multiple workers to crawl webpages in parallel while avoiding duplicate URL fetching and ensuring completeness comparable to a single-threaded crawler.

---

## Architecture Summary

The crawler consists of:

- **Master process**
  - Spawns multiple Node.js worker processes (`child_process` or `cluster`)
- **Worker processes**
  - Fetch webpages
  - Extract URLs
  - Push newly discovered URLs to a shared queue
- **Redis (or Redis Cluster)**
  - Shared pending URL queue
  - Shared visited URL store

Redis acts as a **central coordination layer** so that workers can run on the same machine or across multiple machines.

---

## Redis Data Structures

### 1. Pending URLs Queue

- **Type:** Redis List
- **Purpose:** Store URLs waiting to be crawled
- **Example key:**


**Operations:**
- `LPUSH crawler:queue <url>` – add new URLs
- `RPOP crawler:queue` or `BRPOP crawler:queue` – workers fetch URLs to process

---

### 2. Visited URLs Store

- **Type:** Redis Set
- **Purpose:** Prevent crawling the same URL multiple times
- **Example key:**


**Operations:**
- `SISMEMBER crawler:visited <url>` – check if already crawled
- `SADD crawler:visited <url>` – mark URL as visited

---

## Worker Processing Flow

Each worker follows the same loop:

1. Pop a URL from the pending queue
2. Check if the URL is already visited
3. If visited → skip
4. If not visited:
 - Fetch the webpage
 - Extract links from HTML
 - Mark the URL as visited
 - Push newly discovered URLs into the queue

### Pseudocode

```js
while (true) {
  // 1. Get next URL
  const url = await redis.rpop("crawler:{global}:queue");
  if (!url) continue;

  // 2. Atomically claim the URL
  const claimed = await redis.sadd("crawler:{global}:visited", url);

  // If claimed === 0, URL was already processed
  if (claimed === 0) continue;

  try {
    // 3. Fetch page ONLY if we successfully claimed it
    const html = await fetchPage(url);

    // 4. Extract links
    const newUrls = extractLinks(html);

    // 5. Enqueue newly discovered URLs
    for (const newUrl of newUrls) {
      await redis.lpush("crawler:{global}:queue", newUrl);
    }
  } catch (err) {
    // Optional: log or retry strategy
    console.error("Failed to fetch:", url, err);
  }
}

```

