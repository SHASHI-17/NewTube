import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const TWEET_URL =
  process.env.TWEET_URL || "https://x.com/xoeeie/status/2069481514275160112";

const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

const ACCOUNT_NAMES = [
  "adore",
  "orange",
  "bluemoon",
  "kiran",
  "hibye",
  "inyvix",
  "bae",
  "anchinka",
  // "ivy",
  // "meera",
  // "meera",
  // "water2",
  // "water3",
  // "fire1",
  // "fire2",
  // "fire3",
];
const REGISTER_MODE = false;
const HEADLESS = false;

// ================== ACTION CONFIG ==================
const DO_LIKE = true;
const DO_BOOKMARK = true;
const DO_QUOTE = false; // Quote tweet with random text
const DO_RETWEET = false; // Simple retweet/repost
const SLEEP_MS = 1500;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ================== ANTI-DETECTION CONFIG ==================
// Pool of realistic user agents (different browsers, OS versions)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

// Pool of realistic viewport sizes
const VIEWPORT_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 },
  { width: 2560, height: 1440 },
  { width: 1680, height: 1050 },
];

// Seeded random for consistent fingerprints per account
function getAccountFingerprint(accountIndex) {
  const seed = accountIndex * 9301 + 49297; // Simple hash seed
  const uaIndex = seed % USER_AGENTS.length;
  const vpIndex = (seed * 7) % VIEWPORT_SIZES.length;
  return {
    userAgent: USER_AGENTS[uaIndex],
    viewport: VIEWPORT_SIZES[vpIndex],
  };
}

// Sleep with random jitter (±20%)
function sleepWithJitter(ms, accountIndex) {
  const seed = accountIndex * 7919;
  const jitter = ((seed % 40) - 20) / 100; // -20% to +20%
  const actualMs = Math.floor(ms * (1 + jitter));
  return sleep(actualMs);
}

// ✅ Random quotes
const QUOTES = [
  "This hit different.",
  "Real love will feel so peaceful after this.",
  "The right person will make all this make sense.",
  "Healing era activated.",
  "Sometimes the wrong person teaches the best lessons.",
  "Your future self is smiling at you right now.",
  "The right love won’t drain you.",
  "This is growth in one sentence.",
  "Imagine loving the right person with a healed heart.",
  "Your love was never the problem.",
  "One day this will all feel worth it.",
  "You deserve someone who matches that energy.",
  "Your capacity to love is your superpower.",
  "The right person will feel like home.",
  "This is the most beautiful kind of realization.",
];

// CLI helper
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const askYesNo = (q) =>
  new Promise((resolve) => {
    rl.question(`${q}\n1) Yes\n2) No\n> `, (ans) => {
      ans = ans.trim().toLowerCase();
      resolve(ans === "1" || ans.startsWith("y"));
    });
  });

// Click helper (MAIN TWEET ONLY)
async function clickIfVisible(page, selectors = []) {
  try {
    const clicked = await page.evaluate((selectors) => {
      // Find the main tweet
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;

      const mainTweet = tweets[0];

      // Try each selector on the main tweet only
      for (const selector of selectors) {
        try {
          const el = mainTweet.querySelector(selector);
          if (el) {
            el.click();
            return true;
          }
        } catch (e) {
          // Selector error, try next one
        }
      }
      return false;
    }, selectors);
    return clicked;
  } catch (err) {
    console.log("Click error:", err.message);
    return false;
  }
}

// Check if tweet is already liked (MAIN TWEET ONLY)
async function isAlreadyLiked(page) {
  try {
    const result = await page.evaluate(() => {
      // Find the main tweet container (usually has role="article" or data-testid="tweet")
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;

      const mainTweet = tweets[0]; // First tweet is the main one
      const likeBtn = mainTweet.querySelector('[data-testid="like"]');
      if (!likeBtn) return false;

      // Check aria-label for "Unlike" or check if parent div has "Liked" class
      const ariaLabel = likeBtn.getAttribute("aria-label") || "";
      return (
        ariaLabel.toLowerCase().includes("unlike") ||
        ariaLabel.toLowerCase().includes("liked")
      );
    });
    return result;
  } catch {
    return false;
  }
}

