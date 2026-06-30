import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";
import axios from "axios";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const PROFILE_URL = "https://x.com/adohebe"; // Change to the desired profile URL
const STOP_AT_TWEET_URL =
  "https://x.com/adohebe/status/2071278553103061349?s=46";
// Will process replies ABOVE this one and stop when reaching it
// Set to null to process all replies

const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

// Single account configuration
const ACCOUNT_NAME = "meera"; // Only using ONE account

const HEADLESS = false;

// ================== TELEGRAM CONFIG ==================
const TELEGRAM_BOT_TOKEN = "8857592188:AAGxyx4V6t6fJQ9C--Fq4fBZBKIbbCimeLU";
const TELEGRAM_CHAT_IDS = ["1991164194", "1956483216"];
const SEND_TO_TELEGRAM = true;

// ================== ACTION CONFIG ==================
const DO_RETWEET = true; // Retweet qualifying replies
const SLEEP_MS = 800; // Base delay between actions
const MAX_REPLIES = null; // null = unlimited, or set a number
const SCROLL_PAUSE_MS = 2000; // Pause between scrolls
const SCROLL_PERCENTAGE = 0.4; // Scroll by 40% of viewport height
const STOP_AT_TWEET_ID = null; // Extract tweet ID from URL, or set to null

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ================== ANTI-DETECTION CONFIG ==================
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

// Random selection for single account
function getRandomFingerprint() {
  const uaIndex = Math.floor(Math.random() * USER_AGENTS.length);
  const vpIndex = Math.floor(Math.random() * VIEWPORT_SIZES.length);
  return {
    userAgent: USER_AGENTS[uaIndex],
    viewport: VIEWPORT_SIZES[vpIndex],
  };
}

