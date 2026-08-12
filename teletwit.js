import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import TelegramBot from "node-telegram-bot-api";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

const ACCOUNT_NAMES = [
  "adore",
  "hibye",
  // "bae",
  "lila",
  "orange",
  "bluemoon",
  "kiran",
  "inyvix",
  // "anchinka",
  // "ivy",
  // "meera",
  // "meera",
  "nyra",
  "arra",
  "Nina",
  "jenni",
  "myra",
  // "lila",
];

const HEADLESS = false;
const SLEEP_MS = 1500; // Match twit.js exactly
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ================== CONFIGURATION TIMER ==================
// Set to true to enable timer before redirecting to tweet URL (allows manual data saver setup)
// Set to false to skip timer and redirect immediately
const ENABLE_CONFIG_TIMER = false;
const CONFIG_TIMER_SECONDS = 15; // How long to wait before redirecting to tweet URL (in seconds)

// Telegram Configuration
const TELEGRAM_BOT_TOKEN = "8958275656:AAEkCWz0uLzooC0eXNWrRQM8i4RUX0biLbc";
const AUTHORIZED_CHAT_IDS = [
  "1991164194",
  "1956483216",
  "8749929962",
  "6961012476",
];

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not configured");
  process.exit(1);
}

if (!AUTHORIZED_CHAT_IDS || AUTHORIZED_CHAT_IDS.length === 0) {
  console.error("❌ AUTHORIZED_CHAT_IDS not configured");
  process.exit(1);
}

// ================== TELEGRAM BOT SETUP ==================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// ================== GLOBAL ERROR HANDLERS ==================
// Handle uncaught exceptions to prevent process crashes
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  console.error("Stack:", err.stack);
  // Don't exit - keep the bot running
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - keep the bot running
});

// ================== ANTI-DETECTION CONFIG ==================
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
];

const VIEWPORT_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 },
];

function getAccountFingerprint(accountIndex) {
  const seed = accountIndex * 9301 + 49297;
  const uaIndex = seed % USER_AGENTS.length;
  const vpIndex = (seed * 7) % VIEWPORT_SIZES.length;
  return {
    userAgent: USER_AGENTS[uaIndex],
    viewport: VIEWPORT_SIZES[vpIndex],
  };
}

function sleepWithJitter(ms, accountIndex) {
  const seed = accountIndex * 7919;
  const jitter = ((seed % 40) - 20) / 100;
  const actualMs = Math.floor(ms * (1 + jitter));
  return sleep(actualMs);
}

// ================== QUOTES ==================
const QUOTES = [
  "No means no, and yes means yes. Consent is everything.",
  "Your body, your rules. No one has the right to violate you.",
  "Survivors are not victims. They are fighters, warriors, and heroes.",
  "Sexual violence is never the survivor's fault. Never.",
  "Believe survivors. Listen to survivors. Support survivors.",
  "Consent must be enthusiastic, ongoing, and freely given.",
  "No one asks for sexual assault. No one deserves it.",
  "Silence is not consent. Only yes is consent.",
  "Your body is your sanctuary. No one has the right to invade it.",
  "Rape culture ends when we stop making excuses for perpetrators.",
  "Survivors deserve justice, healing, and unconditional support.",
  "Consent is not just about sex. It's about respect and autonomy.",
  "No amount of alcohol, clothing, or behavior justifies sexual violence.",
  "Survivors are not 'damaged goods.' They are resilient human beings.",
  "Teaching consent is not just for women. It's for everyone.",
  "The only person responsible for sexual assault is the perpetrator.",
  "Survivors don't owe anyone their story or their silence.",
  "Support survivors. Believe survivors. End sexual violence.",
  "Consent is a continuous conversation, not a one-time agreement.",
  "Your body belongs to you. Period. End of discussion.",
  "Sexual violence is a crime. Period. No exceptions.",
  "Survivors deserve to be heard, believed, and supported.",
  "No one has the right to touch you without your enthusiastic consent.",
  "Teaching boys to respect boundaries is as important as teaching girls to set them.",
  "Survivors are not defined by what happened to them.",
  "Consent is sexy. Violation is a crime.",
  "No always means no. Yes only means yes when it's freely given.",
  "Survivors don't owe anyone forgiveness or closure.",
  "Your body is not public property. It's yours alone.",
  "End rape culture. Start believing survivors.",
  "Consent is not ambiguous. It's clear, ongoing, and revocable.",
  "Your boundaries are valid. Your 'no' is enough.",
  "Survivors reclaim their power every single day.",
  "Consent cannot be assumed. It must be explicitly given.",
  "No one is entitled to access to your body.",
  "Survivors deserve safe spaces to heal and grow.",
  "Sexual violence is about power, never about desire.",
  "Teach consent early, teach consent often.",
  "Survivors' stories matter. Their truth matters.",
  "No one has the right to pressure or coerce you.",
  "Your comfort zone should never be violated.",
  "Consent education is violence prevention.",
  "Survivors are stronger than their darkest moments.",
  "No always means no, regardless of relationship status.",
  "Your body is not permission. Your presence is not consent.",
  "Believing survivors is an act of justice.",
  "Consent is not a gray area. It's black and white.",
  "Survivors don't owe you explanations.",
  "No amount of previous consent gives anyone ongoing rights.",
  "Your safety matters more than anyone's discomfort.",
  "Survivors heal at their own pace, on their own terms.",
  "Consent must be given without pressure or manipulation.",
  "No one is entitled to sex. No exceptions.",
  "Survivors deserve resources, support, and validation.",
  "Teaching consent is teaching respect for human dignity.",
  "Your body is not a playground for others.",
  "Consent cannot be given when someone is incapacitated.",
  "Survivors are not responsible for preventing their own assault.",
  "No one has the right to make you feel unsafe.",
  "Consent is about mutual respect and care.",
  "Survivors' healing journey is their own to navigate.",
  "No amount of money or status gives anyone the right to violate.",
  "Your comfort and safety are non-negotiable.",
  "Consent must be informed, enthusiastic, and revocable.",
  "Survivors deserve to feel safe in their own skin.",
  "No one is entitled to your time, attention, or body.",
  "Teaching boundaries is teaching self-worth.",
  "Survivors reclaim their voice, their power, their life.",
  "Consent is the foundation of healthy relationships.",
  "No means no. Yes means yes. Everything else is no.",
  "Survivors are not alone. They are surrounded by support.",
  "Your body autonomy is absolute and non-negotiable.",
  "Consent cannot be coerced, pressured, or manipulated.",
  "Survivors deserve to be believed without question.",
  "No one has the right to cross your boundaries.",
  "Your safety is more important than anyone's feelings.",
  "Consent education saves lives.",
  "Survivors are not statistics. They are human beings.",
  "No one is entitled to sexual access to anyone.",
  "Your body is not up for debate or discussion.",
  "Consent must be clear, conscious, and continuous.",
  "Survivors deserve to thrive, not just survive.",
  "No one has the right to invalidate your experience.",
  "Consent is about communication, not assumption.",
  "Survivors' resilience is their superpower.",
  "Your comfort matters. Your safety matters. You matter.",
  "Teaching consent creates a culture of respect.",
  "Survivors are the experts of their own experience.",
  "No one has the right to use your body without permission.",
  "Consent is not a favor. It's a fundamental right.",
  "Survivors deserve justice, validation, and peace.",
  "Your boundaries are sacred. Respect them.",
  "Consent is about equality, not entitlement.",
  "Survivors heal, grow, and reclaim their power.",
  "No one is entitled to sexual access under any circumstances.",
  "Your body is yours alone. Always has been, always will be.",
  "Consent education is violence prevention education.",
  "Survivors deserve to be heard without judgment.",
  "No one has the right to make you feel guilty for saying no.",
  "Consent is the minimum requirement for any sexual activity.",
  "Survivors are not broken. They are healing and whole.",
  "Your comfort zone is your right to defend.",
  "Consent must be given freely, without fear or pressure.",
  "Survivors' voices deserve to be amplified.",
  "No one is entitled to your body, ever, under any condition.",
  "Your safety is not negotiable.",
  "Consent is about respect, not conquest.",
  "Survivors deserve to feel proud of their survival.",
  "No one has the right to question your boundaries.",
  "Consent is clear, communicative, and compassionate.",
  "Survivors are not defined by someone else's crime.",
  "Your body autonomy is not up for discussion.",
  "Consent cannot be given under duress or fear.",
  "Survivors deserve to reclaim their narrative.",
  "No one has the right to manipulate or coerce you.",
  "Your 'no' is a complete sentence. It needs no explanation.",
  "Consent education starts with respecting children's boundaries.",
  "Survivors are warriors in their healing journey.",
  "No one is entitled to sexual attention or access.",
  "Your body is not a reward. Your presence is not consent.",
  "Consent must be explicit, not implied or assumed.",
  "Survivors deserve communities that believe and support them.",
  "No one has the right to make you feel obligated.",
  "Your comfort zone is your sacred space.",
  "Consent is about mutual pleasure and agreement.",
  "Survivors are not responsible for their perpetrator's actions.",
  "No one is entitled to touch you, ever, without clear consent.",
  "Your body is yours to control, completely and absolutely.",
  "Consent cannot be withdrawn under pressure or threat.",
  "Survivors deserve to feel safe and empowered.",
  "No one has the right to invalidate your trauma.",
  "Consent is the foundation of all healthy interactions.",
  "Survivors heal on their own timeline, at their own pace.",
  "Your boundaries deserve to be respected without question.",
  "Consent must be clear, coherent, and willing.",
  "Survivors are not weak. They are incredibly strong.",
  "No one has the right to use guilt as a weapon.",
  "Your body is not for others to control or claim.",
  "Consent education creates safer communities for everyone.",
  "Survivors deserve to live without fear and shame.",
  "No one is entitled to sexual access, regardless of relationship.",
  "Your safety is worth more than anyone's convenience.",
  "Consent is about communication, clarity, and care.",
  "Survivors are not alone in their healing journey.",
  "No one has the right to minimize your experience.",
  "Your comfort and safety are fundamental rights.",
  "Consent must be enthusiastic, not just absent of refusal.",
  "Survivors deserve to be believed without hesitation.",
  "No one is entitled to access to your body, ever.",
  "Your body autonomy is absolute and non-debatable.",
  "Consent cannot be given when power dynamics are unequal.",
  "Survivors reclaim their power every single day.",
  "No one has the right to question your trauma.",
  "Your body is not a battlefield for others' desires.",
  "Consent is about equality, respect, and mutual care.",
  "Survivors deserve to thrive in their healing journey.",
  "No one is entitled to sexual attention under any circumstances.",
  "Your 'no' is powerful. Your 'yes' is precious.",
  "Consent education is essential for creating safe spaces.",
  "Survivors are not responsible for fixing rape culture.",
  "No one has the right to make you feel small or powerless.",
  "Your body is yours to love, protect, and celebrate.",
  "Consent must be given freely, joyfully, and willingly.",
  "Survivors deserve to feel proud of their resilience.",
];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

