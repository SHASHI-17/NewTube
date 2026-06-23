import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import readline from "readline";

puppeteer.use(StealthPlugin());

// ================== CONFIG ==================
const OUTPUT_FILE = "cookies.json";

// Use your actual Chrome profile path
const CHROME_USER_DATA = "C:\\Users\\HP\\AppData\\Local\\Google\\Chrome\\User Data";

// The profile name (e.g., "Default", "Profile 1", "Profile 2", etc.)
// Check which profile you're using in Chrome
const PROFILE_NAME = "Default"; // Change this if needed

// ================== CLI ==================
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (q) =>
  new Promise((resolve) => {
    rl.question(q, resolve);
  });

// ================== MAIN ==================

(async () => {
  console.log("\n🍪 Cookie Exporter for X/Twitter\n");
  console.log("This script will:");
  console.log("1. Open Chrome with your existing profile");
  console.log("2. Navigate to x.com");
  console.log("3. Extract all cookies");
  console.log("4. Save to cookies.json\n");

  const profile = await askQuestion(
    `Enter Chrome profile name (press Enter for "Default"): `,
  );
  const profileName = profile.trim() || "Default";

  console.log(`\n🚀 Launching Chrome with profile: ${profileName}`);
  console.log("⚠️ Please make sure you're logged into x.com in this profile!\n");

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: CHROME_USER_DATA,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--start-maximized",
      `--profile-directory=${profileName}`,
    ],
  });

  try {
    const page = await browser.newPage();

    await page.goto("https://x.com/home", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("⏳ Waiting for you to confirm you're logged in...\n");

    const loggedIn = await askQuestion(
      "Are you logged in? (y/n): ",
    );

    if (loggedIn.toLowerCase() !== "y") {
      console.log("❌ Please login first, then run this script again.");
      await browser.close();
      process.exit(1);
    }

    // Get all cookies
    const cookies = await page.cookies();

    // Filter for x.com cookies only
    const xCookies = cookies.filter((c) =>
      c.domain.includes("x.com") || c.domain.includes("twitter.com")
    );

    console.log(`\n✅ Found ${xCookies.length} cookies from x.com`);

    // Check for auth cookies
    const hasAuthToken = xCookies.some((c) => c.name === "auth_token");
    const hasCt0 = xCookies.some((c) => c.name === "ct0");

    if (hasAuthToken) console.log("✅ auth_token found!");
    else console.log("⚠️ auth_token NOT found - you may not be logged in");

    if (hasCt0) console.log("✅ ct0 found!");
    else console.log("⚠️ ct0 NOT found");

    // Show important cookies
    console.log("\n📋 Important cookies found:");
    const importantCookies = ["auth_token", "ct0", "twid", "kdt"];
    for (const name of importantCookies) {
      const cookie = xCookies.find((c) => c.name === name);
      if (cookie) {
        const preview = cookie.value.substring(0, 20) + "...";
        console.log(`   ${name}: ${preview}`);
      }
    }

    // Save to file
    const outputPath = path.join(process.cwd(), OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(xCookies, null, 2));

    console.log(`\n✅ Cookies saved to: ${outputPath}`);
    console.log(`\nDone! You can now use twit.js with these cookies.\n`);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await browser.close();
    rl.close();
  }
})();
