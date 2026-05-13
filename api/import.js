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

    const { data } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
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
    price = $(".price").first().text().trim() || $("[class*=price]").first().text().trim();

    // =========================
    // 🟢 DESCRIPTION (FIXED)
    // =========================
    let rawDescription =
      $(".product-description").text().trim() ||
      $(".woocommerce-product-details__short-description").text().trim() ||
      $("#description").text().trim() ||
      $("meta[name='description']").attr("content") ||
      "";

    // ❌ remove garbage text
    const badText = [
      "couldn't load",
      "pickup availability",
      "javascript",
      "error"
    ];

    if (badText.some(t => rawDescription.toLowerCase().includes(t))) {
      rawDescription = "";
    }

    description = rawDescription;

    // =========================
    // 🟢 IMAGES (FIXED SMART FILTER)
    // =========================

    // 1. FIRST PRIORITY: OG IMAGE
    // 🟢 PRIORITY 1: OG IMAGE (Shopify + general)
let mainImage =
  $("meta[property='og:image']").attr("content");

// 🟢 PRIORITY 2: WooCommerce main image
if (!mainImage) {
  mainImage = $(".woocommerce-product-gallery__image img").attr("src");
}

// 🟢 PRIORITY 3: fallback
if (!mainImage) {
  mainImage = $(".wp-post-image").attr("src");
}

if (mainImage) images.push(mainImage);

// 🟢 GALLERY IMAGES (ONLY PRODUCT)
$(".woocommerce-product-gallery__image img").each((i, el) => {

  let src = $(el).attr("src");

  if (!src) return;

  if (src.startsWith("//")) src = "https:" + src;

  // ❌ FILTER NON PRODUCT IMAGES
  if (
    src.includes("logo") ||
    src.includes("icon") ||
    src.includes("banner") ||
    src.includes("category") ||
    src.includes("home.png") ||
    src.includes("car-care") ||
    src.includes("interior") ||
    src.includes("exterior") ||
    src.includes("mobile-accessories") ||
    src.includes("utilities")
  ) return;

  images.push(src);
});

images = [...new Set(images)].slice(0, 5);

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