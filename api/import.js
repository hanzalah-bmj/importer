import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {

  // 🔥 CORS HEADERS (MUST BE FIRST)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 🔥 OPTIONS request handle (VERY IMPORTANT)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL missing" });
  }

  try {
    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const $ = cheerio.load(data);

    const title = $("h1").first().text().trim();

    let price = $(".price").first().text().trim();

    let images = [];
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.startsWith("http")) {
        images.push(src);
      }
    });

    return res.status(200).json({
      success: true,
      title,
      price,
      images: [...new Set(images)].slice(0, 5)
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}