// Check if tweet is already bookmarked (MAIN TWEET ONLY)
async function isAlreadyBookmarked(page) {
  try {
    const result = await page.evaluate(() => {
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;

      const mainTweet = tweets[0];
      const bookmarkBtn = mainTweet.querySelector('[data-testid="bookmark"]');
      if (!bookmarkBtn) return false;

      const ariaLabel = bookmarkBtn.getAttribute("aria-label") || "";
      return (
        ariaLabel.toLowerCase().includes("remove") ||
        ariaLabel.toLowerCase().includes("bookmarked")
      );
    });
    return result;
  } catch {
    return false;
  }
}

// Check if tweet is already retweeted (MAIN TWEET ONLY)
async function isAlreadyRetweeted(page) {
  try {
    const result = await page.evaluate(() => {
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;

      const mainTweet = tweets[0];
      const retweetBtn = mainTweet.querySelector('[data-testid="retweet"]');
      if (!retweetBtn) return false;

      const ariaLabel = retweetBtn.getAttribute("aria-label") || "";
      return (
        ariaLabel.toLowerCase().includes("undo") ||
        ariaLabel.toLowerCase().includes("retweeted")
      );
    });
    return result;
  } catch {
    return false;
  }
}

// Ensure base folder
if (!fs.existsSync(BASE_USER_DATA_DIR))
  fs.mkdirSync(BASE_USER_DATA_DIR, { recursive: true });

