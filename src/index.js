const config = require("./config");

const UserAgent = require("user-agents");
const PQueue = require("p-queue").default;


const queue = new PQueue({
  concurrency: 1,      // max 2 pages at a time
  intervalCap: 1,      // max 2 requests
  interval: 800       // per 1 second
});


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
  const response = await fetchWithRetry(url);

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
const tasks = [];

for (let page = 1; page <= TOTAL_PAGES; page++) {
  tasks.push(
    queue.add(async () => {
      try {
        console.log(`Scraping page ${page}...`);
        const pageProducts = await scrapePage(page);
        allProducts.push(...pageProducts);
      } catch (error) {
        console.error(`Failed to scrape page ${page}`);
      }
    })
  );
}

await Promise.all(tasks);


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

function getRandomHeaders() {
  const ua = new UserAgent();

  return {
    "User-Agent": ua.toString(),
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    Connection: "keep-alive",
  };
}

function getRandomProxy() {
  if (!config.proxies || config.proxies.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * config.proxies.length);
  return config.proxies[index];
}


async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const axiosOptions = {
        headers: getRandomHeaders(),
      };

     if (config.useProxy) {
  const proxy = getRandomProxy();

  if (proxy) {
    axiosOptions.proxy = {
      host: proxy.host,
      port: proxy.port,
      auth: proxy.username
        ? {
            username: proxy.username,
            password: proxy.password,
          }
        : undefined,
    };
  }
}


      return await axios.get(url, axiosOptions);
    } catch (error) {
      console.warn(
        `Attempt ${attempt} failed for ${url}: ${error.message}`
      );

      if (attempt === retries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

scrapeAllPages();
