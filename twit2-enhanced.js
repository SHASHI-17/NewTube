import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const PROFILE_URL = "https://x.com/hit_tl1"; // Change to the desired profile URL to process tweets from
const STOP_AT_TWEET_URL = "https://x.com/hit_tl1/status/2069699897566077111";
// Example: "https://x.com/username/status/123456789" - will process tweets ABOVE this one and stop when reaching it
// Set to null to process all tweets on the profile

const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

// Multiple accounts configuration
const ACCOUNT_NAMES = [
  // "adore",
  // "orange",
  // "bluemoon",
  // "kiran",
  "hibye",
  // "inyvix",
  // "bae",
  // "anchinka",
  // "meera",
  // "ivy",
  // "ixyi",
  // "water1",
  // "water2",
  // "water3",
  // "fire1",
  // "fire2",
  // "fire3",
  // "ivy",
];
const REGISTER_MODE = false; // Set to true to register accounts, false to perform actions
const HEADLESS = false;

// ================== ACTION CONFIG ==================
// ⚠️ SET THESE TO true/false BEFORE RUNNING ⚠️
const DO_LIKE = true; // Like tweets while scrolling
const DO_BOOKMARK = false; // Bookmark tweets while scrolling
const DO_RETWEET = false; // Retweet tweets while scrolling
const DO_COMMENT = false; // Comment on tweets while scrolling
const SLEEP_MS = 600; // Base delay between actions (milliseconds) - optimized for speed
const ACCOUNT_STAGGER = 4000; // Stagger delay between accounts (ms)
const MAX_TWEETS = null; // null = unlimited, or set a number like 50 to stop after that many tweets
const SCROLL_PAUSE_MS = 1800; // Pause between scrolls - optimized for reliable loading
const TWEETS_BEFORE_VERIFY = null; // Disabled - no verification, just keep scrolling
const SCROLL_PERCENTAGE = 0.4; // Scroll by 40% of viewport height to be safer and not miss tweets
const STOP_AT_TWEET_ID = null; // Extract tweet ID from URL, or set to null for no limit

// ================== SKIP DETECTION CONFIG ==================
const CHUNK_SIZE = 3; // Process tweets in small chunks to avoid DOM staleness
const OVERLAP_SIZE = 2; // Overlap between chunks to catch missed tweets
const PRESENCE_CHECK = true; // Verify tweet is still in DOM before processing
const SKIP_REPORT_DIR = "./skip-reports"; // Directory for skip reports
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

// Add account-specific offset to avoid synchronized actions
function getAccountOffset(accountIndex) {
  // Each account gets a unique timing offset (0-2000ms)
  return (accountIndex * 977) % 2000;
}

