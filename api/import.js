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

    // TITLE
    const title = $("h1").first().text().trim();

    // PRICE (Shopify common selectors)
    let price =
      $(".price").first().text().trim() ||
      $("[class*=price]").first().text().trim();

    // DESCRIPTION
    const description =
      $(".product-description").text().trim() ||
      $("#description").text().trim();

    // IMAGES
    let images = [];
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src && src.includes("cdn")) {
        images.push(src);
      }
    });

    return res.status(200).json({
      success: true,
      title,
      price,
      description,
      images
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping failed",
      details: err.message
    });
  }
}