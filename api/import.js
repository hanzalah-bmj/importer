import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL missing" });
  }

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    let title = "";
    let price = "";
    let description = "";
    let images = [];

    // Shopify detect
    if ($("meta[property='og:type']").attr("content") === "product") {
      title = $("meta[property='og:title']").attr("content") || $("title").text();
      description = $("meta[property='og:description']").attr("content") || "";
      images.push($("meta[property='og:image']").attr("content"));

      // price (Shopify JSON)
      const scripts = $("script");
      scripts.each((i, el) => {
        const text = $(el).html();
        if (text && text.includes("ShopifyAnalytics")) {
          const match = text.match(/"price":"(\d+)"/);
          if (match) price = match[1] / 100;
        }
      });
    }

    // fallback (generic / WooCommerce)
    if (!title) title = $("h1").first().text().trim();
    if (!price) price = $("[class*=price]").first().text().trim();
    if (!description) description = $("p").text().slice(0, 500);

    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("http")) {
        images.push(src);
      }
    });

    return res.status(200).json({
      success: true,
      title,
      price,
      description,
      images: [...new Set(images)].slice(0, 5)
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping failed",
      details: err.message
    });
  }
}