let shuffledQuotes = shuffleArray([...QUOTES]);
let quoteIndex = 0;

function getNextQuote() {
  if (quoteIndex >= shuffledQuotes.length) {
    shuffledQuotes = shuffleArray([...QUOTES]);
    quoteIndex = 0;
  }
  return shuffledQuotes[quoteIndex++];
}

// ================== STATE MANAGEMENT ==================
let processingState = {
  isProcessing: false,
  currentJob: null,
  currentChatId: null, // Track whose job is currently processing
  results: [],
  startTime: null,
};

// Job queue system for multiple users
let jobQueue = [];
let isQueueProcessing = false;

// Per-user cancellation tracking
let userCancellations = {};

// Conversation states
let userStates = {};
// User selections (chatId -> array of selected actions)
let userSelections = {};

// ================== HELPER FUNCTIONS ==================
function getProfileDir(name) {
  const dir = path.join(BASE_USER_DATA_DIR, `Account_${name}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Escape special Markdown characters in text (safe for Telegram)
function escapeMarkdown(text) {
  // Only escape characters that actually break Telegram Markdown
  // Don't escape dots, URLs, equals, or other safe characters
  return text.replace(/([_*\[\]()~`>#+\\])/g, "\\$1");
}

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
          // Ignore errors
        }
      }
    });

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

async function isLoggedIn(page) {
  try {
    return (
      (await page.$('a[aria-label="Profile"]')) ||
      (await page.$('div[data-testid="AppTabBar_Profile_Link"]')) ||
      (await page.$('div[role="feed"]'))
    );
  } catch (error) {
    // Handle timeout errors gracefully - assume not already X
    if (error?.message?.includes("timed out")) {
      return false;
    }
    return false;
  }
}

async function clickIfVisible(page, selectors = []) {
  try {
    const tweets = await page.$$('[role="article"], [data-testid="tweet"]');
    if (tweets.length === 0) return false;

    const mainTweet = tweets[0];

    // Try each selector on the main tweet only
    for (const selector of selectors) {
      try {
        const el = await mainTweet.$(selector);
        if (el) {
          // Ensure element is visible and clickable
          const isVisible = await el.isIntersectingViewport();
          if (!isVisible) continue;

          // Scroll element into view if needed
          await el.scrollIntoViewIfNeeded();
          await sleep(100); // Small delay after scroll

          await el.click();
          return true;
        }
      } catch (e) {
        // Selector error, try next one
      }
    }

    // If normal selectors fail, try a more aggressive approach for small tweets
    try {
      const result = await page.evaluate((selArray) => {
        const tweets = document.querySelectorAll(
          '[role="article"], [data-testid="tweet"]',
        );
        if (tweets.length === 0) return false;

        const mainTweet = tweets[0];

        // Try each selector with more flexible matching
        for (const selector of selArray) {
          const element = mainTweet.querySelector(selector);
          if (element) {
            // Force click using JavaScript
            element.click();
            return true;
          }
        }
        return false;
      }, selectors);

      if (result) {
        return true;
      }
    } catch (e) {
      // Fallback click failed
    }

    return false;
  } catch (err) {
    return false;
  }
}

async function clickIfVisibleGlobal(page, selectors = []) {
  try {
    for (const selector of selectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          await el.click();
          return true;
        }
      } catch (e) {
        // Selector error
      }
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Smart tweet analysis function
async function analyzeTweetSize(page) {
  try {
    const analysis = await page.evaluate(() => {
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return null;

      const mainTweet = tweets[0];
      const rect = mainTweet.getBoundingClientRect();
      const height = rect.height;

      // Count various elements that affect size
      const textContent = mainTweet.querySelector('[data-testid="tweetText"]');
      const images = mainTweet.querySelectorAll('img[src*="pbs.twimg.com"]');
      const videos = mainTweet.querySelectorAll("video");
      const quotes = mainTweet.querySelectorAll('[role="article"]'); // Nested quotes
      const actions = mainTweet.querySelector('[data-testid="like"]')
        ?.parentElement?.parentElement;

      return {
        height: height,
        hasText: !!textContent,
        textLength: textContent ? textContent.textContent.length : 0,
        imageCount: images.length,
        hasVideo: videos.length > 0,
        hasQuote: quotes.length > 0,
        actionsVisible: actions ? true : false,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      };
    });

    return analysis;
  } catch (err) {
    console.log("Tweet analysis error:", err.message);
    return null;
  }
}

async function isAlreadyLiked(page) {
  try {
    const result = await page.evaluate(() => {
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;
      const mainTweet = tweets[0];

      // Check for unlike button - if present, tweet is already liked
      const unlikeBtn = mainTweet.querySelector('[data-testid="unlike"]');
      if (unlikeBtn) return true;

      // Fallback: Check for like button
      const likeBtn = mainTweet.querySelector('[data-testid="like"]');
      if (!likeBtn) return false;

      // Additional checks on like button
      const ariaLabel = (
        likeBtn.getAttribute("aria-label") || ""
      ).toLowerCase();
      if (
        ariaLabel.includes("unlike") ||
        ariaLabel.includes("liked") ||
        ariaLabel.includes("undo like")
      ) {
        return true;
      }

      return false;
    });
    return result;
  } catch (error) {
    // Handle timeout errors gracefully - assume not already X
    if (error?.message?.includes("timed out")) {
      return false;
    }
    return false;
  }
}

async function isAlreadyBookmarked(page) {
  try {
    const result = await page.evaluate(() => {
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;
      const mainTweet = tweets[0];

      // Check for removeBookmark button - if present, tweet is already bookmarked
      const removeBookmarkBtn = mainTweet.querySelector(
        '[data-testid="removeBookmark"]',
      );
      if (removeBookmarkBtn) return true;

      // Fallback: Check for bookmark button
      const bookmarkBtn = mainTweet.querySelector('[data-testid="bookmark"]');
      if (!bookmarkBtn) return false;

      // Additional checks on bookmark button
      const ariaLabel = (
        bookmarkBtn.getAttribute("aria-label") || ""
      ).toLowerCase();
      if (
        ariaLabel.includes("remove") ||
        ariaLabel.includes("unbookmark") ||
        ariaLabel.includes("bookmarked")
      ) {
        return true;
      }

      return false;
    });
    return result;
  } catch (error) {
    // Handle timeout errors gracefully - assume not already X
    if (error?.message?.includes("timed out")) {
      return false;
    }
    return false;
  }
}

async function isAlreadyRetweeted(page) {
  try {
    const result = await page.evaluate(() => {
      const tweets = document.querySelectorAll(
        '[role="article"], [data-testid="tweet"]',
      );
      if (tweets.length === 0) return false;
      const mainTweet = tweets[0];

      // Check for unretweet button - if present, tweet is already retweeted
      const unretweetBtn = mainTweet.querySelector('[data-testid="unretweet"]');
      if (unretweetBtn) return true;

      // Fallback: Check for retweet button
      const retweetBtn = mainTweet.querySelector('[data-testid="retweet"]');
      if (!retweetBtn) return false;

      // Additional checks on retweet button
      const ariaLabel = (
        retweetBtn.getAttribute("aria-label") || ""
      ).toLowerCase();
      if (
        ariaLabel.includes("undo") ||
        ariaLabel.includes("unretweet") ||
        ariaLabel.includes("retweeted")
      ) {
        return true;
      }

      return false;
    });
    return result;
  } catch (error) {
    // Handle timeout errors gracefully - assume not already X
    if (error?.message?.includes("timed out")) {
      return false;
    }
    return false;
  }
}

// ================== URL VALIDATION ==================
function isValidTwitterUrl(url) {
  // No validation - accept any URL the user sends
  return true;
}

// Clean URL by removing unnecessary query parameters
function cleanTwitterUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove only problematic tracking parameters that can cause issues
    // Keep the URL structure intact for all Twitter/X formats
    const paramsToDelete = ["s", "t", "source", "ref", "ref_url", "cxt", "cn"];
    paramsToDelete.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
      }
    });
    const cleaned = urlObj.toString();
    console.log(`🧹 URL cleaned: ${url} → ${cleaned}`);
    return cleaned;
  } catch (error) {
    console.log("⚠️ URL cleaning failed, using original:", error.message);
    return url; // Return original if cleaning fails
  }
}

