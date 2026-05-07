import axios from "axios";
import cheerio from "cheerio";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL required" });
  }

  try {
    let product = null;

    // 🔥 Shopify
    try {
      const { data } = await axios.get(url + ".json");

      const p = data.product;

      product = {
        title: p.title,
        description: p.body_html,
        price: p.variants?.[0]?.price || "",
        images: p.images?.map(i => i.src) || []
      };

    } catch (e) {}

    // 🔥 WooCommerce fallback
    if (!product) {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $ = cheerio.load(data);

      const title =
        $("h1.product_title").text().trim() ||
        $("h1").first().text().trim();

      const price =
        $(".price").first().text().replace(/[^0-9.]/g, "");

      const description =
        $("#tab-description").html() ||
        $(".woocommerce-product-details__short-description").html() ||
        "";

      let images = [];

      $("img").each((i, el) => {
        let src = $(el).attr("src");

        if (
          src &&
          src.startsWith("http") &&
          !src.includes("logo")
        ) {
          images.push(src);
        }
      });

      product = {
        title,
        description,
        price,
        images: [...new Set(images)].slice(0, 6)
      };
    }

    return res.status(200).json(product);

  } catch (error) {
    return res.status(500).json({ error: "Import failed" });
  }
}