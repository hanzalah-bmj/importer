const axios = require("axios");
const cheerio = require("cheerio");

async function importProduct(url) {
  try {
    let product = null;

    // =========================
    // 🟢 1. SHOPIFY TRY
    // =========================
    try {
      const shopifyUrl = url + ".json";
      const { data } = await axios.get(shopifyUrl);

      const p = data.product;

      product = {
        title: p.title || "",
        description: p.body_html || "",
        price: p.variants?.[0]?.price || "0",
        images: p.images?.map(i => i.src) || []
      };

      console.log("✔ Shopify product detected");
    } catch (e) {
      console.log("Shopify failed, switching to WooCommerce...");
    }

    // =========================
    // 🟡 2. WOOCOMMERCE SCRAPE
    // =========================
    if (!product) {
      const { data } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const $ = cheerio.load(data);

      const title =
        $("h1.product_title").text().trim() ||
        $("h1").first().text().trim();

      const price =
        $(".price").first().text().replace(/[^0-9.]/g, "") ||
        "";

      const description =
        $("#tab-description").html() ||
        $(".woocommerce-product-details__short-description").html() ||
        "";

      let images = [];

      $(
        ".woocommerce-product-gallery img, .wp-post-image, img"
      ).each((i, el) => {
        let src = $(el).attr("src");

        if (
          src &&
          src.startsWith("http") &&
          !src.includes("logo") &&
          !src.includes("icon")
        ) {
          images.push(src);
        }
      });

      product = {
        title,
        description,
        price, // 🔥 SAME PRICE AS WEBSITE (NO CHANGE)
        images: [...new Set(images)].slice(0, 6)
      };

      console.log("✔ WooCommerce product detected");
    }

    // =========================
    // 🔥 OUTPUT
    // =========================
    console.log("\n========== PRODUCT ==========");
    console.log("Title:", product.title);
    console.log("Price:", product.price);
    console.log("Images:", product.images.length);
    console.log("=============================\n");

    return product;

  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

// =========================
// 👇 TEST LINK
// =========================
importProduct(
  "https://www.sharkauto.pk/products/microfiber-cleaning-cloth-gray-yellow-multi-purpose-towel"
);