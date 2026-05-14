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
// 🟢 PRICE (FINAL PERFECT FIX)
// =========================

let regular_price = "";
let sale_price = "";

// =========================
// 🟣 SHOPIFY FIRST (IMPORTANT)
// =========================
if (data.includes("Shopify")) {

  try {
    const priceMatch = data.match(/"price":(\d+)/);
    const compareMatch = data.match(/"compare_at_price":(\d+)/);

    if (priceMatch) {
      sale_price = (priceMatch[1] / 100).toString();
    }

    if (compareMatch) {
      regular_price = (compareMatch[1] / 100).toString();
    }

    // agar compare price nahi hai
    if (!regular_price) {
      regular_price = sale_price;
    }

  } catch (e) {}

} else {

  // =========================
// 🟢 WOOCOMMERCE (FINAL FIX)
// =========================

const getPrice = (selector) => {
  let text = $(selector).first().text().trim();
  if (!text) return "";

  let num = text.replace(/[^0-9.]/g, "");
  return num ? Math.round(parseFloat(num)).toString() : "";
};

// 🎯 EXACT VALUES
sale_price = getPrice(".price ins .woocommerce-Price-amount bdi");
regular_price = getPrice(".price del .woocommerce-Price-amount bdi");

// 🟡 fallback (no sale case)
if (!sale_price) {
  sale_price = getPrice(".price .woocommerce-Price-amount bdi");
}

if (!regular_price) {
  regular_price = sale_price;
}
}
    // =========================
    // 🟢 DESCRIPTION (FIXED)
    // =========================
    // =========================
// 🟢 DESCRIPTION (SHORT + LONG)
// =========================
// 🧼 CLEAN FUNCTION
const cleanHTML = (html) => {
  if (!html) return "";

  const $$ = cheerio.load(html);

  // ❌ REMOVE GARBAGE
  $$(".address-wrapper").remove();
  $$(".phone-wrapper").remove();
  $$(".email-wrapper").remove();
  $$("svg").remove();
  $$("noscript").remove();
  $$("style").remove();
  $$("script").remove();

  // ❌ remove empty tags
  $$("*").each((i, el) => {
    if ($$(el).text().trim() === "" && !$$(el).children().length) {
      $$(el).remove();
    }
  });

  // ✅ CLEAN TEXT FORMAT
  let cleaned = $$.html();

  return cleaned
    .replace(/\n/g, "")
    .replace(/\t/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

let short_description = "";
let long_description = "";

// WooCommerce
short_description =
  $(".woocommerce-product-details__short-description").html() || "";

long_description =
  $("#tab-description").html() ||
  $(".woocommerce-Tabs-panel--description").html() ||
  "";

// Shopify
if (data.includes("Shopify")) {

  long_description =
    $(".product__description").html() ||
    $(".rte").html() ||
    "";

  // Shopify me short description nahi hoti normally
  short_description =
    $("meta[name='description']").attr("content") || "";
}

// fallback
if (!long_description) {
  long_description = $("meta[name='description']").attr("content") || "";
}

short_description = cleanHTML(short_description);
long_description = cleanHTML(long_description);

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
  regular_price,
  sale_price,
  short_description,
  long_description,
  images
});

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}