// ================== MAIN PROCESSING FUNCTION ==================
async function processProfile(
  profileDir,
  profileName,
  accountIndex,
  batchSlot,
  tweetUrl,
  actions,
  chatId,
) {
  // Check per-user cancellation before launching browser
  if (userCancellations[chatId] && userCancellations[chatId].cancelled) {
    console.log(`❌ User ${chatId} cancelled before launching ${profileName}`);
    return { name: profileName, success: false, reason: "Cancelled" };
  }

  clearChromeSession(profileDir);
  const fingerprint = getAccountFingerprint(accountIndex);

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
    protocolTimeout: 120000, // Increase timeout to 2 minutes for slow browsers
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
    // Check per-user cancellation after browser launch
    if (userCancellations[chatId] && userCancellations[chatId].cancelled) {
      console.log(`❌ User ${chatId} cancelled after launching ${profileName}`);
      await browser.close();
      return { name: profileName, success: false, reason: "Cancelled" };
    }

    // CRITICAL FIX: Give Chrome time to fully launch and restore tabs
    console.log(`⏳ Waiting for Chrome to fully launch...`);
    await sleep(2000); // Wait 2 seconds for Chrome to stabilize

    // CRITICAL FIX: Check for X.com tabs with retry mechanism
    console.log(`🔍 Checking for restored X.com tabs...`);

    let xTab = null;
    let pages = [];
    let retries = 0;
    const maxRetries = 4; // Optimized to 4 retries

    // Retry loop to find X.com tab with delays between attempts
    while (retries < maxRetries && !xTab) {
      try {
        pages = await browser.pages();

        // Identify X.com tabs vs blank tabs
        let blankTabs = [];

        for (let i = 0; i < pages.length; i++) {
          try {
            const url = pages[i].url();
            if (url.includes("x.com") || url.includes("twitter.com")) {
              xTab = pages[i];
              console.log(`✅ Found X.com tab on attempt ${retries + 1}/${maxRetries}`);
              break;
            } else if (url === "about:blank" || url.includes("chrome://")) {
              blankTabs.push(pages[i]);
            }
          } catch (e) {
            blankTabs.push(pages[i]);
          }
        }

        if (xTab) {
          // Close all blank tabs
          for (const tab of blankTabs) {
            try {
              await tab.close();
            } catch (e) {
              // Ignore errors closing tabs
            }
          }
          break;
        }

        // X tab not found, wait and retry
        retries++;
        if (retries < maxRetries) {
          console.log(`⏳ No X.com tab found yet, retrying in 1s... (${retries}/${maxRetries})`);
          await sleep(1000); // Wait 1 second before retry
        }
      } catch (error) {
        console.log(`⚠️ Error checking pages: ${error.message}, retrying...`);
        retries++;
        await sleep(1000);
      }
    }

    // Use X tab if found, otherwise navigate blank tab to X.com
    let page;
    if (xTab) {
      console.log(`✅ Using restored X.com tab`);
      page = xTab;
    } else {
      console.log(`⚠️ No X.com tab found after ${maxRetries} retries`);
      console.log(`📝 Will navigate blank tab to X.com...`);

      pages = await browser.pages();
      page = pages[0] || (await browser.newPage());

      // Navigate to X.com and wait for it to load
      console.log(`🌐 Navigating to X.com...`);
      await page.goto("https://x.com/home", {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      console.log(`✅ Successfully navigated to X.com`);
    }

    // CRITICAL: Bring the correct tab to focus and verify it's active
    try {
      await page.bringToFront();
      await sleep(300); // Increased delay to ensure tab is active
    } catch (e) {
      console.log(`⚠️ Could not bring tab to front: ${e.message}`);
      // If bringToFront fails, try to create a new page
      try {
        page = await browser.newPage();
        console.log(`✅ Created new page instead`);
      } catch (newPageError) {
        console.log(`⚠️ Could not create new page: ${newPageError.message}`);
      }
    }

    // CRITICAL: Verify page is still valid before proceeding
    try {
      const currentUrl = page.url();
      console.log(`🔍 Current tab URL: ${currentUrl}`);

      // Check if we're on a blank page or chrome:// page
      if (currentUrl === "about:blank" || currentUrl.includes("chrome://")) {
        console.log(`⚠️ We're on a blank tab! Will navigate to X.com...`);
        // Don't try to switch, just navigate current tab to X.com
      } else if (currentUrl.includes("x.com") || currentUrl.includes("twitter.com")) {
        console.log(`✅ Already on X.com tab, good to go!`);
      } else {
        console.log(`⚠️ Unknown tab type, will navigate to X.com`);
      }
    } catch (urlError) {
      console.log(`⚠️ Could not get page URL: ${urlError.message}, page might be closed`);
      // Try to create a new page if current one is closed
      try {
        page = await browser.newPage();
        console.log(`✅ Created new page after URL check failed`);
      } catch (newPageError) {
        console.log(`❌ Could not create new page: ${newPageError.message}`);
        throw new Error("Cannot get a valid page to work with");
      }
    }

    // CRITICAL FIX: Check where we are BEFORE redirecting to tweet URL
    // If we're on a blank tab, switch to X tab; if X tab, we're good to go
    let currentUrl = page.url();
    console.log(`🔍 Current tab URL: ${currentUrl}`);

    // Check if we're on a blank page or chrome:// page
    if (currentUrl === "about:blank" || currentUrl.includes("chrome://")) {
      console.log(`⚠️ We're on a blank tab! Checking for X tab...`);

      // If we found an X tab earlier, switch to it
      if (xTab) {
        console.log(`✅ Found X tab, switching to it...`);
        page = xTab;
        await page.bringToFront();
        await sleep(200);
        currentUrl = page.url();
        console.log(`✅ Switched to X tab: ${currentUrl}`);
      } else {
        console.log(`⚠️ No X tab found, will navigate current tab to X.com`);
      }
    } else if (currentUrl.includes("x.com") || currentUrl.includes("twitter.com")) {
      console.log(`✅ Already on X.com tab, good to go!`);
    } else {
      console.log(`⚠️ Unknown tab type, current URL: ${currentUrl}`);
    }

    await page.setUserAgent(fingerprint.userAgent);

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
      window.chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: "granted" })
          : originalQuery(parameters);
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    await page.goto("https://x.com/home", {
      waitUntil: "networkidle2",
      timeout: 80000,
    });

    // Wait for loading spinners to disappear and page to be ready
    console.log(`⏳ ${profileName} waiting for page to fully load...`);
    await sleepWithJitter(SLEEP_MS, accountIndex); // Initial wait

    // Wait for common loading indicators to disappear
    try {
      // Wait for loading spinners to be gone (up to 10 seconds)
      await page.waitForFunction(
        () => {
          const spinners = document.querySelectorAll(
            '[role="progressbar"], svg[aria-label="Loading"], [data-testid="loading"]',
          );
          return spinners.length === 0 || !spinners[0]?.isConnected;
        },
        { timeout: 10000 },
      );
      console.log(`✅ ${profileName} loading spinners gone`);
    } catch (e) {
      console.log(
        `⚠️ ${profileName} no spinners detected or timeout - continuing`,
      );
    }

    // Additional wait for page to stabilize
    await sleepWithJitter(2000, accountIndex);

    // Check login status with retry logic
    let loggedIn = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      loggedIn = await isLoggedIn(page);
      if (loggedIn) {
        console.log(
          `✅ ${profileName} login check passed on attempt ${attempt}`,
        );
        break;
      }
      if (attempt < 3) {
        console.log(
          `⚠️ ${profileName} login check attempt ${attempt} failed, waiting...`,
        );
        await sleepWithJitter(2000, accountIndex);
      }
    }

    if (!loggedIn) {
      const errorMsg = `${profileName} is NOT logged in.`;
      console.log(`⚠️ ${errorMsg}`);
      console.log(
        `   The page may still be loading or the account is not authenticated.`,
      );
      console.log(
        `   Try running the account manually once to ensure it's logged in.`,
      );
      // Only send error message, don't spam Telegram for every account
      return { name: profileName, success: false, reason: "Not logged in" };
    }

    console.log(`✅ ${profileName} is logged in — proceeding...`);

    // Configuration timer - allows manual setup (data saver, etc.) before redirecting to tweet
    if (ENABLE_CONFIG_TIMER) {
      console.log(
        `\n⏱️ Configuration Timer: ${CONFIG_TIMER_SECONDS} seconds...`,
      );
      console.log(`   👉 Enable data saver NOW in browser window!`);
      for (let i = CONFIG_TIMER_SECONDS; i > 0; i--) {
        console.log(`   ⏳ ${i} seconds remaining...`);
        await sleep(1000);
      }
      console.log(`   ✅ Timer complete - redirecting to tweet now!\n`);
    }

    try {
      await page.goto(tweetUrl, { waitUntil: "networkidle2", timeout: 60000 });
      await sleepWithJitter(2500, accountIndex); // Match twit.js exactly

      // Smart scrolling based on comprehensive tweet analysis
      const tweetAnalysis = await analyzeTweetSize(page);

      if (!tweetAnalysis) {
        await page.evaluate(() => window.scrollBy(0, 300));
      } else {
        // Smart scroll calculation based on comprehensive analysis
        let scrollAmount = 300; // Default

        if (tweetAnalysis.height < 150) {
          // Extremely small tweet (just text, no media)
          scrollAmount = 80;
        } else if (
          tweetAnalysis.height < 250 &&
          tweetAnalysis.textLength < 100
        ) {
          // Small text-only tweet
          scrollAmount = 120;
        } else if (tweetAnalysis.height < 350) {
          // Medium-small tweet
          scrollAmount = 180;
        } else if (
          tweetAnalysis.height < 500 &&
          tweetAnalysis.imageCount === 0 &&
          !tweetAnalysis.hasVideo
        ) {
          // Medium text tweet
          scrollAmount = 250;
        } else if (tweetAnalysis.imageCount > 0 || tweetAnalysis.hasVideo) {
          // Tweet with media
          scrollAmount = 400;
        } else if (tweetAnalysis.hasQuote) {
          // Tweet with quote
          scrollAmount = 450;
        } else if (tweetAnalysis.height < 700) {
          // Large tweet
          scrollAmount = 350;
        } else {
          // Very large tweet
          scrollAmount = 500;
        }

        // Apply the smart scroll
        await page.evaluate(
          (amount) => window.scrollBy(0, amount),
          scrollAmount,
        );
        await sleepWithJitter(1000, accountIndex); // Match twit.js exactly
      }

      // Wait for tweet actions to be fully loaded with enhanced retry logic
      let actionsVisible = false;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await page.waitForSelector('[data-testid="retweet"]', {
            timeout: 3500,
          });
          actionsVisible = true;
          break;
        } catch (e) {
          if (attempt < 4) {
            // Smart adjustment based on attempt number
            const adjustment =
              attempt === 1
                ? 30
                : attempt === 2
                  ? 60
                  : attempt === 3
                    ? -40
                    : 20;
            await page.evaluate((amt) => window.scrollBy(0, amt), adjustment);
            await sleepWithJitter(700, accountIndex);
          }
        }
      }

      if (!actionsVisible) {
        // Final recovery attempt: scroll back and try again
        await page.evaluate(() => window.scrollBy(0, -80));
        await sleepWithJitter(600, accountIndex);

        // One last check
        try {
          await page.waitForSelector('[data-testid="retweet"]', {
            timeout: 2000,
          });
        } catch (e) {
          // Actions still not detected, will proceed with caution
        }
      }

      await sleepWithJitter(500, accountIndex);
    } catch (navError) {
      const errorMsg = `🔥 Navigation error for ${profileName}: ${navError.message}`;
      console.error(errorMsg);
      console.error(`   URL that failed: ${tweetUrl}`);
      await bot.sendMessage(chatId, `❌ ${errorMsg}\n\nURL: ${tweetUrl}`);
      return { name: profileName, success: false, reason: "Navigation failed" };
    }

    const actionResults = {};

    // ❤️ Like
    if (actions.includes("like")) {
      const alreadyLiked = await isAlreadyLiked(page);
      if (alreadyLiked) {
        console.log(`⏭️ ${profileName} already liked this tweet — skipping.`);
        actionResults.like = "already liked";
      } else {
        // Enhanced click logic with multiple attempts and scroll adjustments
        let liked = false;
        for (let attempt = 1; attempt <= 4; attempt++) {
          // Try clicking with various selectors
          liked = await clickIfVisible(page, [
            'div[data-testid="like"]',
            'button[data-testid="like"]',
            'svg[aria-label="Like"]',
          ]);

          if (liked) break;

          // If not successful, try adjusting scroll position
          if (attempt < 4) {
            const scrollAdjustment =
              attempt === 1 ? 0 : attempt === 2 ? 50 : attempt === 3 ? -30 : 20;
            await page.evaluate(
              (amt) => window.scrollBy(0, amt),
              scrollAdjustment,
            );
            await sleepWithJitter(600, accountIndex);
          }
        }

        if (liked) {
          console.log(`❤️ ${profileName} liked the tweet.`);
          actionResults.like = "success";
        } else {
          console.log(`⚠️ ${profileName} could not like tweet after retries.`);
          actionResults.like = "failed";
        }
      }
      await sleepWithJitter(1000, accountIndex); // Match twit.js exactly
    }

    // 🔖 Bookmark
    if (actions.includes("bookmark")) {
      const alreadyBookmarked = await isAlreadyBookmarked(page);
      if (alreadyBookmarked) {
        console.log(
          `⏭️ ${profileName} already bookmarked this tweet — skipping.`,
        );
        actionResults.bookmark = "already bookmarked";
      } else {
        const bookmarked = await clickIfVisible(page, [
          'div[data-testid="bookmark"]',
          'button[data-testid="bookmark"]',
          'svg[aria-label="Bookmark"]',
        ]);
        if (bookmarked) {
          console.log(`🔖 ${profileName} bookmarked the tweet.`);
          actionResults.bookmark = "success";
        } else {
          actionResults.bookmark = "failed";
        }
      }
      await sleepWithJitter(1000, accountIndex); // Match twit.js exactly
    }

    // ✍️ Quote Tweet
    if (actions.includes("quote")) {
      console.log(`📝 ${profileName} starting Quote flow...`);

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
          console.log(`⏳ Waiting 1 second before retry...`); // Match twit.js
          await sleep(1000); // Fixed sleep, not jitter (match twit.js)
        }
      }

      if (!retweetClicked) {
        console.log(
          `⚠️ ${profileName} could not find retweet icon for quote after 3 attempts.`,
        );
        return { name: profileName, success: false, reason: "No retweet icon" }; // Match twit.js early return
      } else {
        await sleepWithJitter(1200, accountIndex); // Match twit.js exactly

        const quoteMenuItems = await page.$$(`div[role="menuitem"]`);
        if (quoteMenuItems.length >= 2) {
          await quoteMenuItems[1].click();
          console.log(`✍️ ${profileName} selected "Quote" option.`);
        } else {
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
            }; // Match twit.js early return
          }
        }

        await page
          .waitForSelector('div[role="textbox"]', { timeout: 10000 })
          .catch(() => {});

        await sleepWithJitter(800, accountIndex); // Match twit.js exactly
        await page.click('div[role="textbox"]');
        await sleepWithJitter(400, accountIndex); // Match twit.js exactly

        const randomQuote = getNextQuote();
        await page.type('div[role="textbox"]', randomQuote, { delay: 60 }); // Match twit.js exactly
        console.log(`💬 ${profileName} typed quote: "${randomQuote}"`);
        await sleepWithJitter(1000, accountIndex); // Match twit.js exactly

        const posted = await clickIfVisibleGlobal(page, [
          'div[data-testid="tweetButtonInline"]',
          'div[data-testid="tweetButton"]',
          'button[data-testid="tweetButton"]',
        ]);
        if (posted) {
          console.log(`✅ ${profileName} posted Quote successfully!`);
          actionResults.quote = "success";
        } else {
          console.log(
            `⚠️ ${profileName} could not post Quote (may already be quoted). Continuing...`,
          );
          actionResults.quote = "failed";
        }

        await sleepWithJitter(2500, accountIndex); // Match twit.js exactly
      }
    }

    // 🔁 Retweet
    if (actions.includes("retweet")) {
      const alreadyRetweeted = await isAlreadyRetweeted(page);
      if (alreadyRetweeted) {
        console.log(
          `⏭️ ${profileName} already retweeted this tweet — skipping.`,
        );
        actionResults.retweet = "already retweeted";
      } else {
        console.log(`🔁 ${profileName} performing simple retweet now...`);

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
            console.log(`⏳ Waiting 1 second before retry...`); // Match twit.js
            await sleep(1000); // Fixed sleep, not jitter (match twit.js)
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
          }; // Match twit.js early return
        } else {
          await sleepWithJitter(1000, accountIndex); // Match twit.js exactly

          const repostMenuItems = await page.$$(`div[role="menuitem"]`);
          if (repostMenuItems.length > 0) {
            await repostMenuItems[0].click();
            console.log(`🔁 ${profileName} clicked "Retweet" successfully.`);
            actionResults.retweet = "success";
          } else {
            console.log(`⚠️ Retweet menu not found for repost.`);
            return {
              name: profileName,
              success: false,
              reason: "Repost menu missing",
            }; // Match twit.js early return
          }

          await sleepWithJitter(1500, accountIndex); // Match twit.js exactly
          console.log(`✅ ${profileName} completed Quote + Repost sequence.`);
        }
      }
    }

    // Check per-user cancellation before sending any messages
    if (userCancellations[chatId] && userCancellations[chatId].cancelled) {
      console.log(
        `❌ User ${chatId} cancelled before sending messages for ${profileName}`,
      );
      return { name: profileName, success: false, reason: "Cancelled" };
    }

    // Skip individual failure messages - final summary will show everything
    // No need to spam user with individual account updates during processing

    return { name: profileName, success: true, actions: actionResults };
  } catch (err) {
    // Handle all types of errors including timeouts
    let errorMsg = `🔥 Error with ${profileName}: ${err.message}`;

    // Special handling for timeout errors
    if (err.message && err.message.includes("timed out")) {
      errorMsg = `⏱️ Timeout with ${profileName}: Browser took too long to respond`;
      console.error(errorMsg);
      console.error(
        `   This usually happens when the browser is unresponsive or the page is very slow.`,
      );
      console.error(`   Continuing to next account...`);
      // Don't spam user with timeout messages - just log it
      return {
        name: profileName,
        success: false,
        reason: "Browser timeout - continuing to next account",
      };
    }

    console.error(errorMsg);
    // Only send message for non-timeout errors to avoid spam
    if (!err.message || !err.message.includes("timed out")) {
      try {
        await bot.sendMessage(chatId, `❌ ${errorMsg}`);
      } catch (sendError) {
        console.error("Could not send error message:", sendError.message);
      }
    }
    return { name: profileName, success: false, reason: err.message };
  } finally {
    try {
      await browser.close();
    } catch (closeError) {
      console.error(
        `Error closing browser for ${profileName}:`,
        closeError.message,
      );
    }
  }
}

