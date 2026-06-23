import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const PROFILE_URL = "https://x.com/wetogethertlid";
const STOP_AT_TWEET_URL =
  "https://x.com/wetogethertlid/status/2068136054994215024";
// Example: "https://x.com/username/status/123456789" - will process tweets ABOVE this one and stop when reaching it
// Set to null to process all tweets on the profile

const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

// Single account configuration
const ACCOUNT_NAME = "anchinka";
const REGISTER_MODE = false; // Set to false after registration to perform actions
const HEADLESS = false;

// ================== ACTION CONFIG ==================
// ⚠️ SET THESE TO true/false BEFORE RUNNING ⚠️
const DO_LIKE = true; // Like tweets while scrolling
const DO_BOOKMARK = false; // Bookmark tweets while scrolling
const DO_RETWEET = false; // Retweet tweets while scrolling
const DO_COMMENT = false; // Comment on tweets while scrolling
const SLEEP_MS = 800; // Delay between actions (milliseconds)
const MAX_TWEETS = null; // null = unlimited, or set a number like 50 to stop after that many tweets
const SCROLL_PAUSE_MS = 1200; // Pause between scrolls to find new tweets
const TWEETS_BEFORE_VERIFY = 30; // After this many tweets, scroll back and verify none were missed
const SCROLL_PERCENTAGE = 0.6; // Scroll by 60% of viewport height to avoid missing edge tweets
const STOP_AT_TWEET_ID = null; // Extract tweet ID from URL, or set to null for no limit
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

let userPaused = false;
let userStopped = false;

// Handle Ctrl+C for graceful stop
process.on("SIGINT", () => {
  console.log("\n\n🛑 Ctrl+C detected! Finishing current tweet and exiting...");
  userStopped = true;
});

// Handle user input during processing
process.stdin.on("data", (data) => {
  const input = data.toString().trim().toLowerCase();
  if (input.includes("stop") || input.includes("s")) {
    userStopped = true;
    console.log(
      "\n🛑 STOP command received! Will finish current tweet and exit...",
    );
  } else if (input.includes("pause") || input.includes("p")) {
    userPaused = true;
    console.log('\n⏸️ PAUSED - Press "c" or "continue" to resume...');
  } else if (input.includes("continue") || input.includes("c")) {
    userPaused = false;
    console.log("\n▶️ RESUMED...");
  } else if (input.includes("help") || input.includes("h")) {
    console.log("\n🎮 CONTROLS:");
    console.log("  Ctrl+C - Stop processing and exit");
    console.log("  pause/p - Pause processing");
    console.log("  continue/c - Resume processing");
    console.log("  help/h - Show this help");
  }
});

// Make stdin emit 'data' for every keypress
process.stdin.setRawMode(true);
process.stdin.resume();

const askYesNo = (q) =>
  new Promise((resolve) => {
    rl.question(`${q}\n1) Yes\n2) No\n> `, (ans) => {
      ans = ans.trim().toLowerCase();
      resolve(ans === "1" || ans.startsWith("y"));
    });
  });

