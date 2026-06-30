import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const TWEET_URL =
  process.env.TWEET_URL ||
  "https://x.com/femmenote/status/2071115547341672741?s=20";

const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

const ACCOUNT_NAMES = [
  // "adore",
  // "orange",
  // "bluemoon",
  // "kiran",
  // "hibye",
  // "inyvix",
  // "bae",
  // "anchinka",
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
const DO_BOOKMARK = false;
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

// ✅ Random quotes (love, healing, growth themed)
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
  "You deserve someone who matches your energy.",
  "Your capacity to love is your superpower.",
  "The right person will feel like home.",
  "This is the most beautiful kind of realization.",
  "The love you’re looking for is also looking for you.",
  "Some chapters don’t have closing lines, the story just continues.",
  "Healing isn’t linear, and that’s okay.",
  "Your heart knows the way, trust it.",
  "The right love will never require you to shrink.",
  "You don’t need to explain your boundaries to people who respect you.",
  "Growth is uncomfortable, but stagnation is heavy.",
  "The version of you that you’re becoming is worth the wait.",
  "Some people are lessons, not destinations.",
  "Your peace is more important than their understanding.",
  "Love shouldn’t feel like a puzzle you’re constantly trying to solve.",
  "The right person won’t make you question your worth.",
  "You can love people and still outgrow them.",
  "Closure is something you give yourself.",
  "What’s meant for you will never feel like you’re forcing it.",
  "Your feelings are valid, even if others don’t understand them.",
  "The love you give will return to you in unexpected ways.",
  "Healing looks different on everyone, be patient with yourself.",
  "Some doors close so better ones can open.",
  "You’re not for everyone, and that’s okay.",
  "The right love will choose you, not choose between you.",
  "Your heart is a treasure, guard it wisely.",
  "Growth requires leaving behind what no longer serves you.",
  "The best love story is the one you write with yourself.",
  "Some goodbyes are the beginning of something better.",
  "Your worth isn’t defined by who stays or leaves.",
  "The right person will love you even on your difficult days.",
  "Healing is not about forgetting, it’s about learning to carry it differently.",
  "You don’t need to perform to be worthy of love.",
  "Some relationships are seasons, not lifetimes.",
  "Your peace is your priority, protect it at all costs.",
  "The love you seek is already within you.",
  "Growing apart doesn’t mean growing wrong.",
  "The right love will feel safe, not suspicious.",
  "Your boundaries are a form of self-love.",
  "Some people come to show you what you don’t want.",
  "The best revenge is living well and loving deeply.",
  "Your heart knows what it needs, listen to it.",
  "Love shouldn’t cost you your peace.",
  "The right person will celebrate your healing, not compete with it.",
  "You’re allowed to outgrow versions of yourself.",
  "Some love stories are written in the stars, others in the lessons.",
  "Your feelings are your compass, trust them.",
  "The right love won’t ask you to dim your light.",
  "Healing is messy, but it’s worth it.",
  "You deserve a love that feels like coming home.",
  "Some people are mirrors, showing you what you need to heal.",
  "Your growth may intimidate the wrong people, and that’s okay.",
  "The right love will hold space for your healing.",
  "You don’t have to get it right the first time.",
  "Some endings are just new beginnings in disguise.",
  "Your love story isn’t over, it’s just evolving.",
  "The right person will understand your silence.",
  "You’re worthy of love that doesn’t require you to perform.",
  "Some chapters must end so better ones can begin.",
  "Your heart is resilient, trust its ability to heal.",
  "The right love will never make you feel like too much.",
  "Growing into yourself is the greatest love story.",
  "Some people are meant to be part of your journey, not your destination.",
  "Your healing inspires others more than you know.",
  "The right person will love your mind, not just your presence.",
  "You’re allowed to change your mind about what you want.",
  "Some love is temporary, but the lessons are permanent.",
  "Your worth is not negotiable.",
  "The right love will feel natural, not forced.",
  "Healing requires feeling, not just thinking.",
  "Some doors close because it’s time to walk through new ones.",
  "Your capacity to heal amazes you every day.",
  "The right person will love all your versions, past and present.",
  "You’re not behind in life, you’re on your own timeline.",
  "Some relationships are assignments, not marriages.",
  "Your heart knows the difference between settling and surrendering.",
  "The right love will never make you question your reality.",
  "You deserve to be loved for who you are, not who they want you to be.",
  "Some goodbyes are acts of self-love.",
  "Your healing journey is unique, honor it.",
  "The right person will be clear about choosing you.",
  "You’re allowed to take time to heal.",
  "Some love stories teach us how to love ourselves better.",
  "Your heart deserves more than confusion and mixed signals.",
  "The right love will add to your peace, not subtract from it.",
  "Growing through what you go through builds character.",
  "Some people leave so you can make space for who’s coming.",
  "Your feelings are not too much, you’re just enough.",
  "The right person will love your edges, not just your soft parts.",
  "You don’t have to justify your choices to people who don’t matter.",
  "Some endings are actually mercies in disguise.",
  "Your healing is not linear, and that’s beautiful.",
  "The right love will never require you to abandon yourself.",
  "You’re allowed to prioritize your peace over pleasing others.",
  "Some people teach you what you will no longer accept.",
  "Your heart deserves to be held gently.",
  "The right person will understand your need for space.",
  "You’re not hard to love, you’re just selective.",
  "Some lessons come through heartbreak so we can learn to choose better.",
  "Your growth may look like losing people, and that’s okay.",
  "The right love will never make you feel small.",
  "You deserve a love that’s consistent, not just convenient.",
  "Some relationships expire so you can renew yourself.",
  "Your worth was established before anyone arrived or left.",
  "The right person will love your darkness as much as your light.",
  "You’re allowed to be both a masterpiece and a work in progress.",
  "Some love is seasonal, appreciate it without holding on.",
  "Your heart knows when it’s time to let go.",
  "The right love will feel like breathing, not holding your breath.",
  "You deserve to be loved without having to read between the lines.",
  "Some people cross your path to show you the way, not to stay.",
  "Your healing will inspire the right people.",
  "The right person will choose you every time, no hesitation.",
  "You’re not alone in feeling this way.",
  "Some doors close because better ones are about to open.",
  "Your story is not over, keep turning the pages.",
  "The right love will make you feel seen, not just looked at.",
  "You’re allowed to outgrow who you used to be.",
  "Some love stories are brief but beautiful lessons.",
  "Your heart knows what it needs, give it time.",
  "The right person will love your silence too.",
  "You deserve more than almost relationships.",
  "Some people leave so you can learn to love yourself first.",
  "Your healing journey is valid, no matter how long it takes.",
  "The right love will never make you compete for affection.",
  "You’re allowed to want what you want.",
  "Some relationships end so you can begin the right one.",
  "Your peace is your superpower, protect it.",
  "The right person will love you when it’s inconvenient too.",
  "You’re not asking for too much.",
  "Some love is temporary, and that’s okay.",
  "Your heart is strong, trust its resilience.",
  "The right person will never make you guess where you stand.",
  "You deserve a love that’s sure.",
  "Some goodbyes are the beginning of self-discovery.",
  "Your worth doesn’t fluctuate based on who stays.",
  "The right love will feel like safety, not anxiety.",
  "You’re allowed to take your time.",
  "Some people are chapters, not the whole book.",
  "Your healing will attract the right kind of love.",
  "The right person will love all of you, even the parts you hide.",
  "You don’t have to prove you’re worthy of love.",
  "Some love teaches us what we actually want.",
  "Your feelings are your truth, honor them.",
  "The right love will never ask you to shrink.",
  "You’re allowed to want consistency.",
  "Some endings are actually answers to prayers you didn’t know you made.",
  "Your heart deserves more than almost.",
  "The right person will love your quirks too.",
  "You’re not too much, you’re exactly enough.",
  "Some people leave so you can learn to stand on your own.",
  "Your healing is not linear, it’s a spiral upward.",
  "The right love will feel like coming home to yourself.",
  "You deserve to be chosen explicitly.",
  "Some relationships are just holding patterns until the real thing arrives.",
  "Your growth is not betrayal of your past self.",
  "The right person will love you in all your seasons.",
  "You’re allowed to want clarity.",
  "Some love is just practice for the real thing.",
  "Your heart knows what it needs, trust the process.",
  "The right person will never make you feel like an option.",
  "You’re not difficult to love, you just have standards.",
  "Some doors close because the room is no longer for you.",
  "Your peace is worth more than their confusion.",
  "The right love will add to your life, not subtract from it.",
  "You deserve a love that’s sure and steady.",
  "Some people are meant to be memories, not realities.",
  "Your healing will lead you to the right love.",
  "The right person will understand without you having to explain.",
  "You’re allowed to want what you want without apology.",
  "Some endings are just the beginning of something beautiful.",
];

