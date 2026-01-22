const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const { Parser } = require("json2csv");

const BASE_URL = "https://books.toscrape.com/catalogue/page-";
const TOTAL_PAGES = 3;

const JSON_OUTPUT = "data/products.json";
const CSV_OUTPUT = "data/products.csv";

async function scrapePage(pageNumber) {
  const url = `${BASE_URL}${pageNumber}.html`;
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const products = [];

  $(".product_pod").each((_, element) => {
    const title = $(element).find("h3 a").attr("title");
   const rawPrice = $(element).find(".price_color").text();
const rawAvailability = $(element)
  .find(".availability")
  .text()
  .trim();
const rawRating = $(element)
  .find(".star-rating")
  .attr("class")
  .replace("star-rating", "")
  .trim();

const price = normalizePrice(rawPrice);
const availability = normalizeAvailability(rawAvailability);
const rating = normalizeRating(rawRating);

    const productUrl =
      "https://books.toscrape.com/" +
      $(element).find("h3 a").attr("href");

    products.push({
      title,
      price,
      rating,
      availability,
      productUrl,
    });
  });

  return products;
}

function saveToJson(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function saveToCsv(data, filePath) {
  const parser = new Parser();
  const csv = parser.parse(data);
  fs.writeFileSync(filePath, csv, "utf-8");
}

async function scrapeAllPages() {
  const allProducts = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    console.log(`Scraping page ${page}...`);
    const pageProducts = await scrapePage(page);
    allProducts.push(...pageProducts);
  }

  saveToJson(allProducts, JSON_OUTPUT);
  saveToCsv(allProducts, CSV_OUTPUT);

  console.log(
    `\nSaved ${allProducts.length} products to JSON & CSV successfully`
  );
}
 
function normalizePrice(priceText) {
  return Number(priceText.replace("£", ""));
}

function normalizeRating(ratingText) {
  const ratingMap = {
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
  };
  return ratingMap[ratingText] || null;
}

function normalizeAvailability(text) {
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

scrapeAllPages();
