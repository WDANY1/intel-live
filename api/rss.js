// Vercel Serverless — RSS Feed Proxy for real-time news
// Fetches and parses RSS/Atom feeds, returns JSON articles

const RSS_FEEDS = {
  aljazeera: "https://www.aljazeera.com/xml/rss/all.xml",
  bbc_world: "http://feeds.bbci.co.uk/news/world/rss.xml",
  bbc_me: "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
  reuters_world: "https://www.reutersagency.com/feed/?best-topics=world",
  cnn_world: "http://rss.cnn.com/rss/edition_world.rss",
  guardian_world: "https://www.theguardian.com/world/rss",
  france24: "https://www.france24.com/en/rss",
  dw_world: "https://rss.dw.com/rdf/rss-en-world",
  middleeasteye: "https://www.middleeasteye.net/rss",
  defense_one: "https://www.defenseone.com/rss/",
  war_zone: "https://www.thedrive.com/the-war-zone/feed",
  times_israel: "https://www.timesofisrael.com/feed/",
  jpost: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx",
  iran_intl: "https://www.iranintl.com/en/feed",
};

// Simple XML tag content extractor
function getTagContent(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return (match[1] || match[2] || "").trim();
}

// Extract image URL from various RSS patterns
function extractImage(itemXml) {
  // media:content or media:thumbnail
  const mediaMatch = itemXml.match(/(?:media:content|media:thumbnail|enclosure)[^>]*url=["']([^"']+)["']/i);
  if (mediaMatch) return mediaMatch[1];
  // img tag in description/content
  const imgMatch = itemXml.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  // image tag
  const imageMatch = itemXml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
  if (imageMatch) return imageMatch[1];
  return null;
}

function parseRSSItems(xml, source) {
  const items = [];
  // Split by <item> or <entry> tags
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1] || match[2];
    const title = getTagContent(itemXml, "title").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const description = getTagContent(itemXml, "description").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").slice(0, 300);
    const link = getTagContent(itemXml, "link") || (itemXml.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || "";
    const pubDate = getTagContent(itemXml, "pubDate") || getTagContent(itemXml, "published") || getTagContent(itemXml, "updated") || "";
    const image = extractImage(itemXml);

    if (title) {
      items.push({ title, description, link, pubDate, image, source });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { feeds: requestedFeeds, limit = 30 } = req.query;

  // Determine which feeds to fetch
  const feedKeys = requestedFeeds
    ? requestedFeeds.split(",").filter(k => RSS_FEEDS[k])
    : Object.keys(RSS_FEEDS);

  const feedsToFetch = feedKeys.slice(0, 8); // max 8 feeds per request

  try {
    const results = await Promise.allSettled(
      feedsToFetch.map(async (key) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
          const response = await fetch(RSS_FEEDS[key], {
            signal: controller.signal,
            headers: { "User-Agent": "IntelLive/4.0 RSS Reader" },
          });
          const xml = await response.text();
          return parseRSSItems(xml, key);
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    const allArticles = results
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value)
      .sort((a, b) => {
        const da = new Date(a.pubDate || 0);
        const db = new Date(b.pubDate || 0);
        return db - da;
      })
      .slice(0, parseInt(limit));

    const successCount = results.filter(r => r.status === "fulfilled").length;

    return res.status(200).json({
      articles: allArticles,
      meta: {
        feedsRequested: feedsToFetch.length,
        feedsSucceeded: successCount,
        totalArticles: allArticles.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "RSS fetch failed", details: String(err) });
  }
}