// Shuffle function to randomize quote order
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Create shuffled copy to ensure no repeats in a session
let shuffledQuotes = shuffleArray([...QUOTES]);
let quoteIndex = 0;

// Get next quote without repetition
function getNextQuote() {
  if (quoteIndex >= shuffledQuotes.length) {
    // Reshuffle when all quotes have been used
    shuffledQuotes = shuffleArray([...QUOTES]);
    quoteIndex = 0;
    console.log("🔄 Reshuffling quotes - all have been used once!");
  }
  return shuffledQuotes[quoteIndex++];
}

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

// Click helper (MAIN TWEET ONLY) - Uses Puppeteer native click for better compatibility
async function clickIfVisible(page, selectors = []) {
  try {
    // Find the main tweet
    const tweets = await page.$$('[role="article"], [data-testid="tweet"]');
    if (tweets.length === 0) return false;

    const mainTweet = tweets[0];

    // Try each selector on the main tweet only
    for (const selector of selectors) {
      try {
        const el = await mainTweet.$(selector);
        if (el) {
          await el.click();
          return true;
        }
      } catch (e) {
        // Selector error, try next one
      }
    }
    return false;
  } catch (err) {
    console.log("Click error:", err.message);
    return false;
  }
}

// Click helper (GLOBAL - searches entire page, not just main tweet)
async function clickIfVisibleGlobal(page, selectors = []) {
  try {
    // Try each selector globally on the entire page
    for (const selector of selectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          await el.click();
          return true;
        }
      } catch (e) {
        // Selector error, try next one
      }
    }
    return false;
  } catch (err) {
    console.log("Global click error:", err.message);
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

// Clear Chrome session files to prevent tab restore (but preserve user settings!)
function clearChromeSession(profileDir) {
  try {
    const sessionFiles = [
      path.join(profileDir, "Default", "Session"),
      path.join(profileDir, "Default", "Session Storage"),
      path.join(profileDir, "Default", "Current Session"),
      path.join(profileDir, "Default", "Current Tabs"),
      path.join(profileDir, "Default", "Last Session"),
      path.join(profileDir, "Default", "Last Tabs"),
      // ❌ REMOVED: Preferences - this preserves user settings like data saver!
    ];

    sessionFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          if (fs.statSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file);
          }
        } catch (e) {
          // Ignore errors, file might be locked
        }
      }
    });

    // Also clear for Profile 1, Profile 2, etc.
    for (let i = 1; i <= 5; i++) {
      const profilePath = path.join(profileDir, `Profile ${i}`);
      sessionFiles.forEach((file) => {
        const profileFile = file.replace("Default", `Profile ${i}`);
        if (fs.existsSync(profileFile)) {
          try {
            if (fs.statSync(profileFile).isDirectory()) {
              fs.rmSync(profileFile, { recursive: true, force: true });
            } else {
              fs.unlinkSync(profileFile);
            }
          } catch (e) {
            // Ignore errors
          }
        }
      });
    }
  } catch (err) {
    console.log("⚠️ Could not clear session files:", err.message);
  }
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
  // Clear Chrome session files BEFORE launching to prevent tab restore
  clearChromeSession(profileDir);

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
    // Close all extra tabs that Chrome restored from previous session
    const pages = await browser.pages();
    if (pages.length > 1) {
      console.log(
        `🧹 Closing ${pages.length - 1} extra tabs restored from previous session...`,
      );
      // Keep the first page, close the rest
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    }

    const page = pages[0]; // Use the existing first page instead of creating a new one

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

    // Wait for tweet actions to be fully loaded
    console.log(`⏳ Waiting for tweet actions to load...`);
    await page
      .waitForSelector('[data-testid="retweet"]', { timeout: 10000 })
      .catch(() => {
        console.log(
          `⚠️ Retweet button not immediately visible, continuing anyway...`,
        );
      });
    await sleepWithJitter(500, accountIndex);

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

    // ✍️ STEP 1: QUOTE FIRST (always try to quote, even if repost exists)
    if (DO_QUOTE) {
      console.log(`📝 ${profileName} starting Quote flow...`);

      // Click retweet icon (with retry logic) - checks both retweet and unretweet
      let retweetClicked = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 Retweet icon click attempt ${attempt}/3...`);
        retweetClicked = await clickIfVisible(page, [
          'div[data-testid="retweet"]',
          'button[data-testid="retweet"]',
          'div[data-testid="unretweet"]',
          'button[data-testid="unretweet"]',
        ]);
        if (retweetClicked) {
          console.log(
            `✅ Retweet icon clicked successfully on attempt ${attempt}`,
          );
          break;
        }
        if (attempt < 3) {
          console.log(`⏳ Waiting 1 second before retry...`);
          await sleep(1000);
        }
      }

      if (!retweetClicked) {
        console.log(
          `⚠️ ${profileName} could not find retweet icon for quote after 3 attempts.`,
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

      const randomQuote = getNextQuote(); // Uses shuffled quotes with no repeats
      await page.type('div[role="textbox"]', randomQuote, { delay: 60 });
      console.log(`💬 ${profileName} typed quote: "${randomQuote}"`);
      await sleepWithJitter(1000, accountIndex);

      // Click Post button (use GLOBAL search - button is in dialog overlay, not main tweet)
      const posted = await clickIfVisibleGlobal(page, [
        'div[data-testid="tweetButtonInline"]',
        'div[data-testid="tweetButton"]',
        'button[data-testid="tweetButton"]',
      ]);
      if (posted) {
        console.log(`✅ ${profileName} posted Quote successfully!`);
      } else {
        console.log(
          `⚠️ ${profileName} could not post Quote (may already be quoted). Continuing...`,
        );
      }

      await sleepWithJitter(2500, accountIndex);
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

        // Click retweet icon (with retry logic)
        let rtButton = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(
            `🔄 Retweet icon click attempt ${attempt}/3 for repost...`,
          );
          rtButton = await clickIfVisible(page, [
            'div[data-testid="retweet"]',
            'button[data-testid="retweet"]',
          ]);
          if (rtButton) {
            console.log(
              `✅ Retweet icon clicked successfully on attempt ${attempt}`,
            );
            break;
          }
          if (attempt < 3) {
            console.log(`⏳ Waiting 1 second before retry...`);
            await sleep(1000);
          }
        }

        if (!rtButton) {
          console.log(
            `⚠️ ${profileName} could not find Retweet icon for repost after 3 attempts.`,
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

  // Clear Chrome session files BEFORE launching to prevent tab restore
  clearChromeSession(profileDir);

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
    // Close all extra tabs that Chrome restored from previous session
    const pages = await browser.pages();
    if (pages.length > 1) {
      console.log(
        `🧹 Closing ${pages.length - 1} extra tabs restored from previous session...`,
      );
      // Keep the first page, close the rest
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    }

    const page = pages[0]; // Use the existing first page instead of creating a new one

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