// Get profile directory
function getProfileDir(name) {
  const dir = path.join(BASE_USER_DATA_DIR, `Account_${name}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Check login
async function isLoggedIn(page) {
  try {
    return (
      (await page.$('a[aria-label="Profile"]')) ||
      (await page.$('div[data-testid="AppTabBar_Profile_Link"]')) ||
      (await page.$('div[role="feed"]'))
    );
  } catch {
    return false;
  }
}

// ================== ACTION LOGIC ==================
async function processProfile(
  profileDir,
  profileName,
  accountIndex,
  batchSlot = 0,
) {
  // Get consistent fingerprint for this account
  const fingerprint = getAccountFingerprint(accountIndex);

  // Calculate window position for 2-box grid (960x1080 each)
  // Slot 0: left, Slot 1: right
  const WINDOW_WIDTH = 960;
  const WINDOW_HEIGHT = 1080;
  const posX = (batchSlot % 2) * WINDOW_WIDTH;
  const posY = Math.floor(batchSlot / 2) * WINDOW_HEIGHT;

  console.log(`\n🚀 Launching Chrome for: ${profileName}`);
  console.log(`   ├─ UA: ${fingerprint.userAgent.substring(0, 50)}...`);
  console.log(`   └─ Position: [${posX}, ${posY}] (Slot ${batchSlot})`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    userDataDir: profileDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
      `--window-position=${posX},${posY}`,
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    defaultViewport: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(fingerprint.userAgent);

    // Enhanced anti-detection script
    await page.evaluateOnNewDocument(() => {
      // Hide webdriver
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
      // Mock Chrome object
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: "granted" })
          : originalQuery(parameters);
      // Mock plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      // Mock languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    await page.goto("https://x.com/home", {
      waitUntil: "networkidle2",
      timeout: 80000,
    });
    await sleepWithJitter(SLEEP_MS, accountIndex);

    if (!(await isLoggedIn(page))) {
      console.log(`⚠️ ${profileName} is NOT logged in.`);
      return { name: profileName, success: false, reason: "Not logged in" };
    }

    console.log(`✅ ${profileName} is logged in — proceeding...`);
    await page.goto(TWEET_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await sleepWithJitter(2500, accountIndex);
    await page.evaluate(() => window.scrollBy(0, 300));
    await sleepWithJitter(1000, accountIndex);

    // ❤️ Like
    if (DO_LIKE) {
      const alreadyLiked = await isAlreadyLiked(page);
      if (alreadyLiked) {
        console.log(`⏭️ ${profileName} already liked this tweet — skipping.`);
      } else {
        const liked = await clickIfVisible(page, [
          'div[data-testid="like"]',
          'button[data-testid="like"]',
          'svg[aria-label="Like"]',
        ]);
        if (liked) console.log(`❤️ ${profileName} liked the tweet.`);
      }
      await sleepWithJitter(1000, accountIndex);
    }

    // 🔖 Bookmark
    if (DO_BOOKMARK) {
      const alreadyBookmarked = await isAlreadyBookmarked(page);
      if (alreadyBookmarked) {
        console.log(
          `⏭️ ${profileName} already bookmarked this tweet — skipping.`,
        );
      } else {
        const bookmarked = await clickIfVisible(page, [
          'div[data-testid="bookmark"]',
          'button[data-testid="bookmark"]',
          'svg[aria-label="Bookmark"]',
        ]);
        if (bookmarked) console.log(`🔖 ${profileName} bookmarked the tweet.`);
      }
      await sleepWithJitter(1000, accountIndex);
    }

    // ✍️ STEP 1: QUOTE FIRST
    if (DO_QUOTE) {
      const alreadyRetweeted = await isAlreadyRetweeted(page);
      if (alreadyRetweeted) {
        console.log(
          `⏭️ ${profileName} already retweeted/quoted this tweet — skipping quote.`,
        );
      } else {
        console.log(`📝 ${profileName} starting Quote flow first...`);

        // Click retweet icon
        const retweetClicked = await clickIfVisible(page, [
          'div[data-testid="retweet"]',
          'button[data-testid="retweet"]',
        ]);
        if (!retweetClicked) {
          console.log(
            `⚠️ ${profileName} could not find retweet icon for quote.`,
          );
          return {
            name: profileName,
            success: false,
            reason: "No retweet icon",
          };
        }
        await sleepWithJitter(1200, accountIndex);

        // Click "Quote" option (should be 2nd)
        const quoteMenuItems = await page.$$(`div[role="menuitem"]`);
        if (quoteMenuItems.length >= 2) {
          await quoteMenuItems[1].click();
          console.log(`✍️ ${profileName} selected "Quote" option.`);
        } else {
          // fallback: try <a href="/compose/post">
          const quoteLink = await page.$('a[href="/compose/post"]');
          if (quoteLink) {
            await quoteLink.click();
            console.log(`🪶 ${profileName} clicked Quote via <a> link.`);
          } else {
            console.log(`⚠️ Quote menu not found for ${profileName}.`);
            return {
              name: profileName,
              success: false,
              reason: "No quote menu",
            };
          }
        }

        // Wait for text box
        await page.waitForSelector('div[role="textbox"]', { timeout: 10000 });

        // ✨ NEW: Extra wait & focus to avoid missing first letter
        await sleepWithJitter(800, accountIndex);
        await page.click('div[role="textbox"]');
        await sleepWithJitter(400, accountIndex);

        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        await page.type('div[role="textbox"]', randomQuote, { delay: 60 });
        console.log(`💬 ${profileName} typed quote: "${randomQuote}"`);
        await sleepWithJitter(1000, accountIndex);

        // Click Post button
        const posted = await clickIfVisible(page, [
          'div[data-testid="tweetButtonInline"]',
          'div[data-testid="tweetButton"]',
          'button[data-testid="tweetButton"]',
        ]);
        if (posted) console.log(`✅ ${profileName} posted Quote successfully!`);
        else {
          console.log(`⚠️ ${profileName} could not post Quote.`);
          return {
            name: profileName,
            success: false,
            reason: "Quote post failed",
          };
        }

        await sleepWithJitter(2500, accountIndex);
      }
    }

    // 🔁 STEP 2: RETWEET (REPOST) AFTER QUOTE
    if (DO_RETWEET) {
      const alreadyRetweeted = await isAlreadyRetweeted(page);
      if (alreadyRetweeted) {
        console.log(
          `⏭️ ${profileName} already retweeted this tweet — skipping.`,
        );
      } else {
        console.log(`🔁 ${profileName} performing simple retweet now...`);

        const rtButton = await clickIfVisible(page, [
          'div[data-testid="retweet"]',
          'button[data-testid="retweet"]',
        ]);
        if (!rtButton) {
          console.log(
            `⚠️ ${profileName} could not find Retweet icon for repost.`,
          );
          return {
            name: profileName,
            success: false,
            reason: "No repost icon",
          };
        }

        await sleepWithJitter(1000, accountIndex);

        // Click "Retweet" option (first one)
        const repostMenuItems = await page.$$(`div[role="menuitem"]`);
        if (repostMenuItems.length > 0) {
          await repostMenuItems[0].click();
          console.log(
            `🔁 ${profileName} clicked "Retweet" (repost) successfully.`,
          );
        } else {
          console.log(`⚠️ Retweet menu not found for repost.`);
          return {
            name: profileName,
            success: false,
            reason: "Repost menu missing",
          };
        }

        await sleepWithJitter(1500, accountIndex);
        console.log(`✅ ${profileName} completed Quote + Repost sequence.`);
      }
    }

    return { name: profileName, success: true };
  } catch (err) {
    console.error(`🔥 Error with ${profileName}:`, err.message);
    return { name: profileName, success: false, reason: err.message };
  } finally {
    try {
      await browser.close();
    } catch {}
  }
}

// ================== LOGIN FLOW ==================
async function checkAlreadyLoggedIn(profileDir) {
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: profileDir,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto("https://x.com/home", { waitUntil: "networkidle2" });
    const logged = await isLoggedIn(page);
    return logged;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

async function manualLogin(profileDir, profileName) {
  console.log(`\n⚙️ Manual login for: ${profileName}`);
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    userDataDir: profileDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--start-maximized",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.goto("https://x.com/home", { waitUntil: "networkidle2" });
    console.log("⚠️ Please log in manually in the opened browser...");
    const confirmed = await askYesNo(
      `✅ Have you completed login for ${profileName}?`,
    );
    if (!confirmed) {
      console.log(`❌ Skipping ${profileName} — login not done.`);
      return { name: profileName, success: false };
    }
    console.log(`✅ Login confirmed for ${profileName}.`);
    return { name: profileName, success: true };
  } catch (err) {
    console.error(`🔥 Login error for ${profileName}:`, err.message);
    return { name: profileName, success: false, reason: err.message };
  } finally {
    try {
      await browser.close();
    } catch {}
  }
}

// ================== MAIN ==================
(async () => {
  const results = [];

  if (REGISTER_MODE) {
    // Sequential execution for register mode (requires manual interaction)
    console.log("\n📝 REGISTER MODE: Processing accounts sequentially...\n");
    for (const name of ACCOUNT_NAMES) {
      const dir = getProfileDir(name);
      const logged = await checkAlreadyLoggedIn(dir);
      if (logged) {
        console.log(`✅ ${name} already logged in — skipping registration.`);
        results.push({ name, success: true, mode: "register" });
        continue;
      }
      const r = await manualLogin(dir, name);
      results.push({ ...r, mode: "register" });
    }
  } else {
    // Parallel execution for action mode (2 at a time in grid layout)
    console.log(
      "\n⚡ ACTION MODE: Processing accounts in parallel (2 at a time)...\n",
    );

    const CONCURRENCY = 2;
    for (let i = 0; i < ACCOUNT_NAMES.length; i += CONCURRENCY) {
      const batch = ACCOUNT_NAMES.slice(i, i + CONCURRENCY);
      console.log(`\n🔄 Processing batch: ${batch.join(", ")}`);

      const batchResults = await Promise.all(
        batch.map(async (name, batchIndex) => {
          const accountIndex = i + batchIndex;
          const dir = getProfileDir(name);
          // batchSlot determines position: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
          return await processProfile(dir, name, accountIndex, batchIndex);
        }),
      );

      results.push(...batchResults.map((r) => ({ ...r, mode: "action" })));
      console.log(`\n✅ Batch complete: ${batch.join(", ")}`);
    }
  }

  rl.close();
  console.log("\n================== SUMMARY ==================");
  for (const r of results) {
    if (r.success) console.log(`✅ ${r.name} (${r.mode}) — Success`);
    else console.log(`⚠️ ${r.name} (${r.mode}) — Failed: ${r.reason || ""}`);
  }
  console.log("=============================================\n");
})();
