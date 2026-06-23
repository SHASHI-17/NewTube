// ===============================
// exportChromeProfile.js (clone full profile)
// ===============================
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const CHROME_USER_DATA_DIR = path.join(
  os.homedir(),
  "AppData",
  "Local",
  "Google",
  "Chrome",
  "User Data"
);

const DEFAULT_PROFILE_DIR = path.join(CHROME_USER_DATA_DIR, "Default");
const BASE_USER_DATA_DIR = path.join(CHROME_USER_DATA_DIR, "Automation");

const ACCOUNT_NAMES = ["adore", "orange", "bluemoon"];

function isChromeRunning() {
  try {
    const tasks = execSync("tasklist").toString().toLowerCase();
    return tasks.includes("chrome.exe");
  } catch {
    return false;
  }
}

function copyRecursiveSync(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      copyRecursiveSync(srcFile, destFile);
    }
  } else {
    try {
      fs.copyFileSync(src, dest);
    } catch {
      // skip locked files
    }
  }
}

(async () => {
  console.log("🚀 Cloning full Chrome Default profile for X automation...\n");

  if (!fs.existsSync(DEFAULT_PROFILE_DIR)) {
    console.error("❌ Default Chrome profile not found at:");
    console.error(DEFAULT_PROFILE_DIR);
    process.exit(1);
  }

  if (isChromeRunning()) {
    console.error(
      "⚠️ Chrome is still open! Please close ALL Chrome windows before exporting."
    );
    process.exit(1);
  }

  if (!fs.existsSync(BASE_USER_DATA_DIR))
    fs.mkdirSync(BASE_USER_DATA_DIR, { recursive: true });

  for (const name of ACCOUNT_NAMES) {
    const targetDir = path.join(BASE_USER_DATA_DIR, `Account_${name}`);

    console.log(`📂 Copying entire profile to: ${targetDir}`);

    // Remove existing profile (optional)
    if (fs.existsSync(targetDir)) {
      console.log(`🗑️ Removing old profile for ${name}`);
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    copyRecursiveSync(DEFAULT_PROFILE_DIR, targetDir);

    console.log(`✅ Successfully cloned full Chrome profile → ${name}\n`);
  }

  console.log("🎯 All profiles cloned successfully!");
  console.log(
    "👉 Now run your main automation script to reuse these sessions."
  );
})();