// Click helper
async function clickIfVisible(page, selectors = []) {
  for (const s of selectors) {
    try {
      const el = await page.$(s);
      if (el) {
        await el.click();
        return true;
      }
    } catch {}
  }
  return false;
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
async function processProfile(profileDir, profileName, accountIndex = 0) {
  // Get consistent fingerprint for this account
  const fingerprint = getAccountFingerprint(accountIndex);

  // Fullscreen window for better visibility
  const WINDOW_WIDTH = 1920;
  const WINDOW_HEIGHT = 1080;
  const posX = 0; // Fullscreen from left
  const posY = 0; // Fullscreen from top

  console.log(`\n🚀 Launching Chrome for: ${profileName}`);
  console.log(`   ├─ UA: ${fingerprint.userAgent.substring(0, 50)}...`);
  console.log(
    `   └─ Window: ${WINDOW_WIDTH}x${WINDOW_HEIGHT} at [${posX}, ${posY}] (FULLSCREEN)`,
  );

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    userDataDir: profileDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      "--start-maximized", // Start maximized
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

    // Give time to change settings before going to profile
    console.log(
      `⏳ You have 20 seconds to change settings before navigating to profile...`,
    );
    await sleep(20000); // 20 seconds to change settings before profile navigation

    // Navigate to profile
    console.log(`📍 Navigating to profile: ${PROFILE_URL}`);
    await page.goto(PROFILE_URL, { waitUntil: "networkidle2", timeout: 60000 });

    console.log(`\n🎯 Starting NORMAL MODE - Processing from top to bottom...`);
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

    console.log(`\n🎮 LIVE CONTROLS (work while running):`);
    console.log(`   Ctrl+C - Stop and exit gracefully`);
    console.log(`   Type: pause/p - Pause processing`);
    console.log(`   Type: continue/c - Resume processing`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let processedTweets = 0;
    let processedTweetIds = new Set(); // Track processed tweets to avoid duplicates
    let allSeenTweetIds = new Set(); // Track ALL tweets we've ever seen (including skipped)
    let lastHeight = 0;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 20; // Stop if no new tweets after this many scrolls
    let lastVerifyCount = 0; // Track how many tweets we had at last verification
    let totalScrollDistance = 0; // Track total scrolling for recovery

    while (true) {
      // Check for user stop command
      if (userStopped) {
        console.log(`\n🛑 User requested stop. Finishing up...`);
        break;
      }

      // Wait if paused
      if (userPaused) {
        console.log(`⏸️ Paused. Waiting for continue command...`);
        await new Promise((resolve) => {
          const checkPause = setInterval(() => {
            if (!userPaused || userStopped) {
              clearInterval(checkPause);
              resolve();
            }
          }, 500);
        });
        if (userStopped) break;
        console.log(`▶️ Resuming...`);
      }

      // Check if we've reached max tweets (if set)
      if (MAX_TWEETS && processedTweets >= MAX_TWEETS) {
        console.log(`\n🎉 Reached maximum tweet limit: ${MAX_TWEETS}`);
        break;
      }

      // Find all tweet elements on current page
      const tweets = await page.$$('[data-testid="tweet"]');
      const currentTweetCount = tweets.length;
      console.log(`📜 Found ${currentTweetCount} tweets on current screen`);

      // Process tweets from top to bottom (newest to oldest) - natural reading order
      for (let i = 0; i < currentTweetCount; i++) {
        if (MAX_TWEETS && processedTweets >= MAX_TWEETS) break;

        try {
          const tweet = tweets[i];

          // Check for user commands during tweet processing
          if (userStopped) {
            console.log(`\n🛑 User requested stop during processing.`);
            break;
          }

          // Get tweet ID to check if already processed
          const tweetId = await page.evaluate((el) => {
            const link = el.querySelector('a[href*="/status/"]');
            return link ? link.getAttribute("href") : null;
          }, tweet);

          if (!tweetId) {
            continue; // Skip if no ID
          }

          // Track all tweets we've seen
          allSeenTweetIds.add(tweetId);

          if (processedTweetIds.has(tweetId)) {
            continue; // Skip if already processed
          }

          processedTweetIds.add(tweetId);

          // Check if we've reached the stop tweet
          if (stopAtTweetId && tweetId.includes(stopAtTweetId)) {
            console.log(`\n🛑 Reached stop marker tweet: ${tweetId}`);
            console.log(`✅ Processing complete! Stopped at designated tweet.`);
            console.log(`📊 Total tweets processed: ${processedTweets}`);
            return {
              name: profileName,
              success: true,
              tweetsProcessed: processedTweets,
              stoppedAt: stopAtTweetId,
            };
          }

          // Only show detailed log every 20 tweets
          if (processedTweets % 20 === 0) {
            console.log(
              `\n🎯 Processing tweet ${processedTweets + 1}: ${tweetId}`,
            );
          }

          // Scroll tweet into view (but don't click/open it)
          await page.evaluate((el) => {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }, tweet);
          await sleepWithJitter(400, accountIndex);

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
                  await sleepWithJitter(800, accountIndex);
                  console.log(`❤️ Liked tweet`);
                } else {
                  console.log(`⏭️ Already liked - skipping`);
                }
              }
            } catch (e) {
              console.log(`⚠️ Like error: ${e.message}`);
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
                    console.log(`🔁 Retweeted tweet`);
                  }
                } else {
                  console.log(`⏭️ Already retweeted - skipping`);
                }
              }
            } catch (e) {
              console.log(`⚠️ Retweet error: ${e.message}`);
            }
          }

          // 🔖 Bookmark (direct from timeline, don't open tweet)
          if (DO_BOOKMARK) {
            try {
              const bookmarkButton = await tweet.$('[data-testid="bookmark"]');
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
                  console.log(`🔖 Bookmarked tweet`);
                } else {
                  console.log(`⏭️ Already bookmarked - skipping`);
                }
              }
            } catch (e) {
              console.log(`⚠️ Bookmark error: ${e.message}`);
            }
          }

          processedTweets++;

          // Show progress summary every 20 tweets
          if (processedTweets % 20 === 0) {
            console.log(
              `📊 Progress: ${processedTweets}${MAX_TWEETS ? "/" + MAX_TWEETS : ""} tweets processed | 💪 Still working...`,
            );
            console.log(`🎮 CONTROLS: Ctrl+C to stop | Type: pause/continue`);
          }

          // Small delay between tweets to appear more natural
          await sleepWithJitter(SLEEP_MS, accountIndex);
        } catch (e) {
          console.log(`⚠️ Error processing tweet: ${e.message}`);
        }
      }

      // 🔄 VERIFICATION: After every 30 tweets, scroll back and verify no tweets were missed
      if (processedTweets > 0 && processedTweets % TWEETS_BEFORE_VERIFY === 0) {
        console.log(`\n🔍 VERIFYING: Checking for missed tweets...`);

        const beforeVerifyCount = processedTweets;

        // Scroll back up to check for any missed tweets
        await page.evaluate(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
        await sleep(3000); // Wait for scroll and page to settle

        // Check all tweets currently visible
        const allTweetsNow = await page.$$('[data-testid="tweet"]');
        let foundNew = 0;

        for (const tweet of allTweetsNow) {
          try {
            const tweetId = await page.evaluate((el) => {
              const link = el.querySelector('a[href*="/status/"]');
              return link ? link.getAttribute("href") : null;
            }, tweet);

            if (tweetId && !allSeenTweetIds.has(tweetId)) {
              console.log(`🆕 MISSED TWEET FOUND: ${tweetId}`);
              foundNew++;
              allSeenTweetIds.add(tweetId);

              // Process this missed tweet immediately
              try {
                // ❤️ Like
                if (DO_LIKE) {
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
                      await sleepWithJitter(400, accountIndex);
                      console.log(`❤️ Liked missed tweet`);
                    } else {
                      console.log(`⏭️ Missed tweet already liked`);
                    }
                  }
                }

                // 🔁 Retweet
                if (DO_RETWEET) {
                  const retweetButton = await tweet.$(
                    '[data-testid="retweet"]',
                  );
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
                        console.log(`🔁 Retweeted missed tweet`);
                      }
                    } else {
                      console.log(`⏭️ Missed tweet already retweeted`);
                    }
                  }
                }

                // 🔖 Bookmark
                if (DO_BOOKMARK) {
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
                      console.log(`🔖 Bookmarked missed tweet`);
                    } else {
                      console.log(`⏭️ Missed tweet already bookmarked`);
                    }
                  }
                }

                processedTweets++;
                processedTweetIds.add(tweetId);
                console.log(
                  `✅ PROCESSED MISSED TWEET ${processedTweets}: ${tweetId}`,
                );
              } catch (err) {
                console.log(`⚠️ Error processing missed tweet: ${err.message}`);
              }
            }
          } catch (e) {
            console.log(`⚠️ Error checking tweet: ${e.message}`);
          }
        }

        if (foundNew > 0) {
          console.log(`🎉 Found and processed ${foundNew} missed tweets!`);
        } else {
          console.log(`✅ No missed tweets detected. All good!`);
        }

        // Scroll back to where we were
        console.log(`📍 Returning to previous position...`);
        await page.evaluate((scrollPos) => {
          window.scrollTo({ top: scrollPos, behavior: "smooth" });
        }, totalScrollDistance);
        await sleep(2000);

        lastVerifyCount = beforeVerifyCount;
      }

      // Smooth scroll down using percentage of viewport to avoid missing edge tweets
      console.log(
        `\n⬇️ Scrolling down (60% of viewport) to load more tweets...`,
      );

      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const scrollDistance = Math.floor(viewportHeight * SCROLL_PERCENTAGE);

      // Track total scroll distance for recovery
      totalScrollDistance += scrollDistance;

      // Scroll smoothly in one movement
      await page.evaluate((distance) => {
        window.scrollBy({ top: distance, behavior: "smooth" });
      }, scrollDistance);

      await sleepWithJitter(SCROLL_PAUSE_MS, accountIndex);

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
          console.log(`\n🏁 No more tweets to load. Reached end of profile.`);
          break;
        }
      } else {
        scrollAttempts = 0; // Reset counter if new content loaded
        lastHeight = newHeight;
      }

      // Check if we've scrolled to the bottom
      if (currentScroll >= maxScroll - 100) {
        console.log(`\n🏁 Reached bottom of profile.`);
        // Try scrolling a few more times to be sure
        const additionalAttempts = 3;
        for (let j = 0; j < additionalAttempts; j++) {
          await page.evaluate(() => {
            window.scrollBy(0, 300);
          });
          await sleep(2000);

          const finalCheck = await page.$$('[data-testid="tweet"]');
          console.log(
            `🔍 Final check ${j + 1}: Found ${finalCheck.length} tweets`,
          );

          if (finalCheck.length > currentTweetCount) {
            console.log(`🎉 Found more tweets! Continuing...`);
            break;
          }
        }
        break;
      }
    }

    console.log(
      `\n🎉 Session complete! Total tweets processed: ${processedTweets}`,
    );
    return {
      name: profileName,
      success: true,
      tweetsProcessed: processedTweets,
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
  console.log(`\n🎯 Processing single account: ${ACCOUNT_NAME}\n`);

  const profileDir = getProfileDir(ACCOUNT_NAME);

  if (REGISTER_MODE) {
    // Register mode - single account login ONLY
    console.log("📝 REGISTER MODE: Checking login status...\n");

    const logged = await checkAlreadyLoggedIn(profileDir);
    if (logged) {
      console.log(`✅ ${ACCOUNT_NAME} is already logged in.`);
      console.log(
        "✅ Registration complete. Set REGISTER_MODE = false to perform actions.",
      );
    } else {
      console.log(`⚠️ ${ACCOUNT_NAME} needs login...`);
      const result = await manualLogin(profileDir, ACCOUNT_NAME);
      if (!result.success) {
        console.log(`❌ Login failed for ${ACCOUNT_NAME}`);
        rl.close();
        process.exit(1);
      }
      console.log(
        "✅ Registration complete. Set REGISTER_MODE = false to perform actions.",
      );
    }

    rl.close();
    console.log("\n=============================================\n");
    return; // Exit after registration, don't continue to actions
  }

  // Action mode - perform actions on single account
  console.log(`\n⚡ ACTION MODE: Processing ${ACCOUNT_NAME}...\n`);

  const result = await processProfile(profileDir, ACCOUNT_NAME, 0, 0);

  rl.close();
  console.log("\n================== SUMMARY ==================");
  if (result.success) {
    console.log(`✅ ${ACCOUNT_NAME} — Success`);
  } else {
    console.log(`⚠️ ${ACCOUNT_NAME} — Failed: ${result.reason || ""}`);
  }
  console.log("=============================================\n");
})();
