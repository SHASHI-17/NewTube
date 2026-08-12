import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";
import axios from "axios";
import FormData from "form-data";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";

// 🧩 Enable stealth plugin to bypass bot detection
puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
// ⚠️ ADD YOUR TASKS HERE ⚠️
// Each task:
// - name: your name for this task (for logging/reporting)
// - account: which automation account to use (from your Account_ folders)
// - end_url: tweet URL to stop at
// - actions: array of actions to perform
// The profile URL will be automatically extracted from the end_url
// Tasks will be processed 2 at a time
// const TASKS = [
//   //   // {
//   //   //   name: "HIT-1", // Your name for this task
//   //   //   account: "anchinka", // Which automation account to use (Account_hibye folder)
//   //   //   end_url: "https://x.com/hit_tl1/status/2072491206156677403",
//   //   //   actions: ["like"],
//   //   // },
//   //   // // // // Add more tasks as needed

//   //   // {
//   //   //   name: "hit RT",
//   //   //   account: "meera",
//   //   //   end_url: "https://x.com/Bunty277/status/2072491941560824156",
//   //   //   actions: ["repost"],
//   //   // },
//   //   // {
//   //   //   name: "WE RT",
//   //   //   account: "anchinka",
//   //   //   end_url: "https://x.com/yaduvnair/status/2072534359366938874",
//   //   //   actions: ["repost"],
//   //   // },
//   //   // {
//   //   //   name: "we like", // Your name for this task
//   //   //   account: "meera", // Which automation account to use (Account_hibye folder)
//   //   //   end_url: "https://x.com/Wetogethertlid/status/2072534477092569216?s=20",
//   //   //   actions: ["like"],
//   //   // },
//   //   // Add more tasks as needed

//   //   // {
//   //   //   name: "rajbhoghun",
//   //   //   account: "ivy",
//   //   //   end_url: "https://x.com/rajbhoghun/status/2071948087107445067",
//   //   //   actions: ["like"],
//   //   // },
//   //   {
//   //     name: "Loveable",
//   //     account: "meera",
//   //     end_url: "https://x.com/loveebirdsss/status/2072973122085786092",
//   //     actions: ["like"],
//   //   },
//   //   // {
//   //   //   name: "Rinku725",
//   //   //   account: "meera",
//   //   //   end_url: "https://x.com/Rinku725/status/2071940663302578329?s=20",
//   //   //   actions: ["repost"],
//   //   // },
//   //   // {
//   //   //   name: "Rinku725",
//   //   //   account: "ivy",
//   //   //   end_url: "https://x.com/poolh28t/status/2071948670107340824",
//   //   //   actions: ["repost"],
//   //   // },
//   // {
//   //   name: "loveebirdsss",
//   //   account: "bluemoon",
//   //   end_url: "https://x.com/loveebirdsss/status/2077248958225658243?s=20",
//   //   actions: ["like"],
//   // },
//   // {
//   //   name: "Monu191947",
//   //   account: "meera",
//   //   end_url: "https://x.com/Monu191947/status/2077233084848623988?s=20",
//   //   actions: ["like"],
//   // },
//   {
//     name: "rapid likes",
//     account: "meera",
//     end_url: "https://x.com/JohnSmithxmfzk/status/2077235305795498325?s=20",
//     actions: ["like"],
//   },
//   {
//     name: "rcb",
//     account: "hibye",
//     end_url: "https://x.com/RcbShakshi/status/2077235420799041544?s=20",
//     actions: ["like"],
//   },
// ];

const TASKS = [
  // {
  //   name: "HIT 1", // Your name for this task
  //   account: "hibye", // Which automation account to use (Account_hibye folder)
  //   end_url: "https://x.com/hit_tl1/status/2078765292319133724?s=20",
  //   actions: ["like"],
  // },
  // // // // // Add more tasks as needed

  {
    name: "we rt",
    account: "hibye",
    end_url: "https://x.com/AkanSimon/status/2078781963779887373?s=20",
    actions: ["repost"],
  },
  // // {
  // //   name: "we rt",
  // //   account: "meera",
  // //   end_url: "https://x.com/yaduvnair/status/2073764971121606719?s=20",
  // //   actions: ["repost"],
  // // },
  // {
  //   name: "we like", // Your name for this task
  //   account: "adore", // Which automation account to use (Account_hibye folder)
  //   end_url: "https://x.com/Wetogethertlid/status/2078781065280229485?s=20",
  //   actions: ["like"],
  // },
];

// Available actions: 'like', 'repost', 'bookmark', 'comment'

const BASE_USER_DATA_DIR =
  process.env.BASE_USER_DATA_DIR ||
  "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data\\Automation";

// 📼 RECORDINGS FOLDER
const RECORDINGS_DIR = "C:\\new-tube\\recordings";
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Multiple accounts configuration
// const ACCOUNT_NAMES = [
//   "adore",
//   "orange",
//   "bluemoon",
//   "kiran",
//   "hibye",
//   "inyvix",
//   "bae",
//   "anchinka",
//   // "meera",
//   // "ivy",
//   // "ixyi",
//   // "water1",
//   // "water2",
//   // "water3",
//   // "fire1",
//   // "fire2",
//   // "fire3",
//   // "ivy",
// ];
const REGISTER_MODE = false; // Set to true to register accounts, false to perform actions
const HEADLESS = false;

// ================== ACTION CONFIG ==================
const SLEEP_MS = 800; // Base delay between actions (milliseconds) - RELIABLE pace
const ACCOUNT_STAGGER = 4000; // Stagger delay between accounts (ms)
const MAX_TWEETS = null; // null = unlimited, or set a number like 50 to stop after that many tweets
const SCROLL_PAUSE_MS = 2000; // Pause between scrolls to find new tweets
const TWEETS_BEFORE_VERIFY = null; // Disabled - no verification, just keep scrolling
const SCROLL_PERCENTAGE = 0.4; // Scroll by 40% of viewport height to be safer and not miss tweets
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ================== TELEGRAM BOT CONFIG ==================
const BOT_TOKEN = "8948612339:AAGaauKopSBaM8EgWkXZ5nzHvZlnR9RWhl0";
const TELEGRAM_CHAT_IDS = ["1991164194", "1956483216", "8749929962"];
const DO_DOUBLE_PROCESSING = true; // Process each task twice for quality control

