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

    const title = $("title").text();

    return res.status(200).json({
      success: true,
      title: title
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping failed"
    });
  }
}