// Sleep with random jitter (±20%)
function sleepWithJitter(ms) {
  const jitter = (Math.random() * 40 - 20) / 100; // -20% to +20%
  const actualMs = Math.floor(ms * (1 + jitter));
  return sleep(actualMs);
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

// ================== TELEGRAM FUNCTION ==================
async function sendToTelegram(message) {
  if (
    !SEND_TO_TELEGRAM ||
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHAT_IDS ||
    TELEGRAM_CHAT_IDS.length === 0
  ) {
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    for (const chatId of TELEGRAM_CHAT_IDS) {
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      });
    }
    console.log(
      `✅ Report sent to Telegram to ${TELEGRAM_CHAT_IDS.length} people!`,
    );
  } catch (error) {
    console.error("⚠️ Failed to send to Telegram:", error.message);
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

// Clear Chrome session files
function clearChromeSession(profileDir) {
  try {
    const sessionFiles = [
      path.join(profileDir, "Default", "Session"),
      path.join(profileDir, "Default", "Session Storage"),
      path.join(profileDir, "Default", "Current Session"),
      path.join(profileDir, "Default", "Current Tabs"),
      path.join(profileDir, "Default", "Last Session"),
      path.join(profileDir, "Default", "Last Tabs"),
      // path.join(profileDir, "Default", "Preferences"),
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

// Extract username from profile URL
function extractProfileUsername(profileUrl) {
  const match = profileUrl.match(/x\.com\/([^\/]+)/);
  return match ? match[1] : null;
}

// ================== ACTION LOGIC ==================
async function processProfile(profileDir, profileName) {
  // Clear Chrome session files BEFORE launching
  clearChromeSession(profileDir);

  const fingerprint = getRandomFingerprint();

  // Collection to store retweeted tweet info
  const retweetedTweets = [];
  const skippedTweets = [];

  console.log(`\n🚀 Launching Chrome for: ${profileName}`);
  console.log(`   ├─ UA: ${fingerprint.userAgent.substring(0, 50)}...`);
  console.log(
    `   └─ Window: ${fingerprint.viewport.width}x${fingerprint.viewport.height}`,
  );

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    userDataDir: profileDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--start-maximized",
      "--mute-audio",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    defaultViewport: fingerprint.viewport,
  });

  try {
    // Close extra tabs
    const pages = await browser.pages();
    if (pages.length > 1) {
      console.log(
        `🧹 Closing ${pages.length - 1} extra tabs restored from previous session...`,
      );
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    }

    const page = pages[0];

    await page.setUserAgent(fingerprint.userAgent);

    // Enhanced anti-detection script
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
    await sleepWithJitter(SLEEP_MS);

    if (!(await isLoggedIn(page))) {
      console.log(`⚠️ ${profileName} is NOT logged in.`);
      return { success: false, reason: "Not logged in" };
    }

    console.log(`✅ ${profileName} is logged in — proceeding...`);

    // Extract profile username
    const profileUsername = extractProfileUsername(PROFILE_URL);
    if (!profileUsername) {
      console.log(`⚠️ Could not extract username from profile URL`);
      return { success: false, reason: "Invalid profile URL" };
    }

    console.log(
      `⏳ You have 10 seconds to change settings before navigating to profile...`,
    );
    await sleep(10000);

    // Navigate to profile with replies tab
    const repliesUrl = `${PROFILE_URL}/with_replies`;
    console.log(`📍 Navigating to replies section: ${repliesUrl}`);

    try {
      await page.goto(repliesUrl, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
    } catch (err) {
      console.log(`⚠️ Navigation timeout, but continuing...`);
    }

    await sleep(2000);

    // Verify page loaded
    const tweetsOnScreen = await page.$$('[data-testid="tweet"]');
    console.log(`📱 Found ${tweetsOnScreen.length} tweets on initial load`);

    if (tweetsOnScreen.length === 0) {
      console.log(`⚠️ No tweets found. Waiting and retrying...`);
      await sleep(3000);
      const retryTweets = await page.$$('[data-testid="tweet"]');
      console.log(`📱 Retry found ${retryTweets.length} tweets`);
    }

    // Scroll to top
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    await sleep(1000);

    console.log(`\n🎯 Starting HELPER MODE - Processing replies...`);
    console.log(`⚙️ Target username: @${profileUsername}`);
    console.log(
      `⚙️ Retweet condition: Reply by @${profileUsername} AND no ending full stop`,
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

    if (MAX_REPLIES) {
      console.log(`📊 Will process max ${MAX_REPLIES} replies`);
    } else {
      console.log(`♾️ Unlimited mode`);
    }

    let processedReplies = 0;
    let processedReplyIds = new Set();
    let allSeenReplyIds = new Set();
    let lastHeight = 0;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 50;

    while (true) {
      if (MAX_REPLIES && processedReplies >= MAX_REPLIES) {
        console.log(`\n🎉 Reached maximum reply limit: ${MAX_REPLIES}`);
        break;
      }

      const tweets = await page.$$('[data-testid="tweet"]');
      const currentTweetCount = tweets.length;
      console.log(`📜 Found ${currentTweetCount} replies on current screen`);

      // Process from top to bottom
      for (let i = 0; i < currentTweetCount; i++) {
        if (MAX_REPLIES && processedReplies >= MAX_REPLIES) break;

        try {
          const tweet = tweets[i];

          // Get tweet ID
          const tweetId = await page.evaluate((el) => {
            const link = el.querySelector('a[href*="/status/"]');
            return link ? link.getAttribute("href") : null;
          }, tweet);

          if (!tweetId) {
            continue;
          }

          allSeenReplyIds.add(tweetId);

          if (processedReplyIds.has(tweetId)) {
            continue;
          }

          processedReplyIds.add(tweetId);

          // Check if we've reached the stop tweet
          if (stopAtTweetId && tweetId.includes(stopAtTweetId)) {
            console.log(`\n🛑 Reached stop marker tweet: ${tweetId}`);
            console.log(`✅ Processing complete!`);
            console.log(`📊 Total replies processed: ${processedReplies}`);

            return {
              success: true,
              repliesProcessed: processedReplies,
              retweeted: retweetedTweets.length,
              skipped: skippedTweets.length,
              retweetedTweets,
              skippedTweets,
            };
          }

          if (processedReplies % 10 === 0) {
            console.log(`\n🎯 Processing reply ${processedReplies + 1}`);
          }

          // Scroll tweet into view
          await page.evaluate((el) => {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, tweet);
          await sleepWithJitter(400);

          // Extract reply information
          const replyInfo = await page.evaluate((el) => {
            // Get tweet text
            const textElement = el.querySelector('[data-testid="tweetText"]');
            const tweetText = textElement ? textElement.textContent.trim() : "";

            // Get username from tweet link
            const linkElement = el.querySelector('a[href*="/status/"]');
            let username = null;
            if (linkElement) {
              const href = linkElement.getAttribute("href");
              const match = href.match(/com\/([^\/]+)\/status\//);
              if (match && match[1]) {
                username = match[1];
              }
            }

            return {
              username,
              tweetText,
              endsWithPeriod: tweetText.endsWith("."),
            };
          }, tweet);

          if (!replyInfo.username) {
            continue;
          }

          // LOGIC: Check if reply is by profile owner AND doesn't end with period
          const isByProfileOwner = replyInfo.username === profileUsername;
          const shouldRetweet = isByProfileOwner && !replyInfo.endsWithPeriod;

          if (shouldRetweet && DO_RETWEET) {
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
                  await sleepWithJitter(300);

                  const menuItems = await page.$$('[role="menuitem"]');
                  if (menuItems.length > 0) {
                    await menuItems[0].click();
                    await sleepWithJitter(700);

                    retweetedTweets.push({
                      tweetId,
                      text: replyInfo.tweetText.substring(0, 50) + "...",
                    });

                    console.log(
                      `🔁 Retweeted: @${replyInfo.username} - "${replyInfo.tweetText.substring(0, 40)}..."`,
                    );
                  }
                } else {
                  console.log(`⏭️ Already retweeted`);
                }
              }
            } catch (e) {
              console.log(`⚠️ Retweet error: ${e.message}`);
            }
          } else {
            // Log why we skipped
            if (!isByProfileOwner) {
              console.log(
                `⏭️ Skipped: Not by @${profileUsername} (by @${replyInfo.username})`,
              );
              skippedTweets.push({
                tweetId,
                reason: "not_by_owner",
                text: replyInfo.tweetText.substring(0, 50) + "...",
              });
            } else if (replyInfo.endsWithPeriod) {
              console.log(
                `⏭️ Skipped: Ends with period - "${replyInfo.tweetText.substring(0, 40)}..."`,
              );
              skippedTweets.push({
                tweetId,
                reason: "ends_with_period",
                text: replyInfo.tweetText.substring(0, 50) + "...",
              });
            }
          }

          processedReplies++;

          if (processedReplies % 20 === 0) {
            console.log(
              `📊 Progress: ${processedReplies}${MAX_REPLIES ? "/" + MAX_REPLIES : ""} replies | Retweeted: ${retweetedTweets.length} | Skipped: ${skippedTweets.length}`,
            );
          }

          await sleepWithJitter(SLEEP_MS);
        } catch (e) {
          console.log(`⚠️ Error processing reply: ${e.message}`);
        }
      }

      // Scroll down
      console.log(`\n⬇️ Scrolling down (60% of viewport)...`);

      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const scrollDistance = Math.floor(viewportHeight * SCROLL_PERCENTAGE);

      const scrollSteps = 3;
      const stepDistance = Math.floor(scrollDistance / scrollSteps);
      for (let step = 0; step < scrollSteps; step++) {
        await page.evaluate((distance) => {
          window.scrollBy({ top: distance, behavior: "smooth" });
        }, stepDistance);
        await sleep(500);
      }

      console.log(`⏳ Waiting for content to load...`);
      await sleepWithJitter(SCROLL_PAUSE_MS);

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

      if (newHeight === lastHeight) {
        scrollAttempts++;
        console.log(
          `🔄 No new content loaded (attempt ${scrollAttempts}/${MAX_SCROLL_ATTEMPTS})`,
        );

        if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
          console.log(`\n🏁 Max scroll attempts reached.`);
          break;
        }
      } else {
        scrollAttempts = 0;
        lastHeight = newHeight;
      }

      if (currentScroll >= maxScroll - 100) {
        console.log(`\n🏁 Reached bottom of replies.`);
        break;
      }
    }

    console.log(
      `\n🎉 Session complete! Total replies processed: ${processedReplies}`,
    );
    console.log(`📊 Retweeted: ${retweetedTweets.length}`);
    console.log(`📊 Skipped (ends with period): ${skippedTweets.length}`);

    return {
      success: true,
      repliesProcessed: processedReplies,
      retweeted: retweetedTweets.length,
      skipped: skippedTweets.length,
      retweetedTweets,
      skippedTweets,
    };
  } catch (err) {
    console.error(`🔥 Error with ${profileName}:`, err.message);
    return { success: false, reason: err.message };
  } finally {
    try {
      console.log(`\n🔧 Closing browser...`);
      await browser.close();
    } catch {}
  }
}

// ================== MAIN ==================
async function runScript() {
  console.log("\n⚡ HELPER MODE - Single Account Processing\n");

  const profileDir = getProfileDir(ACCOUNT_NAME);
  console.log(`🔄 Processing account: ${ACCOUNT_NAME}`);

  const result = await processProfile(profileDir, ACCOUNT_NAME);

  rl.close();
  console.log("\n================== SUMMARY ==================");

  if (result.success) {
    console.log(
      `✅ ${ACCOUNT_NAME} — Success | Replies: ${result.repliesProcessed} | Retweeted: ${result.retweeted} | Skipped: ${result.skipped}`,
    );

    // ================== SEND TELEGRAM MESSAGE AT THE END ==================
    if (SEND_TO_TELEGRAM) {
      console.log(`\n📤 Sending Telegram report...`);

      // Send retweeted count first
      const retweetedMessage = `Retweeted: ${result.retweeted}`;
      await sendToTelegram(retweetedMessage);

      // Small delay between messages
      await sleep(1000);

      // Send skipped count separately
      const skippedMessage = `Skipped: ${result.skipped}`;
      await sendToTelegram(skippedMessage);

      console.log(`✅ Telegram report sent successfully!`);
    }
  } else {
    console.log(`⚠️ ${ACCOUNT_NAME} — Failed: ${result.reason || ""}`);
  }

  console.log("\n=============================================\n");

  return result;
}

// Main execution
(async () => {
  console.log(`\n🚀 HELPER MODE STARTING`);
  console.log("=============================================\n");

  await runScript();

  console.log(`✅ Script completed.`);
})();