// Telegram Bot Functions
async function sendTelegramMessage(message) {
  for (const chatId of TELEGRAM_CHAT_IDS) {
    try {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      });
      console.log(`📤 Telegram message sent to ${chatId}`);
    } catch (error) {
      console.error(`❌ Telegram error for ${chatId}:`, error.message);
    }
  }
}

async function sendTelegramAlert(message) {
  const alertMessage = `🚨 <b>ALERT</b>\n\n${message}`;
  await sendTelegramMessage(alertMessage);
}

async function sendTelegramReport(report) {
  const reportMessage = `📊 <b>REPORT</b>\n\n${report}`;
  await sendTelegramMessage(reportMessage);
}

async function sendTaskStart(task, accountName, passNumber) {
  const message =
    `🚀 <b>TASK STARTED</b>\n\n` +
    `📝 Task: <b>${task.name}</b>\n` +
    `👤 Account: <b>${accountName}</b>\n` +
    `🎯 Target: ${task.end_url}\n` +
    `⚡ Actions: ${task.actions.join(", ")}\n` +
    `🔄 Pass: <b>${passNumber === 1 ? "FIRST PASS" : "SECOND PASS (QC)"}</b>`;
  await sendTelegramMessage(message);
}

async function sendTaskComplete(task, accountName, passNumber, result) {
  let message =
    `✅ <b>PASS ${passNumber} COMPLETE</b>\n\n` +
    `📝 Task: <b>${task.name}</b>\n` +
    `👤 Account: <b>${accountName}</b>\n` +
    `⚡ Actions: ${task.actions.join(", ")}\n` +
    `🎯 Target: ${task.end_url}\n`;

  if (result.success) {
    message += `✅ Status: <b>SUCCESS</b>\n`;
    message += `📊 Tweets processed: <b>${result.tweetsProcessed}</b>\n`;

    // Add failure info if any
    if (
      result.failedLikes?.length > 0 ||
      result.failedRetweets?.length > 0 ||
      result.failedBookmarks?.length > 0
    ) {
      message += `\n⚠️ <b>Issues Found:</b>\n`;
      if (result.failedLikes?.length > 0) {
        message += `\n❌ Failed Likes: ${result.failedLikes.length}\n`;
      }
      if (result.failedRetweets?.length > 0) {
        message += `\n🔁 Failed Retweets: ${result.failedRetweets.length}\n`;
      }
      if (result.failedBookmarks?.length > 0) {
        message += `\n🔖 Failed Bookmarks: ${result.failedBookmarks.length}\n`;
      }
    }
  } else {
    message += `❌ Status: <b>FAILED</b>\n`;
    message += `💡 Reason: ${result.reason || "Unknown error"}`;
  }

  await sendTelegramMessage(message);
}

async function sendTelegramVideo(filepath, taskName, accountName) {
  // Read video file
  const videoData = fs.readFileSync(filepath);

  for (const chatId of TELEGRAM_CHAT_IDS) {
    try {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("video", videoData, {
        filename: path.basename(filepath),
        contentType: "video/mp4",
      });
      form.append(
        "caption",
        `📼 <b>Recording for task: ${taskName}</b>\n\n👤 Account: ${accountName}\n⚡ Actions completed - scroll to top recorded`,
      );

      await axios.post(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
        },
      );
      console.log(`📤 Video sent to Telegram ${chatId}`);
    } catch (error) {
      console.error(`❌ Telegram video error for ${chatId}:`, error.message);
    }
  }
}

async function sendFinalSummary(allResults) {
  let message = `🎉 <b>ALL TASKS COMPLETE - FINAL SUMMARY</b>\n\n`;

  const tasksByTaskId = {};
  for (const result of allResults) {
    const taskId = result.taskId || "unknown";
    if (!tasksByTaskId[taskId]) {
      tasksByTaskId[taskId] = {
        task: result.task,
        results: [],
      };
    }
    tasksByTaskId[taskId].results.push(result);
  }

  for (const taskId in tasksByTaskId) {
    const { task, results } = tasksByTaskId[taskId];
    message += `\n📝 <b>${task?.name || taskId}</b>\n`;
    message += `   👤 Account: <b>${task?.account || "N/A"}</b>\n`;
    message += `   ⚡ Actions: ${task?.actions?.join(", ") || "N/A"}\n`;

    for (const result of results) {
      const pass = result.passNumber === 2 ? "SECOND (QC)" : "FIRST";
      if (result.success) {
        message += `   ✅ Pass ${pass}: SUCCESS (${result.tweetsProcessed || 0} tweets)\n`;
      } else {
        message += `   ❌ Pass ${pass}: FAILED - ${result.reason || "Unknown"}\n`;
      }
    }
  }

  await sendTelegramMessage(message);
}

// ================== HELPER FUNCTIONS ==================
// Extract profile URL from tweet URL
function extractProfileURL(tweetURL) {
  try {
    const match = tweetURL.match(/https:\/\/x\.com\/([^\/]+)\/status\/\d+/);
    if (match) {
      return `https://x.com/${match[1]}`;
    }
    throw new Error("Invalid tweet URL format");
  } catch (error) {
    console.error("❌ Error extracting profile URL:", error.message);
    throw error;
  }
}

// Extract tweet ID from tweet URL
function extractTweetID(tweetURL) {
  try {
    const match = tweetURL.match(/status\/(\d+)/);
    if (match) {
      return match[1];
    }
    throw new Error("Invalid tweet URL format");
  } catch (error) {
    console.error("❌ Error extracting tweet ID:", error.message);
    throw error;
  }
}

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