// ================== JOB PROCESSING ==================
async function processJob(tweetUrl, actions, chatId) {
  const isCurrentlyProcessing =
    isQueueProcessing || processingState.isProcessing;

  if (isCurrentlyProcessing) {
    // Something is already running - queue this job
    jobQueue.push({
      tweetUrl,
      actions,
      chatId,
      timestamp: new Date(),
    });

    console.log(`📝 Job queued. Queue length: ${jobQueue.length}`);

    await bot.sendMessage(
      chatId,
      `📝 JOB QUEUED\n\nYour job will be processed after the current one completes.\nPosition in queue: ${jobQueue.length}\n\n⏳ Please wait...`,
    );
  } else {
    // Nothing is running - start immediately without queue
    console.log(`🚀 Starting job immediately (no queue)`);

    // Add to queue so processQueue can pick it up
    jobQueue.push({
      tweetUrl,
      actions,
      chatId,
      timestamp: new Date(),
    });

    // Start processing immediately
    processQueue();
  }
}

async function processQueue() {
  if (isQueueProcessing || jobQueue.length === 0) return;

  isQueueProcessing = true;
  console.log(`🚀 Starting queue processing. Jobs: ${jobQueue.length}`);

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    console.log(`📋 Processing job for user ${job.chatId}`);

    processingState.isProcessing = true;
    processingState.currentJob = { url: job.tweetUrl, actions: job.actions };
    processingState.currentChatId = job.chatId; // Track whose job this is
    processingState.results = [];
    processingState.startTime = new Date();

    try {
      const actionIcons = {
        like: "❤️",
        bookmark: "🔖",
        quote: "✍️",
        retweet: "🔁",
      };

      const actionDisplay = job.actions.map((a) => actionIcons[a]).join(" ");

      await bot.sendMessage(
        job.chatId,
        `🚀 STARTING PROCESSING\n\n📱 URL: ${job.tweetUrl}\n🎯 Actions: ${actionDisplay}\n👥 Accounts: ${ACCOUNT_NAMES.length}\n\n⏱️ Started at: ${processingState.startTime.toLocaleString()}`,
      );

      // Process accounts in parallel batches
      const CONCURRENCY = 2;
      for (let i = 0; i < ACCOUNT_NAMES.length; i += CONCURRENCY) {
        // Check if job was cancelled mid-processing
        if (job.chatId && processingState.currentChatId !== job.chatId) {
          console.log(`❌ Job was cancelled for user ${job.chatId}`);
          break;
        }

        const batch = ACCOUNT_NAMES.slice(i, i + CONCURRENCY);
        console.log(`\n🔄 Processing batch: ${batch.join(", ")}`);

        const batchResults = await Promise.all(
          batch.map(async (name, batchIndex) => {
            const accountIndex = i + batchIndex;
            const dir = getProfileDir(name);
            return await processProfile(
              dir,
              name,
              accountIndex,
              batchIndex,
              job.tweetUrl,
              job.actions,
              job.chatId,
            );
          }),
        );

        processingState.results.push(...batchResults);

        // Check if job was cancelled during batch processing
        if (
          !processingState.isProcessing ||
          processingState.currentChatId !== job.chatId
        ) {
          console.log(
            `❌ Job was cancelled for user ${job.chatId} during batch processing`,
          );
          // Send cancellation message with START button
          try {
            await bot.sendMessage(job.chatId, "✅ Job cancelled.", {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🚀 START NEW JOB", callback_data: "start_new" }],
                ],
              },
            });
          } catch (error) {
            console.error(
              "Could not send cancellation message:",
              error.message,
            );
          }
          break; // Exit the loop silently
        }

        // Only send batch update if there are issues (reduce Telegram spam)
        const hasFailures = batchResults.some((r) => !r.success);
        if (hasFailures) {
          const batchSummary = batchResults
            .map((r) => (r.success ? `✅${r.name}` : `❌${r.name}`))
            .join(", ");
          await bot.sendMessage(
            job.chatId,
            `📦 Batch complete: ${batchSummary}`,
          );
        }
      }

      // Only generate final summary if job wasn't cancelled
      if (
        !processingState.isProcessing ||
        processingState.currentChatId !== job.chatId
      ) {
        console.log(
          `⏭️ Job was cancelled, skipping final summary for user ${job.chatId}`,
        );
        // Send cancellation message with START button
        try {
          await bot.sendMessage(job.chatId, "✅ Job cancelled.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 START NEW JOB", callback_data: "start_new" }],
              ],
            },
          });
        } catch (error) {
          console.error("Could not send cancellation message:", error.message);
        }
        continue; // Skip to next job in queue
      }

      // Generate final summary
      const successCount = processingState.results.filter(
        (r) => r.success,
      ).length;
      const failureCount = processingState.results.filter(
        (r) => !r.success,
      ).length;
      const endTime = new Date();
      const duration = Math.round((endTime - processingState.startTime) / 1000);

      let summaryMessage = `✅ *PROCESSING COMPLETE*\n\n`;
      summaryMessage += `📊 Results: ${successCount}/${ACCOUNT_NAMES.length} succeeded\n`;
      summaryMessage += `⏱️ Duration: ${duration} seconds\n\n`;

      if (failureCount > 0) {
        summaryMessage += `❌ Failed accounts:\n`;
        processingState.results
          .filter((r) => !r.success)
          .forEach((r) => {
            summaryMessage += `  • ${r.name}: ${r.reason}\n`;
          });
        summaryMessage += `\n`;
      }

      summaryMessage += `✅ Successful accounts:\n`;
      processingState.results
        .filter((r) => r.success)
        .forEach((r) => {
          const actionStatus = Object.entries(r.actions || {})
            .map(([action, result]) => {
              const icons = {
                like: "❤️",
                bookmark: "🔖",
                quote: "✍️",
                retweet: "🔁",
              };

              // ANY result that contains "already" is SUCCESS (not failure)
              if (!result) {
                return `${icons[action]}⊘`; // No result = failure
              }

              const resultStr = String(result).toLowerCase().trim();

              // Success states that show ✓
              const successStates = [
                "success",
                "already liked",
                "already bookmarked",
                "already retweeted",
                "liked",
                "bookmarked",
                "retweeted",
                "posted",
                "complete",
                "done",
              ];

              // If it contains "already" it's automatically success
              if (resultStr.includes("already")) {
                return `${icons[action]}✓`;
              }

              // Check against known success states
              if (
                successStates.some(
                  (state) => resultStr === state || resultStr.includes(state),
                )
              ) {
                return `${icons[action]}✓`;
              }

              // Everything else is failure
              return `${icons[action]}⊘`;
            })
            .join(" ");
          summaryMessage += `  • ${r.name}: ${actionStatus}\n`;
        });

      await bot.sendMessage(job.chatId, summaryMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 START NEW JOB", callback_data: "start_new" }],
          ],
        },
      });
    } catch (error) {
      await bot.sendMessage(job.chatId, `🔥 CRITICAL ERROR: ${error.message}`);
    } finally {
      processingState.isProcessing = false;
      processingState.currentJob = null;
      processingState.currentChatId = null; // Clear current user

      // Clear cancellation flag for this user so they can start new jobs
      if (userCancellations[job.chatId]) {
        delete userCancellations[job.chatId];
      }

      console.log(
        `✅ Job completed for user ${job.chatId}. Remaining jobs: ${jobQueue.length}`,
      );
    }
  }

  // Mark queue processing as complete
  isQueueProcessing = false;
  console.log(`🏁 Queue processing complete.`);

  // If new jobs were added while processing, start again
  if (jobQueue.length > 0) {
    console.log(`🔄 New jobs detected, restarting queue processing...`);
    setTimeout(() => processQueue(), 1000);
  }
}

