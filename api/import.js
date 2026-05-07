import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(req, res) {

  // 🔥 MUST BE FIRST
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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
        "User-Agent": "Mozilla/5.0"
      },
      timeout: 15000
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