// ================== SCREEN RECORDING ==================
async function recordScrollToTop(page, taskName, accountName) {
  try {
    console.log(`\n📼 Starting screen recording...`);

    // Generate video filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const filename = `${taskName}_${accountName}_${timestamp}.mp4`;
    const filepath = path.join(RECORDINGS_DIR, filename);

    console.log(`💾 Will save to: ${filepath}`);

    // Initialize screen recorder with optimized settings for small file size
    const recorder = new PuppeteerScreenRecorder(page);

    // Start recording immediately
    console.log(`⚡⬆️ Starting ULTRA AGGRESSIVE scroll to top...`);
    await recorder.start(filepath);

    // Get current position
    const currentScroll = await page.evaluate(() => window.scrollY);
    console.log(`📹 Starting position: ${currentScroll}px`);

    // Ultra aggressive scroll strategy - INSTANT scrolling for maximum speed
    const ULTRA_SCROLL_DISTANCE = 2000; // Even larger chunk per scroll (2K pixels!)
    const totalSteps = Math.ceil(currentScroll / ULTRA_SCROLL_DISTANCE);
    console.log(
      `📹 Will use ${totalSteps} LIGHTNING FAST scrolls to reach top`,
    );

    // Track positions to detect when near top
    let previousPos = currentScroll;
    let nearTop = false;

    // Lightning fast scrolling - fetch posts while scrolling fast
    for (let i = 0; i < totalSteps; i++) {
      // Calculate progress (0 to 1)
      const progress = i / totalSteps;

      // LIGHTNING FAST at beginning, slow down when near top
      let delay;
      if (!nearTop && progress < 0.85) {
        delay = 10; // LIGHTNING FAST - fetch posts rapidly (10ms = ultra fast)
      } else if (progress < 0.95) {
        delay = 40; // Medium - starting to slow down
        nearTop = true; // We're near top now
      } else {
        delay = 80; // Slow - final gentle approach
      }

      console.log(
        `📹 Scroll ${i + 1}/${totalSteps} - Progress: ${Math.round(progress * 100)}% - Delay: ${delay}ms${nearTop ? " (NEAR TOP)" : " (FETCHING POSTS)"}`,
      );

      // Lightning fast scroll step - INSTANT behavior
      await page.evaluate((dist) => {
        window.scrollBy({ top: -dist, behavior: "auto" }); // INSTANT, not smooth
      }, ULTRA_SCROLL_DISTANCE);

      await sleep(delay);

      // Force content rendering and post fetching
      await page.evaluate(() => {
        const tweets = document.querySelectorAll('[data-testid="tweet"]');
        tweets.forEach((t) => t.getBoundingClientRect());
      });

      // Check current position
      const currentPos = await page.evaluate(() => window.scrollY);
      console.log(
        `📹 Position: ${currentPos}px (moved: ${previousPos - currentPos}px)`,
      );

      // Detect if we're near top (last 3000 pixels)
      if (currentPos < 3000 && !nearTop) {
        console.log(`📹 Near top detected (< 3000px), will slow down...`);
        nearTop = true;
      }

      previousPos = currentPos;

      // If we're already at top, break
      if (currentPos <= 50) {
        console.log(`📹 At top, breaking early...`);
        break;
      }
    }

    // Final instant jump to top
    console.log(`📹 Final instant jump to top...`);
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "auto" }); // INSTANT
    });

    await sleep(100); // Ultra quick settle

    const finalPos = await page.evaluate(() => window.scrollY);
    console.log(`📹 Final position at top: ${finalPos}px`);

    // Wait exactly 1 second before redirect (as requested)
    console.log(`📹 Waiting exactly 1 second before redirect to profile...`);
    await sleep(1000);

    // Click profile immediately after 1 second
    console.log(`📹 Clicking profile now...`);
    try {
      await page.evaluate(() => {
        const profileLink = document.querySelector(
          '[data-testid="AppTabBar_Profile_Link"]',
        );
        if (profileLink) {
          profileLink.click();
          console.log(`✅ Profile clicked!`);
        } else {
          console.log(`⚠️ Profile link not found`);
        }
      });
      await sleep(1000); // Quick wait for navigation
    } catch (e) {
      console.log(`⚠️ Could not click profile: ${e.message}`);
    }

    // Stop recording
    await recorder.stop();

    console.log(`📼 Recording stopped. Processing video...`);

    // Check file size
    const stats = fs.statSync(filepath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📊 Video file size: ${fileSizeMB} MB`);

    if (stats.size > 10 * 1024 * 1024) {
      console.log(`⚠️ Warning: File exceeds 10 MB`);
    } else {
      console.log(`✅ File size within limits (8-10 MB)`);
    }

    console.log(`✅ Recording saved: ${filename}`);

    return {
      success: true,
      filepath,
      filename,
      fileSizeMB,
    };
  } catch (error) {
    console.log(`❌ Recording failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ================== ACTION LOGIC ==================
async function processProfile(
  profileDir,
  profileName,
  accountIndex,
  batchSlot = 0,
  task = null,
  passNumber = 1,
) {
  // Clear Chrome session files BEFORE launching to prevent tab restore
  clearChromeSession(profileDir);

  // Get consistent fingerprint for this account
  const fingerprint = getAccountFingerprint(accountIndex);

  // Extract task configuration
  const profileURL = task
    ? extractProfileURL(task.end_url)
    : "https://x.com/am1rax";
  const stopAtTweetId = task ? extractTweetID(task.end_url) : null;
  const DO_LIKE = task?.actions?.includes("like") || false;
  const DO_RETWEET = task?.actions?.includes("repost") || false;
  const DO_BOOKMARK = task?.actions?.includes("bookmark") || false;
  const DO_COMMENT = task?.actions?.includes("comment") || false;
  const taskId = task?.name || "unknown";

  // Send Telegram notification when task starts
  if (task) {
    await sendTaskStart(task, profileName, passNumber);
  }

  console.log(`\n📋 Task ID: ${taskId}`);
  console.log(`📍 Profile: ${profileURL}`);
  console.log(`🛑 Stop at tweet: ${stopAtTweetId || "No limit"}`);
  console.log(`⚙️ Actions: ${task?.actions?.join(", ") || "None"}`);

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
    // CRITICAL FIX: Give Chrome time to fully launch and restore tabs
    console.log(`⏳ Waiting for Chrome to fully launch...`);
    await sleep(2000); // Wait 2 seconds for Chrome to stabilize

    // CRITICAL FIX: Check for X.com tabs with retry mechanism (max 4 retries)
    console.log(`🔍 Checking for restored X.com tabs...`);

    let xTab = null;
    let pages = [];
    let retries = 0;
    const maxRetries = 4; // 4 retries is enough

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
        if (retries < maxRetries) {
          await sleep(1000);
        }
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

      // Get existing pages or create new one
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
        // Navigate new page to X.com
        console.log(`🌐 Navigating new page to X.com...`);
        await page.goto("https://x.com/home", {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
      } catch (newPageError) {
        console.log(`⚠️ Could not create new page: ${newPageError.message}`);
        throw new Error("Cannot get a valid page to work with");
      }
    }

    // CRITICAL: Verify page is still valid before proceeding
    try {
      const currentUrl = page.url();
      console.log(`🔍 Current tab URL: ${currentUrl}`);

      if (currentUrl.includes("x.com") || currentUrl.includes("twitter.com")) {
        console.log(`✅ On X.com tab, ready to proceed!`);
      } else {
        console.log(`⚠️ Not on X.com tab (URL: ${currentUrl}), will navigate...`);
        console.log(`🌐 Navigating to X.com...`);
        await page.goto("https://x.com/home", {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
        console.log(`✅ Successfully navigated to X.com`);
      }
    } catch (urlError) {
      console.log(`⚠️ Could not get page URL: ${urlError.message}`);
      throw new Error("Page is not usable, cannot proceed");
    }

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
      return {
        name: profileName,
        success: false,
        reason: "Not logged in",
        task,
      };
    }

    console.log(`✅ ${profileName} is logged in — proceeding...`);

    // Give time to change settings before going to profile
    console.log(
      `⏳ You have 10 seconds to change settings before navigating to profile...`,
    );
    await sleep(10000); // 10 seconds to change settings before profile navigation

    // Navigate to profile
    console.log(`📍 Navigating to profile: ${profileURL}`);
    try {
      await page.goto(profileURL, {
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

    console.log(`\n🎯 Starting NORMAL MODE - Processing from top to bottom...`);
    console.log(
      `⚙️ Actions enabled: ${DO_LIKE ? "✅ Like" : "❌ Like"}, ${DO_RETWEET ? "✅ Retweet" : "❌ Retweet"}, ${DO_BOOKMARK ? "✅ Bookmark" : "❌ Bookmark"}, ${DO_COMMENT ? "✅ Comment" : "❌ Comment"}`,
    );

    if (MAX_TWEETS) {
      console.log(`📊 Will process max ${MAX_TWEETS} tweets`);
    } else {
      console.log(`♾️ Unlimited mode - will continue until manually stopped`);
    }

    if (stopAtTweetId) {
      console.log(`📍 Stop marker set: Will stop at tweet ${stopAtTweetId}`);
    }

    let processedTweets = 0;
    let processedTweetIds = new Set(); // Track processed tweets to avoid duplicates
    let allSeenTweetIds = new Set(); // Track ALL tweets we've ever seen (including skipped)
    let lastHeight = 0;
    let scrollAttempts = 0;
    const MAX_SCROLL_ATTEMPTS = 100; // Much more patience for large timelines

    // Detailed tracking for reporting (only actual failures, not already-performed actions)
    const failedLikes = []; // {tweetId, url, reason}
    const failedRetweets = []; // {tweetId, url, reason}
    const failedBookmarks = []; // {tweetId, url, reason}
    const failedComments = []; // {tweetId, url, reason}
    const skippedTweets = []; // {tweetId, url, reason}

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

      // Process tweets from top to bottom (newest to oldest) - natural reading order
      for (let i = 0; i < currentTweetCount; i++) {
        if (MAX_TWEETS && processedTweets >= MAX_TWEETS) break;

        try {
          const tweet = tweets[i];

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

            const result = {
              name: profileName,
              success: true,
              tweetsProcessed: processedTweets,
              stoppedAt: stopAtTweetId,
              task,
            };

            // Send Telegram completion notification
            if (task) {
              await sendTaskComplete(task, profileName, passNumber, result);
            }

            // 📼 Record scroll to top and send to Telegram IMMEDIATELY AFTER SECOND PASS
            if (passNumber === 2) {
              console.log(
                `\n📼 Recording scroll to top NOW (browser still open)...`,
              );
              try {
                const recordingResult = await recordScrollToTop(
                  page,
                  task.name,
                  profileName,
                );
                if (recordingResult.success) {
                  console.log(
                    `✅ Recording completed: ${recordingResult.filename}`,
                  );
                  console.log(`📁 Saved to: ${recordingResult.filepath}`);
                  console.log(`📊 Size: ${recordingResult.fileSizeMB} MB`);

                  // Send video to Telegram
                  console.log(`📤 Sending video to Telegram...`);
                  await sendTelegramVideo(
                    recordingResult.filepath,
                    task.name,
                    profileName,
                  );
                  console.log(`✅ Video sent to Telegram`);
                }
              } catch (recordError) {
                console.log(`⚠️ Recording failed: ${recordError.message}`);
              }
            }

            return result;
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
          await sleep(300); // Fast but reliable scroll wait

          // Check if we accidentally navigated to a tweet page
          const currentUrl = page.url();
          if (
            currentUrl.includes("/status/") &&
            !currentUrl.startsWith(profileURL)
          ) {
            console.log(`⚠️ Accidentally opened a tweet! URL: ${currentUrl}`);
            console.log(`🔙 Going back to profile...`);

            // Try to click back button
            try {
              const backButton = await page.$('[data-testid="app-bar-back"]');
              if (backButton) {
                await backButton.click();
                await sleep(2000);
                console.log(`✅ Returned to profile`);
              } else {
                // Fallback: use page.goBack()
                await page.goBack();
                await sleep(2000);
                console.log(`✅ Returned to profile using back()`);
              }
            } catch (e) {
              console.log(`❌ Error going back: ${e.message}`);
            }

            // Re-navigate to profile if still not there
            const newUrl = page.url();
            if (newUrl.includes("/status/")) {
              console.log(
                `📍 Still on tweet page, navigating back to profile...`,
              );
              await page.goto(profileURL, {
                waitUntil: "networkidle2",
                timeout: 60000,
              });
              await sleep(2000);
            }

            continue; // Skip this tweet and move to next
          }

          // ❤️ Like (direct from timeline, don't open tweet)
          if (DO_LIKE) {
            try {
              // Minimal wait for element stability
              await sleep(100);

              // First check if already liked (unlike button exists)
              const unlikeButton = await tweet.$('[data-testid="unlike"]');
              if (unlikeButton) {
                // Already liked - skip this tweet
                continue;
              }

              // If no unlike button, look for like button
              const likeButton = await tweet.$('[data-testid="like"]');
              if (likeButton) {
                // Check if button is visible and clickable
                const isClickable = await page.evaluate((el) => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                }, likeButton);

                if (!isClickable) {
                  console.log(
                    `⏭️ Like button not clickable for: ${tweetId} (skipping)`,
                  );
                  continue; // Skip to next tweet
                }

                // Click the like button
                await page.evaluate((el) => {
                  el.click();
                }, likeButton);

                await sleep(800); // Wait for like to process
                // No logs for success or skipped items
              }
            } catch (e) {
              console.log(`❌ Like FAILED for ${tweetId}: ${e.message}`);
            }
          }

          // 🔁 Retweet (direct from timeline, don't open tweet)
          if (DO_RETWEET) {
            try {
              await sleep(100); // Wait for element stability

              // First check if already retweeted (unretweet button exists)
              const unretweetButton = await tweet.$(
                '[data-testid="unretweet"]',
              );
              if (unretweetButton) {
                // Already retweeted - skip silently
                continue;
              }

              // If no unretweet button, look for retweet button
              const retweetButton = await tweet.$('[data-testid="retweet"]');
              if (retweetButton) {
                // Check if button is visible and clickable
                const isClickable = await page.evaluate((el) => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                }, retweetButton);

                if (!isClickable) {
                  continue; // Skip silently
                }

                // Click the retweet button precisely
                await page.evaluate((el) => {
                  el.click();
                }, retweetButton);

                await sleep(300); // Wait for menu to open

                // Find and click the first menu item (Repost)
                const menuItems = await page.$$('[role="menuitem"]');
                if (menuItems.length > 0) {
                  // Click the first menu item precisely
                  await page.evaluate((el) => {
                    el.click();
                  }, menuItems[0]);

                  await sleep(700); // Wait for retweet to process
                  // No logs for success or skipped items
                }
              }
            } catch (e) {
              console.log(`❌ Retweet FAILED for ${tweetId}: ${e.message}`);
            }
          }

          // 🔖 Bookmark (direct from timeline, don't open tweet)
          if (DO_BOOKMARK) {
            try {
              await sleep(100); // Wait for element stability

              // First check if already bookmarked (removeBookmark button exists)
              const removeBookmarkButton = await tweet.$(
                '[data-testid="removeBookmark"]',
              );
              if (removeBookmarkButton) {
                // Already bookmarked - skip silently
                continue;
              }

              // If no removeBookmark button, look for bookmark button
              const bookmarkButton = await tweet.$('[data-testid="bookmark"]');
              if (bookmarkButton) {
                // Check if button is visible and clickable
                const isClickable = await page.evaluate((el) => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0;
                }, bookmarkButton);

                if (!isClickable) {
                  continue; // Skip silently
                }

                // Click the bookmark button precisely
                await page.evaluate((el) => {
                  el.click();
                }, bookmarkButton);

                await sleep(500); // Wait for bookmark to process
                // No logs for success or skipped items
              }
            } catch (e) {
              console.log(`❌ Bookmark FAILED for ${tweetId}: ${e.message}`);
            }
          }

          processedTweets++;

          // Show progress summary every 20 tweets
          if (processedTweets % 20 === 0) {
            console.log(
              `📊 Progress: ${processedTweets}${MAX_TWEETS ? "/" + MAX_TWEETS : ""} tweets processed | 💪 Still working...`,
            );
          }

          // Small delay between tweets to appear more natural
          await sleepWithJitter(400, accountIndex); // Optimized pace - faster but reliable
        } catch (e) {
          console.log(`⚠️ Error processing tweet: ${e.message}`);
        }
      }

      // Smooth scroll down using percentage of viewport to avoid missing edge tweets
      console.log(
        `\n⬇️ Scrolling down (30% of viewport) to load more tweets - OPTIMIZED FOR SPEED...`,
      );

      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const scrollDistance = Math.floor(viewportHeight * 0.3); // 30% for thorough coverage

      // Do multiple small scrolls to ensure Twitter's lazy loading triggers properly
      const scrollSteps = 5; // Keep thorough scrolling
      const stepDistance = Math.floor(scrollDistance / scrollSteps);

      for (let step = 0; step < scrollSteps; step++) {
        await page.evaluate((distance) => {
          window.scrollBy({ top: distance, behavior: "smooth" });
        }, stepDistance);
        await sleep(300); // Optimized wait between scroll steps
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
          const finalTweetIds = new Set();
          for (const tweet of finalTweets) {
            try {
              const tweetId = await page.evaluate((el) => {
                const link = el.querySelector('a[href*="/status/"]');
                return link ? link.getAttribute("href") : null;
              }, tweet);
              if (tweetId) finalTweetIds.add(tweetId);
            } catch {}
          }

          console.log(
            `📊 Final check found ${finalTweetIds.size} unique tweets`,
          );

          // Check if our target is in the final set
          if (stopAtTweetId) {
            let foundTarget = false;
            for (const tweetId of finalTweetIds) {
              if (tweetId.includes(stopAtTweetId)) {
                foundTarget = true;
                console.log(`✅ Found target tweet in final check!`);
                break;
              }
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
        console.log(
          `🔍 Performing ULTRA THOROUGH final check for missed tweets...`,
        );
        const additionalAttempts = 15; // Significantly increased for maximum thoroughness

        for (let j = 0; j < additionalAttempts; j++) {
          console.log(`🔍 Final attempt ${j + 1}/${additionalAttempts}...`);

          // Multiple aggressive scrolls with different patterns to trigger any remaining lazy loading
          for (let k = 0; k < 6; k++) {
            await page.evaluate(() => {
              window.scrollBy(0, 300); // Small increments for better coverage
            });
            await sleep(400); // Optimized wait time (still thorough)
          }

          // Wait for content - KEEP THIS LONG for proper fetch (no skips!)
          await sleep(2500); // Proper fetch wait

          const finalCheck = await page.$$('[data-testid="tweet"]');
          console.log(
            `🔍 Final check ${j + 1}: Found ${finalCheck.length} tweets`,
          );

          if (finalCheck.length > currentTweetCount) {
            console.log(`🎉 Found more tweets! Continuing...`);
            currentTweetCount = finalCheck.length; // Update the baseline
            break;
          }

          // Try different scroll patterns more frequently
          if (j % 2 === 1) {
            // Every other attempt instead of every 3rd
            console.log(`🔄 Trying alternative scroll pattern...`);

            // Pattern 1: Scroll to near bottom then back up
            await page.evaluate(() => {
              window.scrollTo({
                top: document.body.scrollHeight - 800,
                behavior: "smooth",
              });
            });
            await sleep(1200); // Optimized
            await page.evaluate(() => {
              window.scrollBy(0, -500); // Scroll up a bit
            });
            await sleep(1000); // Optimized
            await page.evaluate(() => {
              window.scrollBy(0, 1200); // Scroll down more
            });
            await sleep(1000); // Optimized
          }

          // Pattern 2: Aggressive rapid scrolling
          if (j % 3 === 2) {
            console.log(`🔄 Trying aggressive rapid scroll pattern...`);
            for (let rapid = 0; rapid < 8; rapid++) {
              await page.evaluate(() => {
                window.scrollBy(0, 200);
              });
              await sleep(200); // Optimized
            }
            await sleep(1200); // Optimized
          }

          // If this is the last attempt and no new tweets found, do final comprehensive check
          if (
            j === additionalAttempts - 1 &&
            finalCheck.length <= currentTweetCount
          ) {
            console.log(
              `✅ Ultra thorough check completed - no more tweets to load.`,
            );

            // Final comprehensive verification - scan entire page one more time
            console.log(`🔍 Performing FINAL COMPREHENSIVE SCAN...`);
            await page.evaluate(() => {
              window.scrollTo({ top: 0, behavior: "smooth" }); // Go to top
            });
            await sleep(1500); // Optimized final scan

            // Scan all the way to bottom one final time
            const scanTweets = await page.$$('[data-testid="tweet"]');
            console.log(
              `📊 Final scan found ${scanTweets.length} total tweets on page`,
            );

            // Extract all tweet IDs for final verification
            const finalTweetIds = new Set();
            for (const tweet of scanTweets) {
              try {
                const tweetId = await page.evaluate((el) => {
                  const link = el.querySelector('a[href*="/status/"]');
                  return link ? link.getAttribute("href") : null;
                }, tweet);
                if (tweetId) {
                  finalTweetIds.add(tweetId);
                  // Check if this was in our processed list
                  if (!processedTweetIds.has(tweetId)) {
                    console.log(`⚠️ FOUND MISSED TWEET: ${tweetId}`);
                    skippedTweets.push({
                      tweetId,
                      url: `https://x.com${tweetId}`,
                      reason: "Tweet found during final scan but not processed",
                      taskId,
                    });
                  }
                }
              } catch (e) {
                console.log(
                  `Error extracting tweet ID during final scan: ${e.message}`,
                );
              }
            }

            console.log(`📊 Total unique tweets found: ${finalTweetIds.size}`);
            console.log(`📊 Total tweets processed: ${processedTweetIds.size}`);

            if (finalTweetIds.size > processedTweetIds.size) {
              console.log(
                `⚠️ WARNING: ${finalTweetIds.size - processedTweetIds.size} tweets were found but not processed!`,
              );
            }

            // Final check for target tweet
            if (stopAtTweetId) {
              let foundTarget = false;
              for (const tweetId of finalTweetIds) {
                if (tweetId.includes(stopAtTweetId)) {
                  foundTarget = true;
                  console.log(`✅ Found target tweet in final verification!`);
                  break;
                }
              }

              if (!foundTarget) {
                console.log(
                  `⚠️ Target tweet not found even after ultra thorough checking.`,
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

    const result = {
      name: profileName,
      success: true,
      tweetsProcessed: processedTweets,
      task,
      failedLikes,
      failedRetweets,
      failedBookmarks,
      failedComments,
      skippedTweets,
    };

    // Send Telegram completion notification
    if (task) {
      await sendTaskComplete(task, profileName, passNumber, result);
    }

    // Generate comprehensive report
    console.log(`\n📋 ===== COMPREHENSIVE REPORT FOR TASK: ${taskId} =====`);

    const totalFailures =
      failedLikes.length +
      failedRetweets.length +
      failedBookmarks.length +
      failedComments.length +
      skippedTweets.length;

    if (totalFailures > 0) {
      console.log(`⚠️ Total Issues Found: ${totalFailures}`);

      if (failedLikes.length > 0) {
        console.log(`\n❌ FAILED LIKES (${failedLikes.length}):`);
        failedLikes.forEach((fail, idx) => {
          console.log(`   ${idx + 1}. Tweet ID: ${fail.tweetId}`);
          console.log(`      URL: ${fail.url}`);
          console.log(`      Reason: ${fail.reason}`);
          console.log(`      Task ID: ${fail.taskId}`);
        });
      }

      if (failedRetweets.length > 0) {
        console.log(`\n🔁 FAILED RETWEETS (${failedRetweets.length}):`);
        failedRetweets.forEach((fail, idx) => {
          console.log(`   ${idx + 1}. Tweet ID: ${fail.tweetId}`);
          console.log(`      URL: ${fail.url}`);
          console.log(`      Reason: ${fail.reason}`);
          console.log(`      Task ID: ${fail.taskId}`);
        });
      }

      if (failedBookmarks.length > 0) {
        console.log(`\n🔖 FAILED BOOKMARKS (${failedBookmarks.length}):`);
        failedBookmarks.forEach((fail, idx) => {
          console.log(`   ${idx + 1}. Tweet ID: ${fail.tweetId}`);
          console.log(`      URL: ${fail.url}`);
          console.log(`      Reason: ${fail.reason}`);
          console.log(`      Task ID: ${fail.taskId}`);
        });
      }

      if (failedComments.length > 0) {
        console.log(`\n💬 FAILED COMMENTS (${failedComments.length}):`);
        failedComments.forEach((fail, idx) => {
          console.log(`   ${idx + 1}. Tweet ID: ${fail.tweetId}`);
          console.log(`      URL: ${fail.url}`);
          console.log(`      Reason: ${fail.reason}`);
          console.log(`      Task ID: ${fail.taskId}`);
        });
      }

      if (skippedTweets.length > 0) {
        console.log(`\n⏭️ SKIPPED TWEETS (${skippedTweets.length}):`);
        skippedTweets.forEach((fail, idx) => {
          console.log(`   ${idx + 1}. Tweet ID: ${fail.tweetId}`);
          console.log(`      URL: ${fail.url}`);
          console.log(`      Reason: ${fail.reason}`);
          console.log(`      Task ID: ${fail.taskId}`);
        });
      }
    } else {
      console.log(
        `✅ No issues detected - all actions completed successfully!`,
      );
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total tweets processed: ${processedTweets}`);
    console.log(
      `   Successful actions: ${processedTweets * (DO_LIKE ? 1 : 0) + processedTweets * (DO_RETWEET ? 1 : 0) + processedTweets * (DO_BOOKMARK ? 1 : 0)}`,
    );
    console.log(`   Failed likes: ${failedLikes.length}`);
    console.log(`   Failed retweets: ${failedRetweets.length}`);
    console.log(`   Failed bookmarks: ${failedBookmarks.length}`);
    console.log(`   Failed comments: ${failedComments.length}`);
    console.log(`   Skipped tweets: ${skippedTweets.length}`);
    console.log(`\n======================================================\n`);

    // NO recording here - recording happens AFTER second pass only

    return result;
  } catch (err) {
    console.error(`🔥 Error with ${profileName}:`, err.message);

    const errorResult = {
      name: profileName,
      success: false,
      reason: err.message,
      task,
    };

    // Send Telegram error notification
    if (task) {
      await sendTaskComplete(task, profileName, passNumber, errorResult);
    }

    // NO recording on error - only record after successful second pass

    return errorResult;
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
    // CRITICAL FIX: Give Chrome time to fully launch and restore tabs
    console.log(`⏳ Waiting for Chrome to fully launch...`);
    await sleep(2000); // Wait 2 seconds for Chrome to stabilize

    // CRITICAL FIX: Check for X.com tabs with retry mechanism (max 4 retries)
    console.log(`🔍 Checking for restored X.com tabs...`);

    let xTab = null;
    let pages = [];
    let retries = 0;
    const maxRetries = 4; // 4 retries is enough

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
        if (retries < maxRetries) {
          await sleep(1000);
        }
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

      // Get existing pages or create new one
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
        // Navigate new page to X.com
        console.log(`🌐 Navigating new page to X.com...`);
        await page.goto("https://x.com/home", {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
      } catch (newPageError) {
        console.log(`⚠️ Could not create new page: ${newPageError.message}`);
        throw new Error("Cannot get a valid page to work with");
      }
    }

    // CRITICAL: Verify page is still valid before proceeding
    try {
      const currentUrl = page.url();
      console.log(`🔍 Current tab URL: ${currentUrl}`);

      if (currentUrl.includes("x.com") || currentUrl.includes("twitter.com")) {
        console.log(`✅ On X.com tab, ready to proceed!`);
      } else {
        console.log(`⚠️ Not on X.com tab (URL: ${currentUrl}), will navigate...`);
        console.log(`🌐 Navigating to X.com...`);
        await page.goto("https://x.com/home", {
          waitUntil: "networkidle2",
          timeout: 60000,
        });
        console.log(`✅ Successfully navigated to X.com`);
      }
    } catch (urlError) {
      console.log(`⚠️ Could not get page URL: ${urlError.message}`);
      throw new Error("Page is not usable, cannot proceed");
    }

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
    const uniqueAccounts = new Set(TASKS.map((t) => t.id));
    for (const name of uniqueAccounts) {
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
    // Process tasks 2 at a time with available accounts
    console.log(
      "\n⚡ ACTION MODE: Processing tasks 2 at a time with available accounts...\n",
    );
    console.log(`📊 Total tasks: ${TASKS.length}`);
    console.log(
      `👥 Total unique accounts: ${new Set(TASKS.map((t) => t.id)).size}\n`,
    );

    const CONCURRENCY = 2;

    for (let i = 0; i < TASKS.length; i += CONCURRENCY) {
      const batch = TASKS.slice(i, i + CONCURRENCY);
      console.log(
        `\n🔄 Processing task batch ${Math.floor(i / CONCURRENCY) + 1}: ${batch.map((t) => t.name).join(", ")}`,
      );

      // Process first pass for all tasks in batch
      const batchResults = await Promise.all(
        batch.map(async (task, batchIndex) => {
          // Use account field from task
          const accountName = task.account;
          const dir = getProfileDir(accountName);
          const taskIndex = i + batchIndex; // Calculate actual task index

          console.log(`\n🔗 Task → Account: ${accountName}`);

          // Add staggered delay for second task to avoid conflicts
          if (batchIndex === 1) {
            console.log(
              `⏳ Staggering ${accountName} by 3 seconds to avoid conflicts...`,
            );
            await sleep(3000);
          }

          // batchSlot determines position: 0=left, 1=right
          return await processProfile(
            dir,
            accountName,
            taskIndex,
            batchIndex,
            task,
            1, // First pass
          );
        }),
      );

      // If double processing is enabled, run second pass (QC)
      if (DO_DOUBLE_PROCESSING) {
        console.log(
          `\n🔄 Starting SECOND PASS (Quality Control) for batch ${Math.floor(i / CONCURRENCY) + 1}...`,
        );

        const batchResults2 = await Promise.all(
          batch.map(async (task, batchIndex) => {
            const accountName = task.account;
            const dir = getProfileDir(accountName);
            const taskIndex = i + batchIndex;

            console.log(`\n🔗 QC Task → Account: ${accountName}`);

            if (batchIndex === 1) {
              await sleep(3000);
            }

            return await processProfile(
              dir,
              accountName,
              taskIndex,
              batchIndex,
              task,
              2, // Second pass (QC)
            );
          }),
        );

        results.push(
          ...batchResults.map((r, idx) => ({
            ...r,
            mode: "action",
            taskId: batch[idx]?.name,
            task: batch[idx],
            passNumber: 1,
          })),
        );

        results.push(
          ...batchResults2.map((r, idx) => ({
            ...r,
            mode: "action",
            taskId: batch[idx]?.name,
            task: batch[idx],
            passNumber: 2,
          })),
        );
      } else {
        results.push(
          ...batchResults.map((r, idx) => ({
            ...r,
            mode: "action",
            taskId: batch[idx]?.name,
            task: batch[idx],
            passNumber: 1,
          })),
        );
      }

      console.log(
        `\n✅ Batch complete: ${batch.map((t) => t.name).join(", ")}`,
      );
    }
  }

  rl.close();

  // Send final summary to Telegram
  await sendFinalSummary(results);

  console.log("\n================== GLOBAL SUMMARY ==================");

  let totalTweetsProcessed = 0;
  let totalFailedLikes = 0;
  let totalFailedRetweets = 0;
  let totalFailedBookmarks = 0;
  let totalFailedComments = 0;
  let totalSkipped = 0;

  for (const r of results) {
    if (r.success) {
      console.log(
        `✅ Task "${r.taskId}" (Account: ${r.name}) — Success${r.tweetsProcessed ? ` - ${r.tweetsProcessed} tweets processed` : ""} | Actions: ${r.task?.actions?.join(", ") || "N/A"}`,
      );

      // Track totals
      totalTweetsProcessed += r.tweetsProcessed || 0;
      totalFailedLikes += r.failedLikes?.length || 0;
      totalFailedRetweets += r.failedRetweets?.length || 0;
      totalFailedBookmarks += r.failedBookmarks?.length || 0;
      totalFailedComments += r.failedComments?.length || 0;
      totalSkipped += r.skippedTweets?.length || 0;

      // Show individual task failures if any
      if (
        r.failedLikes?.length > 0 ||
        r.failedRetweets?.length > 0 ||
        r.failedBookmarks?.length > 0 ||
        r.failedComments?.length > 0 ||
        r.skippedTweets?.length > 0
      ) {
        console.log(`   ⚠️ Issues with this task:`);

        if (r.failedLikes?.length > 0) {
          console.log(`      ❌ Failed Likes: ${r.failedLikes.length}`);
          r.failedLikes.forEach((fail) => {
            console.log(
              `         - Tweet ID: ${fail.tweetId} | URL: ${fail.url} | Reason: ${fail.reason}`,
            );
          });
        }

        if (r.failedRetweets?.length > 0) {
          console.log(`      🔁 Failed Retweets: ${r.failedRetweets.length}`);
          r.failedRetweets.forEach((fail) => {
            console.log(
              `         - Tweet ID: ${fail.tweetId} | URL: ${fail.url} | Reason: ${fail.reason}`,
            );
          });
        }

        if (r.failedBookmarks?.length > 0) {
          console.log(`      🔖 Failed Bookmarks: ${r.failedBookmarks.length}`);
          r.failedBookmarks.forEach((fail) => {
            console.log(
              `         - Tweet ID: ${fail.tweetId} | URL: ${fail.url} | Reason: ${fail.reason}`,
            );
          });
        }

        if (r.failedComments?.length > 0) {
          console.log(`      💬 Failed Comments: ${r.failedComments.length}`);
          r.failedComments.forEach((fail) => {
            console.log(
              `         - Tweet ID: ${fail.tweetId} | URL: ${fail.url} | Reason: ${fail.reason}`,
            );
          });
        }

        if (r.skippedTweets?.length > 0) {
          console.log(`      ⏭️ Skipped Tweets: ${r.skippedTweets.length}`);
          r.skippedTweets.forEach((fail) => {
            console.log(
              `         - Tweet ID: ${fail.tweetId} | URL: ${fail.url} | Reason: ${fail.reason}`,
            );
          });
        }
      }
    } else {
      console.log(
        `⚠️ Task "${r.taskId}" (Account: ${r.name}) — Failed: ${r.reason || ""}`,
      );
    }
  }

  // Global totals
  console.log(`\n📊 GLOBAL TOTALS:`);
  console.log(`   Total tweets processed: ${totalTweetsProcessed}`);
  console.log(`   Total failed likes: ${totalFailedLikes}`);
  console.log(`   Total failed retweets: ${totalFailedRetweets}`);
  console.log(`   Total failed bookmarks: ${totalFailedBookmarks}`);
  console.log(`   Total failed comments: ${totalFailedComments}`);
  console.log(`   Total skipped tweets: ${totalSkipped}`);

  const totalIssues =
    totalFailedLikes +
    totalFailedRetweets +
    totalFailedBookmarks +
    totalFailedComments +
    totalSkipped;
  if (totalIssues > 0) {
    console.log(`   ⚠️ TOTAL ISSUES: ${totalIssues}`);
  } else {
    console.log(`   ✅ NO ISSUES - All tasks completed successfully!`);
  }

  console.log("=============================================\n");
})();