// ================== COMMAND HANDLERS ==================
bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      await bot.sendMessage(
        chatId,
        "❌ You are not authorized to use this bot.",
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `🤖 Twitter Automation Bot\n\nCommands:\n/tweet - Process a tweet (interactive)\n/status - Show current status\n/cancel - Cancel current operation\n/help - Show this help message\n\nBot is ready and waiting for commands...`,
    );
  } catch (error) {
    console.error("❌ Error in /start handler:", error.message);
    // Try to notify user if possible, but don't crash
    try {
      const chatId = msg.chat.id;
      await bot.sendMessage(chatId, "❌ Error starting bot. Please try again.");
    } catch (sendError) {
      console.error("❌ Could not notify user of error:", sendError.message);
    }
  }
});

bot.onText(/\/tweet/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      await bot.sendMessage(
        chatId,
        "❌ You are not authorized to use this bot.",
      );
      return;
    }

    // Clear any old cancellation flags for this user
    if (userCancellations[chatId]) {
      delete userCancellations[chatId];
    }

    // Let multiple users start simultaneously - they'll be queued if needed
    // Only block if THIS specific user already has an active state
    if (userStates[chatId]) {
      await bot.sendMessage(
        chatId,
        "⚠️ You already have an active operation. Send /cancel to stop it.",
      );
      return;
    }

    // Start conversation - ask for URL
    userStates[chatId] = { step: "waiting_url" };

    await bot.sendMessage(
      chatId,
      `📱 Step 1/2: Send Tweet URL\n\nPlease paste the Twitter/X tweet URL you want to process.\n\nExample: https://x.com/elonmusk/status/123456\n\nSend /cancel to stop.`,
    );
  } catch (error) {
    console.error("❌ Error in /tweet handler:", error.message);
    // Try to notify user if possible, but don't crash
    try {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        "❌ Error starting tweet process. Please try again.",
      );
    } catch (sendError) {
      console.error("❌ Could not notify user of error:", sendError.message);
    }
  }
});

