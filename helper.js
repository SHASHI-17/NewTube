import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const TARGET_USERNAME = "xoeeie";
const FIRST_RETWEET_URL =
  "https://x.com/am1rax/status/2070511474037203135?s=20";
const STOP_URL = "https://x.com/xoeeie/status/2074862429260197991?s=20";
const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";
const SCRAPER_PROFILE = "meera";
const DO_RETWEET = false; // Keep disabled for now
const SLEEP_MS = 800;
const MAX_TO_PROCESS = null;
const SCROLL_PERCENTAGE = 0.4; // From six.js
const SCROLL_PAUSE_MS = 2000; // From six.js

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ================== HELPER FUNCTIONS ==================

function getProfileDir(name) {
  const dir = path.join(BASE_USER_DATA_DIR, `Account_${name}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clearChromeSession(profileDir) {
  try {
    const sessionFiles = [
      path.join(profileDir, "Default", "Session"),
      path.join(profileDir, "Default", "Current Session"),
      path.join(profileDir, "Default", "Current Tabs"),
      path.join(profileDir, "Default", "Last Session"),
      path.join(profileDir, "Default", "Last Tabs"),
    ];
    sessionFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        try {
          if (fs.statSync(file).isDirectory()) {
            fs.rmSync(file, { recursive: true, force: true });
          } else {
            fs.unlinkSync(file);
          }
        } catch (e) {}
      }
    });
  } catch (err) {}
}

async function goToRepliesTab(page, username) {
  console.log("📍 Going to home page first...");
  await page.goto("https://x.com/home", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await sleep(2000);

  console.log("⏳ Waiting 8 seconds for you to enable data saver...");
  await sleep(8000);

  const repliesUrl = `https://x.com/${username}/with_replies`;
  console.log(`📍 Now navigating to: ${repliesUrl}`);
  await page.goto(repliesUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(3000);
  console.log("✅ Loaded\n");
}

async function getTweetId(page, tweetElement) {
  try {
    const tweetId = await page.evaluate((el) => {
      const link = el.querySelector('a[href*="/status/"]');
      if (!link) return null;
      const href = link.getAttribute("href");
      const match = href.match(/status\/(\d+)/);
      return match ? match[1] : null;
    }, tweetElement);
    return tweetId;
  } catch (error) {
    return null;
  }
}

async function getCommentText(page, tweetElement) {
  try {
    // Get the actual reply text from the thread structure
    // On a with_replies page, each tweet element contains the main tweet
    // We need to find the reply text that's part of the thread

    const replyText = await page.evaluate((el) => {
      // Look for all tweet elements within this thread
      // The first one is the main tweet, subsequent ones are replies
      const allTweetTexts = el.querySelectorAll('[data-testid="tweetText"]');

      // If there are multiple tweetText elements, get the last one (the reply)
      // If there's only one, it might be the main tweet itself
      if (allTweetTexts.length > 1) {
        // Get the last tweetText which should be the reply
        return allTweetTexts[allTweetTexts.length - 1].textContent;
      } else if (allTweetTexts.length === 1) {
        // Only one element, check if this is a reply or main tweet
        return allTweetTexts[0].textContent;
      }

      return null;
    }, tweetElement);

    return replyText ? replyText.trim() : null;
  } catch (error) {
    return null;
  }
}

async function shouldRetweetTweet(page, tweetElement, targetUsername) {
  try {
    const result = await page.evaluate(
      (el, targetUser) => {
        const allDivs = el.querySelectorAll("div");
        let hasThreadLine = false;

        for (const div of allDivs) {
          const className = div.className || "";
          if (
            className.includes("r-1bnu78o") &&
            className.includes("r-f8sm7e")
          ) {
            hasThreadLine = true;
            break;
          }
        }

        if (!hasThreadLine) {
          return { shouldRetweet: false, reason: "no_thread" };
        }

        const userNameEl = el.querySelector('[data-testid="User-Name"]');
        if (userNameEl) {
          const userLink = userNameEl.querySelector('a[href*="/"]');
          if (userLink) {
            const href = userLink.getAttribute("href");
            const username = href
              ? href.replace(/^\//, "").replace(/\/$/, "")
              : "";

            if (username === targetUser) {
              return { shouldRetweet: false, reason: "own_tweet" };
            }
          }
        }

        return { shouldRetweet: true, reason: "found" };
      },
      tweetElement,
      targetUsername,
    );

    return result;
  } catch (error) {
    return { shouldRetweet: false, reason: "error" };
  }
}

async function retweetSpecificUrl(page, url) {
  try {
    console.log(`🎯 Navigating to specific URL: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(SLEEP_MS * 3);

    const tweetElement = await page.$('[data-testid="tweet"]');
    if (tweetElement) {
      console.log("✅ Found tweet - checking if already retweeted...");

      const unretweetButton = await page.evaluate((el) => {
        const allElements = el.querySelectorAll("*");
        for (const elem of allElements) {
          if (elem.getAttribute("data-testid") === "unretweet") {
            return true;
          }
        }
        return false;
      }, tweetElement);

      if (unretweetButton) {
        console.log("↩️ Already retweeted - unretweeting first...");

        try {
          const unretweetBtn = await tweetElement.$('[data-testid="unretweet"]');
          if (unretweetBtn) {
            await unretweetBtn.click();
            await sleep(SLEEP_MS);

            const confirmBtn = await page.$('[data-testid="unretweetConfirm"]');
            if (confirmBtn) {
              await confirmBtn.click();
              await sleep(SLEEP_MS * 2);
              console.log("✅ Unretweeted");
            }
          }
        } catch (err) {
          console.log(`⚠️ Unretweet failed: ${err.message}`);
        }
      }

      console.log("🔄 Retweeting...");
      await retweetTweet(page, tweetElement);
      console.log("✅ First retweet completed!");
    } else {
      console.log("⚠️ Could not find tweet element");
    }
  } catch (error) {
    console.log(`❌ Error retweeting specific URL: ${error.message}`);
  }
}

async function retweetTweet(page, tweetElement) {
  try {
    const retweetButton = await tweetElement.$('[data-testid="retweet"]');
    if (retweetButton) {
      await retweetButton.click();
      await sleep(SLEEP_MS);

      const menuItems = await page.$$('[role="menuitem"]');
      if (menuItems.length > 0) {
        await menuItems[0].click();
        await sleep(SLEEP_MS * 2);
        console.log("✅ Retweeted");
        return true;
      } else {
        console.log("⚠️ No menu items found");
      }
    } else {
      console.log("⚠️ Retweet button not found");
    }

    return false;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// ================== MAIN ==================
async function processReplies() {
  const profileDir = getProfileDir(SCRAPER_PROFILE);
  const WINDOW_WIDTH = 960;
  const WINDOW_HEIGHT = 1080;

  console.log("\n" + "=".repeat(60));
  console.log("🤖 COMMENT LOGGER - LOGGING MODE ONLY");
  console.log("=".repeat(60));
  console.log(`📍 Target: @${TARGET_USERNAME}`);
  console.log(`📁 Profile: ${SCRAPER_PROFILE}`);
  console.log(`🛑 Stop: ${STOP_URL || "None"}`);
  console.log(`🔁 Actions: DISABLED (logging only)`);
  console.log("=".repeat(60) + "\n");

  clearChromeSession(profileDir);

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: profileDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-infobars",
      `--window-size=${WINDOW_WIDTH},${WINDOW_HEIGHT}`,
      `--window-position=0,0`,
      "--mute-audio",
      "--no-first-run",
    ],
    defaultViewport: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
  });

  const pages = await browser.pages();
  if (pages.length > 1) {
    console.log(`🧹 Closing ${pages.length - 1} extra tabs...`);
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  }

  // Identify X.com tabs vs blank tabs
  let xTab = null;
  let blankTabs = [];

  for (let i = 0; i < pages.length; i++) {
    try {
      const url = pages[i].url();
      if (url.includes("x.com") || url.includes("twitter.com")) {
        xTab = pages[i];
      } else if (url === "about:blank" || url.includes("chrome://")) {
        blankTabs.push(pages[i]);
      }
    } catch (e) {
      blankTabs.push(pages[i]);
    }
  }

  // Close all blank tabs
  for (const tab of blankTabs) {
    try {
      await tab.close();
    } catch (e) {
      // Ignore errors closing tabs
    }
  }

  let page = xTab || pages[0]; // Use X tab if found, otherwise first page

  // CRITICAL: Bring the correct tab to focus and verify it's active
  try {
    await page.bringToFront();
    await sleep(200); // Give it a moment to activate
  } catch (e) {
    console.log(`⚠️ Could not bring tab to front, continuing anyway...`);
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

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  );

  try {
    // First retweet the specific URL
    if (FIRST_RETWEET_URL) {
      console.log("🎯 STEP 1: Retweeting specific URL first...");
      await retweetSpecificUrl(page, FIRST_RETWEET_URL);
      await sleep(SLEEP_MS * 3);
      console.log("✅ Step 1 completed!\n");
    }

    await goToRepliesTab(page, TARGET_USERNAME);

    let stopAtTweetId = null;
    if (STOP_URL) {
      const match = STOP_URL.match(/status\/(\d+)/);
      if (match) stopAtTweetId = match[1];
      console.log(`🛑 Stop at: ${stopAtTweetId}\n`);
    }

    let processedCount = 0;
    const processedIds = new Set();
    let scrollAttempts = 0;
    let lastHeight = 0;
    const MAX_SCROLL_ATTEMPTS = 50;

    console.log("🔄 Processing...\n");

    while (MAX_TO_PROCESS === null || processedCount < MAX_TO_PROCESS) {
      const tweets = await page.$$('[data-testid="tweet"]');
      console.log(`📜 Found: ${tweets.length} | Done: ${processedCount}`);

      for (const tweet of tweets) {
        const tweetId = await getTweetId(page, tweet);
        if (!tweetId || processedIds.has(tweetId)) continue;

        processedIds.add(tweetId);

        // Check if stop tweet
        if (stopAtTweetId && tweetId === stopAtTweetId) {
          console.log(`\n🛑 Reached stop: ${tweetId}`);
          console.log(`✅ Complete! Total: ${processedCount}`);
          await browser.close();
          return;
        }

        // Check if should retweet
        const { shouldRetweet, reason } = await shouldRetweetTweet(
          page,
          tweet,
          TARGET_USERNAME,
        );

        if (shouldRetweet) {
          // Get COMMENT text and log it
          const commentText = await getCommentText(page, tweet);

          if (commentText) {
            const trimmedText = commentText.trim();
            const lastChar = trimmedText.charAt(trimmedText.length - 1);
            const endsWithDot = lastChar === '.';

            console.log(`\n🆔 ${tweetId}`);
            console.log(`💬 CAPTURED: "${trimmedText}"`);
            console.log(`🔚 Last char: "${lastChar}" (${trimmedText.charCodeAt(trimmedText.length - 1)})`);
            console.log(`❌ Ends with dot: ${endsWithDot ? 'YES - SKIP' : 'NO - RETWEET'}`);
          } else {
            console.log(`\n⚠️ ${tweetId}: No text found`);
          }

          processedCount++;
        } else {
          console.log(`\n⏭️ ${tweetId} - ${reason}`);
        }

        if (MAX_TO_PROCESS && processedCount >= MAX_TO_PROCESS) {
          console.log(`\n🎉 Reached max: ${MAX_TO_PROCESS}`);
          break;
        }
      }

      // Scroll using six.js logic
      console.log(`\n⬇️ Scrolling down (${SCROLL_PERCENTAGE * 100}% of viewport)...`);

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
      await sleep(SCROLL_PAUSE_MS);

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
          `🔄 No new content (attempt ${scrollAttempts}/${MAX_SCROLL_ATTEMPTS})`,
        );

        if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
          console.log(`\n🏁 Max scroll attempts reached - stopping`);
          break;
        }
      } else {
        scrollAttempts = 0;
        lastHeight = newHeight;
      }

      if (currentScroll >= maxScroll - 100) {
        console.log(`\n🏁 Reached bottom - stopping`);
        break;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`🎉 Complete! Processed: ${processedCount}`);
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await sleep(3000);
    await browser.close();
  }
}

processReplies().catch(console.error);
