import axios from "axios";
import * as cheerio from "cheerio";

const allowedOrigins = [
  "https://easeshopping.pk",
  "https://www.easeshopping.pk"
];

export default async function handler(req, res) {

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL is required"
    });
  }

  try {

    let title = "";
    let price = "";
    let description = "";
    let images = [];

    // =========================
    // 🔵 FETCH HTML
    // =========================
const { data } = await axios.get(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/"
  },
  timeout: 20000
});

    const $ = cheerio.load(data);

    // =========================
    // 🟢 TITLE
    // =========================
    title =
      $("h1").first().text().trim() ||
      $("title").text().trim();

    // =========================
    // 🟢 PRICE
    // =========================
    price =
      $(".price").first().text().trim() ||
      $("[class*=price]").first().text().trim();

    // =========================
    // 🟢 DESCRIPTION
    // =========================
    description =
      $(".product-description").text().trim() ||
      $("#description").text().trim() ||
      $("p").first().text().trim();

    // =========================
    // 🟢 IMAGES
    // =========================
    $("img").each((i, el) => {
      let src = $(el).attr("src");

      if (src) {
        if (src.startsWith("//")) {
          src = "https:" + src;
        }

        if (src.startsWith("http")) {
          images.push(src);
        }
      }
    });

    images = [...new Set(images)].slice(0, 8);

    // =========================
    // 🔴 SHOPIFY FIX (optional detection)
    // =========================
    if (data.includes("Shopify")) {
      try {
        const jsonMatch = data.match(/"price":(\d+)/);
        if (jsonMatch) {
          price = (jsonMatch[1] / 100).toString();
        }
      } catch (e) {}
    }

    // =========================
    // 🔥 RESPONSE
    // =========================
    return res.status(200).json({
      success: true,
      title,
      price,
      description,
      images
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}