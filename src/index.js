const axios = require("axios");
const cheerio = require("cheerio");


const BASE_URL = "https://books.toscrape.com/catalogue/page-";
const TOTAL_PAGES = 3;

async function scrapePage(pageNumber) {
  const url = `${BASE_URL}${pageNumber}.html`;

  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const products = [];

  $(".product_pod").each((_, element) => {
    const title = $(element).find("h3 a").attr("title");
    const price = $(element).find(".price_color").text();
    const availability = $(element)
      .find(".availability")
      .text()
      .trim();
    const rating = $(element)
      .find(".star-rating")
      .attr("class")
      .replace("star-rating", "")
      .trim();
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

async function scrapeAllPages() {
  const allProducts = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    console.log(`Scraping page ${page}...`);
    const pageProducts = await scrapePage(page);
    allProducts.push(...pageProducts);
  }

  console.log(`\nTotal products scraped: ${allProducts.length}`);
  console.log(allProducts);
}

scrapeAllPages();