// ✅ Random quotes
const QUOTES = [
  "This hit different.",
  "Real love will feel so peaceful after this.",
  "The right person will make all this make sense.",
  "Healing era activated.",
  "Sometimes the wrong person teaches the best lessons.",
  "Your future self is smiling at you right now.",
  "The right love won't drain you.",
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

// Ensure base folder
if (!fs.existsSync(BASE_USER_DATA_DIR))
  fs.mkdirSync(BASE_USER_DATA_DIR, { recursive: true });

// Ensure skip reports directory exists
if (!fs.existsSync(SKIP_REPORT_DIR))
  fs.mkdirSync(SKIP_REPORT_DIR, { recursive: true });

// Get profile directory
function getProfileDir(name) {
  const dir = path.join(BASE_USER_DATA_DIR, `Account_${name}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Clear Chrome session files to prevent tab restore
function clearChromeSession(profileDir) {
  try {
    const sessionFiles = [
      path.join(profileDir, "Default", "Session"),
      path.join(profileDir, "Default", "Session Storage"),
      path.join(profileDir, "Default", "Current Session"),
      path.join(profileDir, "Default", "Current Tabs"),
      path.join(profileDir, "Default", "Last Session"),
      path.join(profileDir, "Default", "Last Tabs"),
      path.join(profileDir, "Default", "Preferences"),
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

// ================== SKIP TRACKING SYSTEM ==================
class SkipTracker {
  constructor(accountName) {
    this.accountName = accountName;
    this.allSeenTweetIds = new Set(); // All tweets we've ever encountered
    this.processedTweetIds = new Set(); // Tweets successfully processed
    this.skippedTweets = []; // Detailed info about skipped tweets
    this.missedTweets = []; // Tweets that disappeared before processing
    this.processingOrder = []; // Order in which we saw tweets
    this.chunkBoundaries = []; // Track where each chunk started/ended
  }

  // Record a tweet we've seen
  recordTweet(tweetId, tweetUrl) {
    if (!this.allSeenTweetIds.has(tweetId)) {
      this.allSeenTweetIds.add(tweetId);
      this.processingOrder.push({
        id: tweetId,
        url: tweetUrl,
        timestamp: Date.now(),
      });
    }
  }

  // Mark a tweet as successfully processed
  markProcessed(tweetId, tweetUrl) {
    this.processedTweetIds.add(tweetId);
  }

  // Record a tweet that was skipped (we saw it but didn't process)
  recordSkipped(tweetId, tweetUrl, reason) {
    if (!this.processedTweetIds.has(tweetId)) {
      this.skippedTweets.push({
        tweetId,
        tweetUrl,
        reason,
        timestamp: new Date().toISOString(),
        account: this.accountName,
      });
    }
  }

  // Record a tweet that disappeared from DOM before we could process it
  recordMissed(tweetId, tweetUrl, context) {
    if (
      !this.processedTweetIds.has(tweetId) &&
      !this.missedTweets.find((m) => m.tweetId === tweetId)
    ) {
      this.missedTweets.push({
        tweetId,
        tweetUrl,
        context: context || "Tweet disappeared from DOM during processing",
        timestamp: new Date().toISOString(),
        account: this.accountName,
      });
    }
  }

  // Analyze gaps in processing to find potential skips
  analyzeGaps() {
    const gaps = [];
    const seenArray = Array.from(this.allSeenTweetIds);
    const processedArray = Array.from(this.processedTweetIds);

    // Find tweets we saw but never processed
    for (const tweetId of seenArray) {
      if (!this.processedTweetIds.has(tweetId)) {
        const tweetInfo = this.processingOrder.find((t) => t.id === tweetId);
        gaps.push({
          tweetId,
          tweetUrl: tweetInfo?.url || tweetId,
          reason: "Seen but not processed",
          firstSeen: tweetInfo?.timestamp,
        });
      }
    }

    return gaps;
  }

  // Generate comprehensive report
  generateReport() {
    const gaps = this.analyzeGaps();

    return {
      account: this.accountName,
      summary: {
        totalTweetsSeen: this.allSeenTweetIds.size,
        tweetsProcessed: this.processedTweetIds.size,
        tweetsSkipped: this.skippedTweets.length,
        tweetsMissed: this.missedTweets.length,
        gapsDetected: gaps.length,
        completionRate:
          this.allSeenTweetIds.size > 0
            ? (
                (this.processedTweetIds.size / this.allSeenTweetIds.size) *
                100
              ).toFixed(2) + "%"
            : "0%",
      },
      skippedTweets: this.skippedTweets,
      missedTweets: this.missedTweets,
      gaps: gaps,
      processingOrder: this.processingOrder.map((t) => ({
        id: t.id,
        url: t.url,
        processed: this.processedTweetIds.has(t.id),
      })),
    };
  }

  // Save report to file
  async saveReport(reportDir = SKIP_REPORT_DIR) {
    try {
      const report = this.generateReport();
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .split("T")[0];
      const filename = path.join(
        reportDir,
        `${this.accountName}-skip-report-${timestamp}.json`,
      );

      fs.writeFileSync(filename, JSON.stringify(report, null, 2));
      console.log(`\n📊 Skip report saved to: ${filename}`);

      // Also save a readable text version
      const textReport = this.generateTextReport(report);
      const textFilename = filename.replace(".json", ".txt");
      fs.writeFileSync(textFilename, textReport);
      console.log(`📄 Readable report saved to: ${textFilename}`);

      return filename;
    } catch (error) {
      console.error(`❌ Failed to save skip report: ${error.message}`);
      return null;
    }
  }

  // Generate human-readable text report
  generateTextReport(report) {
    let text = "=".repeat(80) + "\n";
    text += "TWEET PROCESSING SKIP REPORT\n";
    text += `Account: ${this.accountName}\n`;
    text += "=".repeat(80) + "\n\n";

    text += "SUMMARY\n";
    text += "-".repeat(40) + "\n";
    text += `Total Tweets Seen:        ${report.summary.totalTweetsSeen}\n`;
    text += `Tweets Successfully Processed: ${report.summary.tweetsProcessed}\n`;
    text += `Tweets Skipped:            ${report.summary.tweetsSkipped}\n`;
    text += `Tweets Missed (DOM loss):  ${report.summary.tweetsMissed}\n`;
    text += `Gaps Detected:            ${report.summary.gapsDetected}\n`;
    text += `Completion Rate:           ${report.summary.completionRate}\n\n`;

    if (report.skippedTweets.length > 0) {
      text += "SKIPPED TWEETS (Seen but not processed)\n";
      text += "-".repeat(40) + "\n";
      report.skippedTweets.forEach((skip, i) => {
        text += `${i + 1}. ${skip.tweetUrl}\n`;
        text += `   Reason: ${skip.reason}\n`;
        text += `   Time: ${skip.timestamp}\n\n`;
      });
    }

    if (report.missedTweets.length > 0) {
      text += "MISSED TWEETS (Disappeared from DOM)\n";
      text += "-".repeat(40) + "\n";
      report.missedTweets.forEach((miss, i) => {
        text += `${i + 1}. ${miss.tweetUrl}\n`;
        text += `   Context: ${miss.context}\n`;
        text += `   Time: ${miss.timestamp}\n\n`;
      });
    }

    if (report.gaps.length > 0) {
      text += "GAPS ANALYSIS (Seen but not processed)\n";
      text += "-".repeat(40) + "\n";
      report.gaps.forEach((gap, i) => {
        text += `${i + 1}. ${gap.tweetUrl}\n`;
        text += `   Reason: ${gap.reason}\n`;
        if (gap.firstSeen) {
          text += `   First seen: ${new Date(gap.firstSeen).toISOString()}\n`;
        }
        text += "\n";
      });
    }

    if (
      report.skippedTweets.length === 0 &&
      report.missedTweets.length === 0 &&
      report.gaps.length === 0
    ) {
      text += "✅ NO TWEETS WERE SKIPPED! All seen tweets were processed.\n\n";
    }

    text += "=".repeat(80) + "\n";
    text += "ACTION ITEMS\n";
    text += "=".repeat(80) + "\n";
    text += "The following tweet links can be processed manually:\n\n";

    const allSkipped = [
      ...report.skippedTweets,
      ...report.missedTweets,
      ...report.gaps,
    ];
    const uniqueSkipped = new Map();
    allSkipped.forEach((item) => {
      if (!uniqueSkipped.has(item.tweetId)) {
        uniqueSkipped.set(item.tweetId, item.tweetUrl || item.tweetId);
      }
    });

    if (uniqueSkipped.size > 0) {
      Array.from(uniqueSkipped.values()).forEach((url, i) => {
        text += `${i + 1}. ${url}\n`;
      });
    } else {
      text += "None - all tweets were processed successfully!\n";
    }

    text += "\n" + "=".repeat(80) + "\n";

    return text;
  }

  // Real-time logging of skips
  logSkip(tweetId, tweetUrl, reason) {
    console.log(`⚠️ SKIP DETECTED: ${tweetUrl}`);
    console.log(`   Reason: ${reason}`);
    this.recordSkipped(tweetId, tweetUrl, reason);
  }

  logMissed(tweetId, tweetUrl, context) {
    console.log(`❌ MISSED TWEET: ${tweetUrl}`);
    console.log(`   Context: ${context}`);
    this.recordMissed(tweetId, tweetUrl, context);
  }
}

// ================== ENHANCED ACTION LOGIC ==================
async function processProfile(
  profileDir,
  profileName,
  accountIndex,
  batchSlot = 0,
) {
  // Initialize skip tracker for this account
  const skipTracker = new SkipTracker(profileName);

  // Clear Chrome session files BEFORE launching to prevent tab restore
  clearChromeSession(profileDir);

  // Get consistent fingerprint for this account
  const fingerprint = getAccountFingerprint(accountIndex);

  // Calculate window position for 2 windows side by side (50% width, full height)
  // Slot 0: left, Slot 1: right
  const WINDOW_WIDTH = 960; // 50% of 1920 screen width
  const WINDOW_HEIGHT = 1080; // Full screen height
  const posX = batchSlot * WINDOW_WIDTH; // 0 for left, 960 for right
  const posY = 0; // Full height from top

  console.log(`\n🚀 Launching Chrome for: ${profileName}`);
  console.log(`   ├─ UA: ${fingerprint.userAgent.substring(0, 50)}...`);
  console.log(
    `   └─ Window: ${WINDOW_WIDTH}x${WINDOW_HEIGHT} at [${posX}, ${posY}] (${batchSlot === 0 ? "Left" : "Right"})`,
  );

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

    // Give time to change settings before going to profile
    console.log(
      `⏳ You have 10 seconds to change settings before navigating to profile...`,
    );
    await sleep(10000); // 10 seconds to change settings before profile navigation

    // Navigate to profile
    console.log(`📍 Navigating to profile: ${PROFILE_URL}`);
    try {
      await page.goto(PROFILE_URL, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
    } catch (err) {
      console.log(`⚠️ Navigation timeout, but continuing...`);
    }

    // Wait a bit for page to fully load
    await sleep(2000);

    // Verify page loaded successfully
    const tweetsOnScreen = await page.$$('[data-testid="tweet"]');
    console.log(`📱 Found ${tweetsOnScreen.length} tweets on initial load`);

    if (tweetsOnScreen.length === 0) {
      console.log(
        `⚠️ No tweets found on initial load. Waiting and retrying...`,
      );
      await sleep(3000);
      const retryTweets = await page.$$('[data-testid="tweet"]');
      console.log(`📱 Retry found ${retryTweets.length} tweets`);
    }

    // Scroll to top to ensure we start fresh
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    await sleep(1000);

    console.log(
      `\n🎯 Starting ENHANCED MODE - With comprehensive skip detection...`,
    );
    console.log(`📍 Target Profile: ${PROFILE_URL}`);
    console.log(
      `⚙️ Actions enabled: ${DO_LIKE ? "✅ Like" : "❌ Like"}, ${DO_RETWEET ? "✅ Retweet" : "❌ Retweet"}, ${DO_BOOKMARK ? "✅ Bookmark" : "❌ Bookmark"}, ${DO_COMMENT ? "✅ Comment" : "❌ Comment"}`,
    );

    // Extract stop tweet ID if URL provided
    let stopAtTweetId = STOP_AT_TWEET_ID;
    if (STOP_AT_TWEET_URL && !stopAtTweetId) {
      const match = STOP_AT_TWEET_URL.match(/status\/(\d+)/);
      if (match) {
        stopAtTweetId = match[1];
        console.log(`🛑 Will stop when reaching tweet: ${stopAtTweetId}`);
      }
    }

    if (MAX_TWEETS) {
      console.log(`📊 Will process max ${MAX_TWEETS} tweets`);
    } else {
      console.log(`♾️ Unlimited mode - will continue until manually stopped`);
    }

    if (stopAtTweetId) {
      console.log(`📍 Stop marker set: Will stop at tweet ${stopAtTweetId}`);
    }

    let processedTweets = 0;
    let lastHeight = 0;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 50; // Increased patience - don't give up easily on large timelines

    while (true) {
      // Check if we've reached max tweets (if set)
      if (MAX_TWEETS && processedTweets >= MAX_TWEETS) {
        console.log(`\n🎉 Reached maximum tweet limit: ${MAX_TWEETS}`);
        break;
      }

      // Find all tweet elements on current page
      const tweets = await page.$$('[data-testid="tweet"]');
      const currentTweetCount = tweets.length;
      console.log(`📜 Found ${currentTweetCount} tweets on current screen`);

      // Process tweets in CHUNKS to avoid DOM staleness
      for (
        let chunkStart = 0;
        chunkStart < currentTweetCount;
        chunkStart += CHUNK_SIZE
      ) {
        if (MAX_TWEETS && processedTweets >= MAX_TWEETS) break;

        // RE-FRESH DOM for each chunk to ensure we have current elements
        const freshTweets = await page.$$('[data-testid="tweet"]');
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, freshTweets.length);

        console.log(
          `   🔄 Chunk ${Math.floor(chunkStart / CHUNK_SIZE) + 1}: Processing tweets ${chunkStart + 1}-${chunkEnd}`,
        );

        for (let i = chunkStart; i < chunkEnd; i++) {
          if (MAX_TWEETS && processedTweets >= MAX_TWEETS) break;

          try {
            const tweet = freshTweets[i];
            if (!tweet) {
              console.log(`   ⚠️ Tweet ${i} became null (removed from DOM)`);
              continue;
            }

            // Get tweet ID to check if already processed
            const tweetInfo = await page.evaluate((el) => {
              const link = el.querySelector('a[href*="/status/"]');
              return link ? link.getAttribute("href") : null;
            }, tweet);

            if (!tweetInfo) {
              skipTracker.logSkip(
                "unknown",
                "N/A",
                "No tweet ID found in element",
              );
              continue;
            }

            // Ensure we have full URL
            const fullTweetUrl = tweetInfo.startsWith("http")
              ? tweetInfo
              : `https://x.com${tweetInfo}`;

            // Record that we've seen this tweet
            skipTracker.recordTweet(fullTweetUrl, fullTweetUrl);

            if (skipTracker.processedTweetIds.has(fullTweetUrl)) {
              console.log(`   ⏭️ Already processed: ${fullTweetUrl}`);
              continue;
            }

            // PRESENCE CHECK: Verify tweet is still in DOM
            if (PRESENCE_CHECK) {
              const isStillInDOM = await page.evaluate((el) => {
                return document.body.contains(el);
              }, tweet);

              if (!isStillInDOM) {
                skipTracker.logMissed(
                  fullTweetUrl,
                  fullTweetUrl,
                  "Tweet removed from DOM during chunk processing",
                );
                console.log(
                  `   ❌ Tweet disappeared from DOM: ${fullTweetUrl}`,
                );
                continue;
              }
            }

            // Check if we've reached the stop tweet
            if (stopAtTweetId && fullTweetUrl.includes(stopAtTweetId)) {
              console.log(`\n🛑 Reached stop marker tweet: ${fullTweetUrl}`);
              console.log(
                `✅ Processing complete! Stopped at designated tweet.`,
              );
              console.log(`📊 Total tweets processed: ${processedTweets}`);

              // Generate and save final report
              await skipTracker.saveReport();

              return {
                name: profileName,
                success: true,
                tweetsProcessed: processedTweets,
                stoppedAt: stopAtTweetId,
                skipReport: skipTracker.generateReport(),
              };
            }

            // Only show detailed log every 20 tweets
            if (processedTweets % 20 === 0) {
              console.log(
                `\n🎯 Processing tweet ${processedTweets + 1}: ${fullTweetUrl}`,
              );
            } else {
              console.log(`   ❤️ Processing: ${fullTweetUrl}`);
            }

            // Scroll tweet into view (but don't click/open it)
            await page.evaluate((el) => {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, tweet);
            await sleepWithJitter(200, accountIndex); // Reduced delay for speed

            // Additional presence check after scrolling
            if (PRESENCE_CHECK) {
              const isStillInDOM = await page.evaluate((el) => {
                return document.body.contains(el);
              }, tweet);

              if (!isStillInDOM) {
                skipTracker.logMissed(
                  fullTweetUrl,
                  fullTweetUrl,
                  "Tweet disappeared after scrolling into view",
                );
                console.log(
                  `   ❌ Tweet disappeared after scroll: ${fullTweetUrl}`,
                );
                continue;
              }
            }

            // ❤️ Like (direct from timeline, don't open tweet)
            if (DO_LIKE) {
              try {
                const likeButton = await tweet.$('[data-testid="like"]');
                if (likeButton) {
                  const isLiked = await page.evaluate((el) => {
                    const ariaLabel = el.getAttribute("aria-label");
                    return (
                      ariaLabel?.includes("Unlike") ||
                      ariaLabel?.includes("Liked") ||
                      el.querySelector('svg[g="red"]') !== null
                    );
                  }, likeButton);

                  if (!isLiked) {
                    await likeButton.click();
                    await sleepWithJitter(600, accountIndex); // Optimized delay
                    console.log(`   ❤️ Liked`);
                  } else {
                    console.log(`   ⏭️ Already liked - skipping`);
                  }
                }
              } catch (e) {
                console.log(`   ⚠️ Like error: ${e.message}`);
              }
            }

            // 🔁 Retweet (direct from timeline, don't open tweet)
            if (DO_RETWEET) {
              try {
                const retweetButton = await tweet.$('[data-testid="retweet"]');
                if (retweetButton) {
                  const isRetweeted = await page.evaluate((el) => {
                    const ariaLabel = el.getAttribute("aria-label");
                    return (
                      ariaLabel?.includes("Undo retweet") ||
                      ariaLabel?.includes("Retweeted")
                    );
                  }, retweetButton);

                  if (!isRetweeted) {
                    await retweetButton.click();
                    await sleepWithJitter(300, accountIndex);

                    const menuItems = await page.$$('[role="menuitem"]');
                    if (menuItems.length > 0) {
                      await menuItems[0].click();
                      await sleepWithJitter(700, accountIndex);
                      console.log(`   🔁 Retweeted tweet`);
                    }
                  } else {
                    console.log(`   ⏭️ Already retweeted - skipping`);
                  }
                }
              } catch (e) {
                console.log(`   ⚠️ Retweet error: ${e.message}`);
              }
            }

            // 🔖 Bookmark (direct from timeline, don't open tweet)
            if (DO_BOOKMARK) {
              try {
                const bookmarkButton = await tweet.$(
                  '[data-testid="bookmark"]',
                );
                if (bookmarkButton) {
                  const isBookmarked = await page.evaluate((el) => {
                    const ariaLabel = el.getAttribute("aria-label");
                    return (
                      ariaLabel?.includes("Remove") ||
                      ariaLabel?.includes("Bookmarked")
                    );
                  }, bookmarkButton);

                  if (!isBookmarked) {
                    await bookmarkButton.click();
                    await sleepWithJitter(500, accountIndex);
                    console.log(`   🔖 Bookmarked tweet`);
                  } else {
                    console.log(`   ⏭️ Already bookmarked - skipping`);
                  }
                }
              } catch (e) {
                console.log(`   ⚠️ Bookmark error: ${e.message}`);
              }
            }

            // SUCCESSFULLY PROCESSED - mark as done
            processedTweets++;
            skipTracker.markProcessed(fullTweetUrl, fullTweetUrl);

            // Show progress summary every 20 tweets
            if (processedTweets % 20 === 0) {
              console.log(
                `📊 Progress: ${processedTweets}${MAX_TWEETS ? "/" + MAX_TWEETS : ""} tweets processed | 💪 Still working...`,
              );
            }

            // Small delay between tweets to appear more natural
            await sleepWithJitter(SLEEP_MS, accountIndex);
          } catch (e) {
            console.log(`   ⚠️ Error processing tweet: ${e.message}`);
            // Try to get tweet info for error logging
            try {
              const errorTweetInfo = await page.evaluate((el) => {
                const link = el.querySelector('a[href*="/status/"]');
                if (!link) return "unknown";
                const href = link.getAttribute("href");
                return href.startsWith("http") ? href : `https://x.com${href}`;
              }, freshTweets[i]);
              skipTracker.logMissed(
                errorTweetInfo,
                errorTweetInfo,
                `Processing error: ${e.message}`,
              );
            } catch {
              skipTracker.logMissed(
                `index-${i}`,
                "N/A",
                `Processing error: ${e.message}`,
              );
            }
          }
        }

        // Small delay between chunks to let DOM stabilize
        await sleep(400);
      }

      // Smooth scroll down using percentage of viewport to avoid missing edge tweets
      console.log(
        `\n⬇️ Scrolling down (${Math.round(SCROLL_PERCENTAGE * 100)}% of viewport) to load more tweets...`,
      );

      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const scrollDistance = Math.floor(viewportHeight * SCROLL_PERCENTAGE);

      // Do multiple small scrolls to ensure Twitter's lazy loading triggers properly
      const scrollSteps = 3;
      const stepDistance = Math.floor(scrollDistance / scrollSteps);
      for (let step = 0; step < scrollSteps; step++) {
        await page.evaluate((distance) => {
          window.scrollBy({ top: distance, behavior: "smooth" });
        }, stepDistance);
        await sleep(400); // Wait between scroll steps
      }

      // Wait for content to load - Twitter needs time to fetch tweets
      console.log(`⏳ Waiting for content to load...`);
      const accountOffset = getAccountOffset(accountIndex);
      await sleepWithJitter(SCROLL_PAUSE_MS + accountOffset, accountIndex);

      // Check current scroll position vs total page height
      const scrollInfo = await page.evaluate(() => {
        return {
          scrollTop: window.scrollY,
          scrollHeight: document.body.scrollHeight,
          clientHeight: window.innerHeight,
        };
      });

      const newHeight = scrollInfo.scrollHeight;
      const currentScroll = scrollInfo.scrollTop;
      const maxScroll = newHeight - scrollInfo.clientHeight;

      console.log(
        `📏 Scroll: ${currentScroll}px / ${maxScroll}px (Total: ${newHeight}px)`,
      );

      // Check if we've reached the end or no new content
      if (newHeight === lastHeight) {
        scrollAttempts++;
        console.log(
          `🔄 No new content loaded (attempt ${scrollAttempts}/${MAX_SCROLL_ATTEMPTS})`,
        );

        if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
          console.log(
            `\n🏁 Max scroll attempts reached. This might be the end or a glitch.`,
          );
          console.log(
            `📍 Current position: ${currentScroll}px, Total page: ${newHeight}px`,
          );
          console.log(
            `🎯 If target tweet not found, try running again - Twitter might have glitched.`,
          );

          // One final check - try to scroll to absolute bottom
          console.log(`🔍 Final check - scrolling to absolute bottom...`);
          await page.evaluate(() => {
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
          });
          await sleep(3000);

          const finalTweets = await page.$$('[data-testid="tweet"]');
          console.log(`🔍 Final check found ${finalTweets.length} tweets`);

          // Check if our target is in the final set
          if (stopAtTweetId) {
            let foundTarget = false;
            for (const tweet of finalTweets) {
              try {
                const tweetId = await page.evaluate((el) => {
                  const link = el.querySelector('a[href*="/status/"]');
                  return link ? link.getAttribute("href") : null;
                }, tweet);
                if (tweetId && tweetId.includes(stopAtTweetId)) {
                  foundTarget = true;
                  console.log(`✅ Found target tweet in final check!`);
                  break;
                }
              } catch {}
            }
            if (!foundTarget) {
              console.log(
                `⚠️ Target tweet not found. Timeline might be too large or Twitter glitched.`,
              );
              console.log(
                `💡 Recommendation: Try running the script again - it should continue from where it left off.`,
              );
            }
          }

          break;
        }
      } else {
        scrollAttempts = 0; // Reset counter if new content loaded
        lastHeight = newHeight;
      }

      // Check if we've scrolled to the bottom
      if (currentScroll >= maxScroll - 100) {
        console.log(`\n🏁 Reached bottom of profile.`);

        // Extra thorough final check for large timelines
        console.log(`🔍 Performing thorough final check...`);
        const additionalAttempts = 8; // Increased for thoroughness

        for (let j = 0; j < additionalAttempts; j++) {
          console.log(`🔍 Final attempt ${j + 1}/${additionalAttempts}...`);

          // Multiple aggressive scrolls to trigger any remaining lazy loading
          for (let k = 0; k < 4; k++) {
            await page.evaluate(() => {
              window.scrollBy(0, 400);
            });
            await sleep(600);
          }

          // Wait for content
          await sleep(2000);

          const finalCheck = await page.$$('[data-testid="tweet"]');
          console.log(
            `🔍 Final check ${j + 1}: Found ${finalCheck.length} tweets`,
          );

          if (finalCheck.length > currentTweetCount) {
            console.log(`🎉 Found more tweets! Continuing...`);
            break;
          }

          // Every few attempts, try a different scroll pattern
          if (j % 3 === 2) {
            console.log(`🔄 Trying alternative scroll pattern...`);
            await page.evaluate(() => {
              window.scrollTo({
                top: document.body.scrollHeight - 500,
                behavior: "smooth",
              });
            });
            await sleep(2000);
            await page.evaluate(() => {
              window.scrollBy(0, 1000);
            });
            await sleep(1500);
          }

          // If this is the last attempt and no new tweets found, we're done
          if (
            j === additionalAttempts - 1 &&
            finalCheck.length <= currentTweetCount
          ) {
            console.log(`✅ Thoroughly checked - no more tweets to load.`);

            // Final check for target tweet
            if (stopAtTweetId) {
              let foundTarget = false;
              const allFinalTweets = await page.$$('[data-testid="tweet"]');
              for (const tweet of allFinalTweets) {
                try {
                  const tweetId = await page.evaluate((el) => {
                    const link = el.querySelector('a[href*="/status/"]');
                    return link ? link.getAttribute("href") : null;
                  }, tweet);
                  if (tweetId && tweetId.includes(stopAtTweetId)) {
                    foundTarget = true;
                    console.log(`✅ Found target tweet in final verification!`);
                    break;
                  }
                } catch {}
              }

              if (!foundTarget) {
                console.log(
                  `⚠️ Target tweet not found even after thorough checking.`,
                );
                console.log(
                  `💡 This might be due to Twitter glitch or timeline being too large.`,
                );
                console.log(
                  `💡 Try running the script again - it should continue from current position.`,
                );
              }
            }

            break;
          }
        }
        break;
      }
    }

    console.log(
      `\n🎉 Session complete! Total tweets processed: ${processedTweets}`,
    );

    // Generate and save final skip report
    console.log(`\n📊 Generating final skip report...`);
    const reportPath = await skipTracker.saveReport();
    const finalReport = skipTracker.generateReport();

    console.log(`\n📊 SKIP REPORT SUMMARY for ${profileName}:`);
    console.log(`   Total tweets seen: ${finalReport.summary.totalTweetsSeen}`);
    console.log(`   Tweets processed: ${finalReport.summary.tweetsProcessed}`);
    console.log(`   Tweets missed: ${finalReport.summary.tweetsMissed}`);
    console.log(`   Completion rate: ${finalReport.summary.completionRate}`);

    if (finalReport.summary.tweetsMissed > 0) {
      console.log(
        `\n⚠️ ACTION REQUIRED: Check skip report for missed tweet links!`,
      );
    } else {
      console.log(`\n✅ PERFECT! No tweets were missed!`);
    }

    return {
      name: profileName,
      success: true,
      tweetsProcessed: processedTweets,
      skipReport: finalReport,
      skipReportPath: reportPath,
    };
  } catch (err) {
    console.error(`🔥 Error with ${profileName}:`, err.message);
    return { name: profileName, success: false, reason: err.message };
  } finally {
    try {
      console.log(`\n🔧 Closing browser...`);
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
    // Parallel execution for action mode (2 at a time side by side)
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

          // Add staggered delay for second account to avoid conflicts
          if (batchIndex === 1) {
            console.log(
              `⏳ Staggering ${name} by 3 seconds to avoid conflicts...`,
            );
            await sleep(3000);
          }

          // batchSlot determines position: 0=left, 1=right
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
    if (r.success) {
      console.log(
        `✅ ${r.name} (${r.mode}) — Success${r.tweetsProcessed ? ` - ${r.tweetsProcessed} tweets processed` : ""}`,
      );
      if (r.skipReport) {
        console.log(
          `   📊 Completion rate: ${r.skipReport.summary.completionRate}`,
        );
        console.log(`   📁 Report: ${r.skipReportPath}`);
      }
    } else {
      console.log(`⚠️ ${r.name} (${r.mode}) — Failed: ${r.reason || ""}`);
    }
  }
  console.log("=============================================\n");
})();
