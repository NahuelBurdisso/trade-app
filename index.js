const Alpaca = require("@alpacahq/alpaca-trade-api");
const { Configuration, OpenAIApi } = require("openai");
const dotenv = require("dotenv");
dotenv.config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const puppeteer = require("puppeteer");

async function scrape() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://twitter.com/MrWarrenBuffet", {
    waitUntil: "networkidle2",
  });

  await page.waitForTimeout(3000);

  await page.screenshot({ path: "example.png" });

  const tweets = await page.evaluate(async () => {
    return document.body.innerText;
  });

  browser.close();

  return tweets;
}

async function main() {
  const tweets = await scrape();
  console.log(tweets);
  const gptCompletion = await openai.createCompletion({
    model: "text-davinci-002",
    prompt: `${tweets}. Warren Buffett recommends 
  sellings the following stocks tickers: `,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const stocksToBuy = gptCompletion.data.choices[0].text.match(/\b[A-Z]+\b/g);

  const alpacaClient = new Alpaca({
    keyId: process.env.ALPACA_API_KEY_ID,
    secretKey: process.env.ALPACA_SECRET_KEY,
    paper: true,
  });

  await alpacaClient.cancelAllOrders();
  await alpacaClient.closeAllPositions();

  const account = await alpacaClient.getAccount();

  // place order
  await alpacaClient.createOrder({
    symbol: stocksToBuy[0],
    notional: account.buying_power * 0.1,
    qty: 1,
    side: "buy",
    type: "market",
    time_in_force: "day",
  });
}

main();