bot.onText(/\/cancel/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      await bot.sendMessage(
        chatId,
        "❌ You are not authorized to use this bot.",
      );
      return;
    }

    // Set per-user cancellation flag
    userCancellations[chatId] = {
      cancelled: true,
      cancelledAt: new Date(),
    };

    // Cancel everything for this user - no questions, no details
    delete userStates[chatId];
    delete userSelections[chatId];

    // Cancel jobs in queue for this user
    jobQueue = jobQueue.filter((job) => job.chatId !== chatId);

    // Cancel current processing if it's this user's job
    if (
      processingState.isProcessing &&
      processingState.currentChatId === chatId
    ) {
      processingState.isProcessing = false;
      processingState.currentJob = null;
      processingState.currentChatId = null;
    }

    await bot.sendMessage(chatId, "✅ Cancelled.");
  } catch (error) {
    console.error("❌ Error in /cancel handler:", error.message);
    // Try to notify user if possible, but don't crash
    try {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        "❌ Error during cancellation. Please try again.",
      );
    } catch (sendError) {
      console.error("❌ Could not notify user of error:", sendError.message);
    }
  }
});

bot.onText(/\/status/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      await bot.sendMessage(
        chatId,
        "❌ You are not authorized to use this bot.",
      );
      return;
    }

    let statusMessage = `📊 Bot Status\n\n`;

    if (processingState.isProcessing) {
      statusMessage += `Status: 🔄 Processing\n`;
      statusMessage += `URL: ${processingState.currentJob.url}\n`;
      statusMessage += `Actions: ${processingState.currentJob.actions.join(", ")}\n`;
      statusMessage += `Progress: ${processingState.results.length}/${ACCOUNT_NAMES.length} accounts\n`;

      if (processingState.results.length > 0) {
        statusMessage += `\nRecent results:\n`;
        processingState.results.slice(-5).forEach((r) => {
          statusMessage += `  ${r.success ? "✅" : "❌"} ${r.name}\n`;
        });
      }
    } else {
      statusMessage += `Status: ✅ Idle\n`;
      statusMessage += `Accounts: ${ACCOUNT_NAMES.length}\n`;
      statusMessage += `Last run: ${processingState.startTime ? processingState.startTime.toLocaleString() : "Never"}\n`;

      if (processingState.results.length > 0) {
        const successCount = processingState.results.filter(
          (r) => r.success,
        ).length;
        statusMessage += `\nLast run results: ${successCount}/${processingState.results.length} succeeded`;
      }
    }

    await bot.sendMessage(chatId, statusMessage);
  } catch (error) {
    console.error("❌ Error in /status handler:", error.message);
    // Try to notify user if possible, but don't crash
    try {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        "❌ Error getting status. Please try again.",
      );
    } catch (sendError) {
      console.error("❌ Could not notify user of error:", sendError.message);
    }
  }
});

bot.onText(/\/help/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      await bot.sendMessage(
        chatId,
        "❌ You are not authorized to use this bot.",
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `🤖 Twitter Automation Bot Help\n\nCommands:\n/tweet - Process a tweet (interactive menu)\n/status - Show current processing status\n/cancel - Cancel current operation\n/help - Show this help message\n\nHow to Use:\n1. Send /tweet\n2. Paste the tweet URL\n3. Click buttons to select actions\n4. Bot processes automatically\n\nAvailable Actions:\n• ❤️ Like - Like the tweet\n• 🔖 Bookmark - Bookmark the tweet\n• ✍️ Quote - Quote tweet with random text\n• 🔁 Retweet - Retweet the tweet\n• 🚀 All Actions - Do everything\n\nFeatures:\n• ✅ No complex command syntax\n• 🎯 Easy button selection\n• 📊 Real-time progress updates\n• 👥 Multiple accounts processed simultaneously`,
    );
  } catch (error) {
    console.error("❌ Error in /help handler:", error.message);
    // Try to notify user if possible, but don't crash
    try {
      const chatId = msg.chat.id;
      await bot.sendMessage(chatId, "❌ Error showing help. Please try again.");
    } catch (sendError) {
      console.error("❌ Could not notify user of error:", sendError.message);
    }
  }
});

// ================== MESSAGE HANDLER (Interactive Flow) ==================
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const text = msg.text;

    console.log(`📩 Message received from ${chatId}: ${text}`);

    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      console.log(`❌ Unauthorized user: ${chatId}`);
      return;
    }

    // Skip commands and non-text messages
    if (text && text.startsWith("/")) {
      console.log(`⏭️ Skipping command: ${text}`);
      return;
    }
    if (!text) return;

    // Check if user is in a conversation state
    if (!userStates[chatId]) {
      // Auto-start if they sent a valid URL
      if (isValidTwitterUrl(text)) {
        console.log(
          `🚀 Auto-starting conversation for valid URL from user ${chatId}`,
        );
        userStates[chatId] = { step: "waiting_url" };
        // Continue to URL processing below
      } else {
        console.log(`❌ No active state for user ${chatId}`);
        await bot.sendMessage(
          chatId,
          "❓ Need to start a task?\n\nSend /tweet to begin processing a tweet.\n\nOr send /help for all commands.",
        );
        return;
      }
    }

    const state = userStates[chatId];
    console.log(`👤 User ${chatId} state: ${state.step}`);

    if (state.step === "waiting_url") {
      console.log(`🔍 Validating URL: ${text}`);

      // Validate URL
      if (!isValidTwitterUrl(text)) {
        console.log(`❌ Invalid URL: ${text}`);
        await bot.sendMessage(
          chatId,
          "❌ Invalid Twitter URL.\n\n" +
            "Please send a valid tweet URL.\n\n" +
            "Example: https://x.com/elonmusk/status/123456\n\n" +
            "Send /cancel to stop.",
        );
        return;
      }

      console.log(`✅ URL valid: ${text}`);

      // Clean the URL to remove unnecessary query parameters (keeps all URL formats working)
      const cleanedUrl = cleanTwitterUrl(text);
      console.log(`✅ Using URL: ${cleanedUrl}`);

      // URL is valid, move to action selection
      state.url = cleanedUrl;
      state.step = "waiting_actions";

      // Initialize empty selection for this user
      userSelections[chatId] = [];

      console.log(`🎯 Showing action menu to user ${chatId}`);

      try {
        // Show action selection keyboard
        await bot.sendMessage(
          chatId,
          `✅ URL Received!\n\n🔗 ${text}\n\nClick buttons to toggle selection:\n\n📱 Selected: None`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "❤️ Like", callback_data: "toggle_like" },
                  { text: "🔖 Bookmark", callback_data: "toggle_bookmark" },
                ],
                [
                  { text: "✍️ Quote", callback_data: "toggle_quote" },
                  { text: "🔁 Retweet", callback_data: "toggle_retweet" },
                ],
                [
                  {
                    text: "❤️🔖 Like + Bookmark",
                    callback_data: "select_like_bookmark",
                  },
                ],
                [
                  {
                    text: "✍️🔁 Quote + Retweet",
                    callback_data: "select_quote_retweet",
                  },
                ],
                [{ text: "🎯 ALL", callback_data: "select_all" }],
                [{ text: "🧹 Clear All", callback_data: "clear_all" }],
                [{ text: "🚀 START", callback_data: "start_processing" }],
                [{ text: "❌ Cancel", callback_data: "action_cancel" }],
              ],
            },
          },
        );
        console.log(`✅ Action menu sent successfully`);
      } catch (error) {
        console.error(`❌ Error sending action menu: ${error.message}`);
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in message handler:", error.message);
    // Try to notify user if possible, but don't crash
    try {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        "❌ Error processing message. Please try again.",
      );
    } catch (sendError) {
      console.error("❌ Could not notify user of error:", sendError.message);
    }
  }
});

// ================== CALLBACK QUERY HANDLER (Button Clicks) ==================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  console.log(`🔘 Button clicked: ${data} by user ${chatId}`);

  try {
    // Check authorization
    if (!AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
      await bot.answerCallbackQuery(query.id, { text: "❌ Not authorized" });
      return;
    }

    // Handle cancellation first (doesn't require active state)
    if (data === "action_cancel") {
      // Set per-user cancellation flag
      userCancellations[chatId] = {
        cancelled: true,
        cancelledAt: new Date(),
      };

      // Cancel everything for this user - no details, just stop
      delete userStates[chatId];
      delete userSelections[chatId];

      // Cancel jobs in queue for this user
      jobQueue = jobQueue.filter((job) => job.chatId !== chatId);

      // Cancel current processing if it's this user's job
      if (
        processingState.isProcessing &&
        processingState.currentChatId === chatId
      ) {
        processingState.isProcessing = false;
        processingState.currentJob = null;
        processingState.currentChatId = null;
      }

      // Answer callback query first to provide immediate feedback
      await bot.answerCallbackQuery(query.id, { text: "✅ Cancelled" });

      // Try to edit the message, but don't fail if it's not possible
      try {
        if (query.message && query.message.text) {
          await bot.editMessageText(
            query.message.chat.id,
            query.message.message_id,
            "✅ Cancelled.",
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🚀 START NEW JOB", callback_data: "start_new" }],
                ],
              },
            },
          );
        } else {
          // If message has no text, send a new message instead
          await bot.sendMessage(chatId, "✅ Cancelled.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 START NEW JOB", callback_data: "start_new" }],
              ],
            },
          });
        }
      } catch (error) {
        // If edit fails, send a new message as fallback
        console.log("Edit message error:", error.message);
        try {
          await bot.sendMessage(chatId, "✅ Cancelled.", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 START NEW JOB", callback_data: "start_new" }],
              ],
            },
          });
        } catch (sendError) {
          console.log("Send message error:", sendError.message);
        }
      }
      return;
    }

    // Handle start new job (can be called from completion screen or anytime)
    if (data === "start_new") {
      await bot.answerCallbackQuery(query.id, {
        text: "🚀 Starting new job...",
      });

      // Clear any old cancellation flags for this user
      if (userCancellations[chatId]) {
        delete userCancellations[chatId];
      }

      // Only block if THIS specific user already has an active state
      if (userStates[chatId]) {
        await bot.sendMessage(
          chatId,
          "⚠️ You already have an active operation. Send /cancel to stop it.",
        );
        return;
      }

      // Start conversation - ask for URL
      userStates[chatId] = { step: "waiting_url" };

      try {
        await bot.sendMessage(
          chatId,
          `📱 Step 1/2: Send Tweet URL\n\nPlease paste the Twitter/X tweet URL you want to process.\n\nExample: https://x.com/elonmusk/status/123456\n\nSend /cancel to stop.`,
        );
      } catch (error) {
        console.error("❌ Error sending start message:", error.message);
      }
      return;
    }

    // Check if user is in action selection state
    if (!userStates[chatId] || userStates[chatId].step !== "waiting_actions") {
      await bot.answerCallbackQuery(query.id, {
        text: "❌ Invalid operation - please start over with /tweet",
      });
      return;
    }

    const state = userStates[chatId];

    // Initialize selection array if needed
    if (!userSelections[chatId]) {
      userSelections[chatId] = [];
    }

    let toastMessage = null;

    // Handle toggle actions
    if (data.startsWith("toggle_")) {
      const action = data.replace("toggle_", "");
      const actionIcons = {
        like: "❤️",
        bookmark: "🔖",
        quote: "✍️",
        retweet: "🔁",
      };

      // Toggle the action
      const actionIndex = userSelections[chatId].indexOf(action);
      if (actionIndex > -1) {
        // Remove action (deselect)
        userSelections[chatId].splice(actionIndex, 1);
        toastMessage = `${actionIcons[action]} Deselected ${action}`;
        console.log(`❌ Deselected: ${action}`);
      } else {
        // Add action (select)
        userSelections[chatId].push(action);
        toastMessage = `${actionIcons[action]} Selected ${action}`;
        console.log(`✅ Selected: ${action}`);
      }
    }
    // Handle preset selection buttons - SMART selection logic
    else if (data === "select_like_bookmark") {
      const added = [];
      // Always add both (intelligent addition - no duplicates)
      if (!userSelections[chatId].includes("like")) {
        userSelections[chatId].push("like");
        added.push("❤️ Like");
      }
      if (!userSelections[chatId].includes("bookmark")) {
        userSelections[chatId].push("bookmark");
        added.push("🔖 Bookmark");
      }

      if (added.length > 0) {
        toastMessage = `✅ Added: ${added.join(" + ")}`;
      } else {
        toastMessage = `ℹ️ Already selected: ❤️ Like + 🔖 Bookmark`;
      }
      console.log(`✅ Selected preset: like + bookmark`);
    } else if (data === "select_quote_retweet") {
      const added = [];
      // Always add both (intelligent addition - no duplicates)
      if (!userSelections[chatId].includes("quote")) {
        userSelections[chatId].push("quote");
        added.push("✍️ Quote");
      }
      if (!userSelections[chatId].includes("retweet")) {
        userSelections[chatId].push("retweet");
        added.push("🔁 Retweet");
      }

      if (added.length > 0) {
        toastMessage = `✅ Added: ${added.join(" + ")}`;
      } else {
        toastMessage = `ℹ️ Already selected: ✍️ Quote + 🔁 Retweet`;
      }
      console.log(`✅ Selected preset: quote + retweet`);
    } else if (data === "select_all") {
      // Add all missing actions (smart - no duplicates)
      const added = [];
      ["like", "bookmark", "quote", "retweet"].forEach((action) => {
        if (!userSelections[chatId].includes(action)) {
          userSelections[chatId].push(action);
          const icons = {
            like: "❤️",
            bookmark: "🔖",
            quote: "✍️",
            retweet: "🔁",
          };
          added.push(`${icons[action]} ${action}`);
        }
      });

      if (added.length > 0) {
        toastMessage = `🎯 Selected All: ${added.join(", ")}`;
      } else {
        toastMessage = `ℹ️ All actions already selected`;
      }
      console.log(`✅ Selected all actions`);
    } else if (data === "clear_all") {
      userSelections[chatId] = [];
      toastMessage = `🧹 Cleared all selections`;
      console.log(`🧹 Cleared all selections`);
    }
    // Handle start processing
    else if (data === "start_processing") {
      const selectedActions = userSelections[chatId] || [];

      if (selectedActions.length === 0) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Please select at least one action",
        });
        return;
      }

      // Check if state has URL (safety check)
      if (!state || !state.url) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ URL not found - please start over",
        });
        delete userStates[chatId];
        delete userSelections[chatId];
        return;
      }

      // Clear user state and start processing
      delete userStates[chatId];
      delete userSelections[chatId];

      const actionDisplay = selectedActions.join(", ");

      // Check if this will be queued or processed immediately
      // If queue is already processing, this job will be queued
      const willBeQueued = isQueueProcessing;

      const messageText = willBeQueued
        ? `📝 JOB QUEUED!\n\n📱 URL: ${state.url}\n🎯 Actions: ${actionDisplay}\n\n⏳ Your job is queued and will start shortly...`
        : `🚀 JOB STARTING!\n\n📱 URL: ${state.url}\n🎯 Actions: ${actionDisplay}\n\n⏳ Your job is starting now...`;

      try {
        await bot.editMessageText(
          query.message.chat.id,
          query.message.message_id,
          messageText,
        );
      } catch (error) {
        console.log("Edit message error:", error.message);
        await bot.sendMessage(chatId, messageText);
      }

      await bot.answerCallbackQuery(query.id, {
        text: willBeQueued ? "📝 Job queued!" : "🚀 Job starting!",
      });

      // Start processing
      await processJob(state.url, selectedActions, chatId);
      return;
    } else {
      // Unknown callback
      await bot.answerCallbackQuery(query.id, { text: "❌ Unknown action" });
      return;
    }

    // Update the message with current selection state (for all non-start/cancel actions)
    const selectedActions = userSelections[chatId];
    const actionDisplay =
      selectedActions.length > 0 ? selectedActions.join(", ") : "None";

    // Update button texts to show selection state with clean visual feedback
    const likeText = selectedActions.includes("like")
      ? "❤️ ✅ Like"
      : "❤️ Like";
    const bookmarkText = selectedActions.includes("bookmark")
      ? "🔖 ✅ Bookmark"
      : "🔖 Bookmark";
    const quoteText = selectedActions.includes("quote")
      ? "✍️ ✅ Quote"
      : "✍️ Quote";
    const retweetText = selectedActions.includes("retweet")
      ? "🔁 ✅ Retweet"
      : "🔁 Retweet";

    // Edit the existing message with updated selections and buttons
    try {
      await bot.editMessageText(
        `✅ URL Received!\n\n🔗 ${state.url}\n\nClick buttons to toggle selection:\n\n📱 Selected: ${actionDisplay}`,
        {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: {
            inline_keyboard: [
              [
                { text: likeText, callback_data: "toggle_like" },
                { text: bookmarkText, callback_data: "toggle_bookmark" },
              ],
              [
                { text: quoteText, callback_data: "toggle_quote" },
                { text: retweetText, callback_data: "toggle_retweet" },
              ],
              [
                {
                  text: "❤️🔖 Like + Bookmark",
                  callback_data: "select_like_bookmark",
                },
              ],
              [
                {
                  text: "✍️🔁 Quote + Retweet",
                  callback_data: "select_quote_retweet",
                },
              ],
              [{ text: "🎯 ALL", callback_data: "select_all" }],
              [{ text: "🧹 Clear All", callback_data: "clear_all" }],
              [{ text: "🚀 START", callback_data: "start_processing" }],
              [{ text: "❌ Cancel", callback_data: "action_cancel" }],
            ],
          },
        },
      );
      console.log(
        `✅ Message updated successfully with selections: ${actionDisplay}`,
      );
    } catch (error) {
      console.error(`❌ Edit message error: ${error.message}`);
      console.error(`Full error:`, error);
    }

    // Show toast notification for immediate feedback
    await bot.answerCallbackQuery(query.id, {
      text: toastMessage || "✅ Updated",
    });
  } catch (error) {
    console.error(`❌ Callback query error: ${error.message}`);
    try {
      await bot.answerCallbackQuery(query.id, { text: "❌ Error occurred" });
    } catch (answerError) {
      console.log("Could not answer callback query:", answerError.message);
    }
  }
});

// ================== ERROR HANDLING ==================
bot.on("polling_error", (error) => {
  console.log(`[Telegram Polling Error]: ${error.code} - ${error.message}`);
});

// ================== STARTUP ==================
console.log("🤖 Telegram Twitter Bot Started");
console.log("📡 Waiting for commands...");
console.log("👤 Authorized Chat IDs:", AUTHORIZED_CHAT_IDS.join(", "));
console.log("👥 Available Accounts:", ACCOUNT_NAMES.length);
console.log("🎯 Interactive Mode: Button-based selection");
console.log("\n✨ Bot is ready! Send /start in Telegram to begin");
