import TelegramBot from "node-telegram-bot-api";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================== CONFIGURATION ==================
const TELEGRAM_BOT_TOKEN = "8995659907:AAFXgYbwuAkwoPG7rWYTX_7JoqUZwO53oXY";
const AUTHORIZED_CHAT_IDS = ["1991164194", "1956483216"];
const CONFIG_FILE = path.join(__dirname, "telesix-config.json");

// ================== DEFAULT CONFIGURATION ==================
// These defaults are used when config file doesn't exist or values are missing
const DEFAULT_CONFIG = {
  stopUrl: "https://x.com/am1rax/status/2070511474037203135?s=20",
  repeat: 2,
  actions: {
    like: true,
    bookmark: false,
    retweet: false,
    comment: false,
  },
};

// Helper function to extract profile URL from stop URL
function extractProfileUrl(stopUrl) {
  if (!stopUrl) return DEFAULT_CONFIG.stopUrl?.split("/status")[0] || "https://x.com/am1rax";

  try {
    const url = new URL(stopUrl);
    const pathParts = url.pathname.split("/");
    const username = pathParts[1]; // Get username from /username/status/123
    return `${url.protocol}//${url.host}/${username}`;
  } catch (error) {
    console.log("⚠️ Could not extract profile from stop URL:", error.message);
    return "https://x.com/am1rax";
  }
}

// ================== STATE MANAGEMENT ==================
let currentProcess = null;
let currentConfig = { ...DEFAULT_CONFIG };

// User conversation states
let userStates = {};

// ================== CONFIG FILE FUNCTIONS ==================
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      const loadedConfig = JSON.parse(data);

      // Merge with defaults to ensure all properties exist
      currentConfig = {
        stopUrl: loadedConfig.stopUrl || DEFAULT_CONFIG.stopUrl,
        repeat: loadedConfig.repeat !== undefined ? loadedConfig.repeat : DEFAULT_CONFIG.repeat,
        actions: {
          like: loadedConfig.actions?.like !== undefined ? loadedConfig.actions.like : DEFAULT_CONFIG.actions.like,
          bookmark: loadedConfig.actions?.bookmark !== undefined ? loadedConfig.actions.bookmark : DEFAULT_CONFIG.actions.bookmark,
          retweet: loadedConfig.actions?.retweet !== undefined ? loadedConfig.actions.retweet : DEFAULT_CONFIG.actions.retweet,
          comment: loadedConfig.actions?.comment !== undefined ? loadedConfig.actions.comment : DEFAULT_CONFIG.actions.comment,
        },
      };

      console.log("✅ Config loaded from file:", currentConfig);
    } catch (error) {
      console.log("⚠️ Could not load config file, using defaults");
      currentConfig = { ...DEFAULT_CONFIG };
    }
  } else {
    saveConfig(); // Create new config file with defaults
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
    console.log("✅ Config saved:", currentConfig);
  } catch (error) {
    console.error("❌ Could not save config:", error.message);
  }
}

// ================== TELEGRAM BOT SETUP ==================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Check authorization
function isAuthorized(chatId) {
  return AUTHORIZED_CHAT_IDS.includes(chatId.toString());
}

// Format current configuration for display
function formatConfig() {
  const actionIcons = {
    like: "❤️",
    bookmark: "🔖",
    retweet: "🔁",
    comment: "✍️",
  };

  const enabledActions = Object.entries(currentConfig.actions)
    .filter(([_, enabled]) => enabled)
    .map(([action, _]) => `${actionIcons[action]} ${action}`)
    .join(", ") || "None";

  const profileUrl = extractProfileUrl(currentConfig.stopUrl);

  return `📋 *Current Configuration*
━━━━━━━━━━━━━━━━━━━━━━━

👤 *Profile:* \`${profileUrl}\`

🛑 *Stop Tweet:* \`${currentConfig.stopUrl || "Disabled (unlimited)"}\`

🔁 *Repeat:* \`${currentConfig.repeat} time(s)\`

🎯 *Actions:* ${enabledActions}

━━━━━━━━━━━━━━━━━━━━━━━`;
}

// Format status message
function formatStatus() {
  const status = currentProcess ? "🟢 *Running*" : "🔴 *Stopped*";
  const pid = currentProcess ? currentProcess.pid : "N/A";
  const uptime = currentProcess ?
    `${Math.floor((Date.now() - currentProcess.startTime) / 1000)}s` :
    "N/A";

  return `${status}
━━━━━━━━━━━━━━━━━━━━━━━

📋 *Profile:* ${currentConfig.profile}
🎯 *Repeat:* ${currentConfig.repeat} time(s)
🆔 *Process ID:* ${pid}
⏱️ *Uptime:* ${uptime}

━━━━━━━━━━━━━━━━━━━━━━━`;
}

// ================== PROCESS MANAGEMENT ==================
function startTelesix() {
  // Check if process is actually running
  if (currentProcess && !currentProcess.killed) {
    return {
      success: false,
      message: "⚠️ Already running! Use /restart to restart.",
    };
  }

  try {
    console.log(`🚀 Starting telesix.js with config:`, currentConfig);

    const profileUrl = extractProfileUrl(currentConfig.stopUrl);

    const args = [
      "telesix.js",
      "--profile",
      profileUrl,
      "--repeat",
      currentConfig.repeat.toString(),
    ];

    // Add optional parameters if configured
    if (currentConfig.stopUrl) {
      args.push("--stop-url", currentConfig.stopUrl);
    }

    // Convert actions to command line format
    const actionFlags = [];
    if (currentConfig.actions.like) actionFlags.push("--like");
    if (currentConfig.actions.bookmark) actionFlags.push("--bookmark");
    if (currentConfig.actions.retweet) actionFlags.push("--retweet");
    if (currentConfig.actions.comment) actionFlags.push("--comment");
    args.push(...actionFlags);

    currentProcess = spawn("node", args, {
      cwd: __dirname,
      stdio: "inherit",
      shell: false, // Changed to false for better process control
      detached: false, // Don't create a new process group
    });

    currentProcess.startTime = Date.now();
    currentProcess.killed = false;

    currentProcess.on("close", (code) => {
      console.log(`📝 Process exited with code ${code}`);
      if (currentProcess) {
        currentProcess.killed = true;
        currentProcess = null;
      }
      broadcastMessage(`🔴 Process stopped (exit code: ${code})`);
    });

    currentProcess.on("error", (error) => {
      console.error("❌ Process error:", error);
      if (currentProcess) {
        currentProcess.killed = true;
        currentProcess = null;
      }
      broadcastMessage(`❌ Process error: ${error.message}`);
    });

    currentProcess.on("exit", (code, signal) => {
      console.log(`📝 Process exit - code: ${code}, signal: ${signal}`);
      if (currentProcess) {
        currentProcess.killed = true;
        currentProcess = null;
      }
    });

    return {
      success: true,
      message: `✅ Started successfully!\n\n${formatStatus()}`,
    };
  } catch (error) {
    currentProcess = null;
    return {
      success: false,
      message: `❌ Failed to start: ${error.message}`,
    };
  }
}

function stopTelesix() {
  if (!currentProcess) {
    return {
      success: false,
      message: "⚠️ Not running!",
    };
  }

  try {
    const pid = currentProcess.pid;
    console.log(`🛑 Attempting to stop process ${pid}...`);

    // Kill the Node process first
    try {
      currentProcess.kill("SIGTERM");
      console.log("✅ SIGTERM sent to Node process");
    } catch (e) {
      console.log("⚠️ SIGTERM failed:", e.message);
    }

    try {
      currentProcess.kill("SIGINT");
      console.log("✅ SIGINT sent to Node process");
    } catch (e) {
      console.log("⚠️ SIGINT failed:", e.message);
    }

    // Force kill the Node process on Windows
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        console.log("✅ Node process force killed via taskkill");
      } catch (e) {
        console.log("⚠️ taskkill on Node failed:", e.message);
      }

      // Kill all Chrome processes (Puppeteer browsers)
      console.log("🔨 Killing all Chrome processes...");
      try {
        // Kill all chrome.exe processes
        execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" });
        console.log("✅ All Chrome processes killed");
      } catch (e) {
        console.log("⚠️ No Chrome processes to kill");
      }
    } else {
      // Unix-like systems - kill by process group
      try {
        execSync(`pkill -P ${pid}`, { stdio: "ignore" });
        console.log("✅ Killed child processes");
      } catch (e) {
        console.log("⚠️ pkill failed:", e.message);
      }

      // Also kill Chrome on Unix
      try {
        execSync("pkill chrome", { stdio: "ignore" });
        console.log("✅ Chrome processes killed on Unix");
      } catch (e) {
        console.log("⚠️ No Chrome processes on Unix");
      }
    }

    // Mark as killed and clear reference
    currentProcess.killed = true;
    currentProcess = null;

    console.log("✅ All processes killed successfully");

    return {
      success: true,
      message: `✅ *All processes stopped!*\n\n🔴 Killed Node process (PID: ${pid})\n🔴 Killed all Chrome browsers\n\n✨ Everything is completely stopped!`,
    };
  } catch (error) {
    console.error("❌ Stop error:", error);
    return {
      success: false,
      message: `❌ Failed to stop: ${error.message}`,
    };
  }
}

function restartTelesix() {
  const stopResult = stopTelesix();

  // Wait a moment before starting to ensure cleanup
  setTimeout(() => {
    // Force clear any lingering process reference
    if (currentProcess) {
      console.log("🧹 Cleaning up lingering process reference...");
      currentProcess.killed = true;
      currentProcess = null;
    }

    // Extra cleanup: kill any remaining Chrome processes
    if (process.platform === "win32") {
      try {
        execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" });
        console.log("🧹 Extra Chrome cleanup completed");
      } catch (e) {
        console.log("ℹ️ No Chrome processes to clean up");
      }
    }

    const startResult = startTelesix();
    broadcastMessage(`🔄 Restart result:\n${startResult.message}`);
  }, 3000);

  return {
    success: true,
    message: `🔄 Restarting...\n\n${stopResult.message}\n\n⏳ Waiting 3 seconds before start...`,
  };
}

// Broadcast message to all authorized users
function broadcastMessage(message) {
  for (const chatId of AUTHORIZED_CHAT_IDS) {
    bot.sendMessage(chatId, message, { parse_mode: "Markdown" }).catch((error) => {
      console.error(`❌ Could not send to ${chatId}:`, error.message);
    });
  }
}

// ================== COMMAND HANDLERS ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  // Clear any existing state for this user
  delete userStates[chatId];

  await bot.sendMessage(
    chatId,
    `🤖 *Telesix Controller*

━━━━━━━━━━━━━━━━━━━━━━━

${formatStatus()}

*Authorized Users:* ${AUTHORIZED_CHAT_IDS.length}

👤 *Chat IDs:* ${AUTHORIZED_CHAT_IDS.join(", ")}

━━━━━━━━━━━━━━━━━━━━━━━`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚡ Begin", callback_data: "cmd_begin" },
            { text: "⏹️ Stop", callback_data: "cmd_stop" },
          ],
          [
            { text: "🔄 Restart", callback_data: "cmd_restart" },
            { text: "⚙️ Config", callback_data: "cmd_config" },
          ],
          [
            { text: "📊 Status", callback_data: "cmd_status" },
            { text: "❓ Help", callback_data: "cmd_help" },
          ],
        ],
      },
    }
  );
});

// /begin - Actually start the automation
bot.onText(/\/begin/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  const result = startTelesix();
  await bot.sendMessage(chatId, result.message, { parse_mode: "Markdown" });
});

bot.onText(/\/stop/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  const result = stopTelesix();
  await bot.sendMessage(chatId, result.message, { parse_mode: "Markdown" });
});

bot.onText(/\/restart/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  const result = restartTelesix();
  await bot.sendMessage(chatId, result.message, { parse_mode: "Markdown" });
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  await bot.sendMessage(chatId, formatStatus(), { parse_mode: "Markdown" });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  await bot.sendMessage(
    chatId,
    `🤖 *Telesix Controller Help*

━━━━━━━━━━━━━━━━━━━━━━━

*Commands:*
⚡ /begin - Start automation with current config
⏹️ /stop - Stop automation immediately
🔄 /restart - Stop and restart automation
⚙️ /config - Open interactive configuration menu
📊 /status - Show current running status
❓ /help - Show this help message

━━━━━━━━━━━━━━━━━━━━━━━

*How to Use:*
1. Use /config to check/change settings
2. Use /begin to start automation
3. Use /stop when done

━━━━━━━━━━━━━━━━━━━━━━━

*Configuration:*
Use /config to interactively edit:
• Profile URL
• Repeat count
• Stop URL (optional)
• Max tweets limit (optional)
• Enable/disable actions

━━━━━━━━━━━━━━━━━━━━━━━

*Default Configuration:*
If you don't change anything, uses:
• Profile: ${DEFAULT_CONFIG.profile}
• Repeat: ${DEFAULT_CONFIG.repeat}x
• Stop URL: ${DEFAULT_CONFIG.stopUrl}
• Actions: Like only

━━━━━━━━━━━━━━━━━━━━━━━`,
    { parse_mode: "Markdown" }
  );
});

// ================== CONFIGURATION MENU ==================
bot.onText(/\/config/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "❌ You are not authorized to use this bot.");
    return;
  }

  // Clear any existing state
  delete userStates[chatId];

  await bot.sendMessage(
    chatId,
    `⚙️ *Configuration Menu*

${formatConfig()}

📝 *Tap a button to edit that setting:*

*Note:* Profile URL is automatically extracted from the target tweet URL.`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎯 Edit Target Tweet", callback_data: "edit_stop_url" }],
          [{ text: "🔁 Edit Repeat Count", callback_data: "edit_repeat" }],
          [{ text: "🎯 Edit Actions", callback_data: "edit_actions" }],
          [{ text: "💾 Save & Apply Config", callback_data: "save_config" }],
          [{ text: "🔄 Reset to Defaults", callback_data: "reset_defaults" }],
          [{ text: "❌ Close Menu", callback_data: "close_menu" }],
        ],
      },
    }
  );
});

// ================== CALLBACK QUERY HANDLER ==================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  try {
    if (!isAuthorized(chatId)) {
      await bot.answerCallbackQuery(query.id, { text: "❌ Not authorized" });
      return;
    }

    // Handle different menu actions
    switch (data) {
      // Main menu commands
      case "cmd_begin":
        await bot.answerCallbackQuery(query.id);
        const beginResult = startTelesix();
        await bot.editMessageText(
          beginResult.message,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "cmd_stop":
        await bot.answerCallbackQuery(query.id);
        const stopResult = stopTelesix();
        await bot.editMessageText(
          stopResult.message,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "cmd_restart":
        await bot.answerCallbackQuery(query.id);
        const restartResult = restartTelesix();
        await bot.editMessageText(
          restartResult.message,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "cmd_config":
        await bot.answerCallbackQuery(query.id);
        delete userStates[chatId];
        await bot.editMessageText(
          `⚙️ *Configuration Menu*\n\n${formatConfig()}\n\n📝 *Tap a button to edit that setting:*`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎯 Edit Target Tweet", callback_data: "edit_stop_url" }],
                [{ text: "🔁 Edit Repeat Count", callback_data: "edit_repeat" }],
                [{ text: "🎯 Edit Actions", callback_data: "edit_actions" }],
                [{ text: "💾 Save & Apply Config", callback_data: "save_config" }],
                [{ text: "🔄 Reset to Defaults", callback_data: "reset_defaults" }],
                [{ text: "❌ Close Menu", callback_data: "close_menu" }],
              ],
            },
          }
        );
        break;

      case "cmd_status":
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageText(
          formatStatus(),
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "cmd_help":
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageText(
          `🤖 *Telesix Controller Help*

━━━━━━━━━━━━━━━━━━━━━━━

*Commands:*
⚡ /begin - Start automation with current config
⏹️ /stop - Stop automation immediately
🔄 /restart - Stop and restart automation
⚙️ /config - Open interactive configuration menu
📊 /status - Show current running status
❓ /help - Show this help message

━━━━━━━━━━━━━━━━━━━━━━━

*How to Use:*
1. Use /config to check/change settings
2. Use /begin to start automation
3. Use /stop when done

━━━━━━━━━━━━━━━━━━━━━━━

*Configuration:*
Use /config to interactively edit:
• Target Tweet URL (profile extracted automatically)
• Repeat count
• Enable/disable actions

━━━━━━━━━━━━━━━━━━━━━━━

*Default Configuration:*
• Target Tweet: ${DEFAULT_CONFIG.stopUrl}
• Repeat: ${DEFAULT_CONFIG.repeat}x
• Actions: Like only

━━━━━━━━━━━━━━━━━━━━━━━

*Authorized Users:* ${AUTHORIZED_CHAT_IDS.length}

👤 *Chat IDs:* ${AUTHORIZED_CHAT_IDS.join(", ")}

━━━━━━━━━━━━━━━━━━━━━━━`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "edit_repeat":
        await bot.answerCallbackQuery(query.id);
        userStates[chatId] = { step: "waiting_repeat" };
        await bot.editMessageText(
          `📝 *Edit Repeat Count*\n\nPlease send the new repeat count (number):\n\nCurrent: \`${currentConfig.repeat}\`\n\nSend /cancel to stop.`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "edit_stop_url":
        await bot.answerCallbackQuery(query.id);
        userStates[chatId] = { step: "waiting_stop_url" };
        await bot.editMessageText(
          "📝 *Edit Target Tweet*\n\nSend the tweet URL where you want to stop.\n\nProfile will be extracted automatically.\n\nExample: https://x.com/user/status/123456\n\nCurrent: " +
          `\`${currentConfig.stopUrl || "Disabled"}\`\n\nSend /cancel to stop.`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
          }
        );
        break;

      case "edit_actions":
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageText(
          `📝 *Edit Actions*\n\n${formatConfig()}\n\n📝 Toggle actions below:`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: currentConfig.actions.like ? "❤️ ✅ Like" : "❤️ Like",
                    callback_data: "toggle_like"
                  },
                  {
                    text: currentConfig.actions.bookmark ? "🔖 ✅ Bookmark" : "🔖 Bookmark",
                    callback_data: "toggle_bookmark"
                  },
                ],
                [
                  {
                    text: currentConfig.actions.retweet ? "🔁 ✅ Retweet" : "🔁 Retweet",
                    callback_data: "toggle_retweet"
                  },
                  {
                    text: currentConfig.actions.comment ? "✍️ ✅ Comment" : "✍️ Comment",
                    callback_data: "toggle_comment"
                  },
                ],
                [{ text: "💾 Save & Back", callback_data: "save_actions" }],
                [{ text: "❌ Cancel", callback_data: "cancel_actions" }],
              ],
            },
          }
        );
        break;

      case "toggle_like":
        currentConfig.actions.like = !currentConfig.actions.like;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.like ? "❤️ Like enabled" : "❤️ Like disabled"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "toggle_bookmark":
        currentConfig.actions.bookmark = !currentConfig.actions.bookmark;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.bookmark ? "🔖 Bookmark enabled" : "🔖 Bookmark disabled"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "toggle_retweet":
        currentConfig.actions.retweet = !currentConfig.actions.retweet;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.retweet ? "🔁 Retweet enabled" : "🔁 Retweet disabled"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "toggle_comment":
        currentConfig.actions.comment = !currentConfig.actions.comment;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.comment ? "✍️ Comment enabled" : "✍️ Comment disabled"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "save_actions":
        saveConfig();
        await bot.answerCallbackQuery(query.id, { text: "✅ Actions saved!" });
        // Return to main menu
        await bot.editMessageText(
          `⚙️ *Configuration Menu*\n\n${formatConfig()}\n\n💾 *Actions saved successfully!*`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎯 Edit Target Tweet", callback_data: "edit_stop_url" }],
                [{ text: "🔁 Edit Repeat Count", callback_data: "edit_repeat" }],
                [{ text: "🎯 Edit Actions", callback_data: "edit_actions" }],
                [{ text: "💾 Save & Apply Config", callback_data: "save_config" }],
                [{ text: "🔄 Reset to Defaults", callback_data: "reset_defaults" }],
                [{ text: "❌ Close Menu", callback_data: "close_menu" }],
              ],
            },
          }
        );
        delete userStates[chatId];
        break;

      case "cancel_actions":
        await bot.answerCallbackQuery(query.id, { text: "❌ Cancelled" });
        // Return to main menu
        await bot.editMessageText(
          `⚙️ *Configuration Menu*\n\n${formatConfig()}\n\n❌ *Action changes cancelled*`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎯 Edit Target Tweet", callback_data: "edit_stop_url" }],
                [{ text: "🔁 Edit Repeat Count", callback_data: "edit_repeat" }],
                [{ text: "🎯 Edit Actions", callback_data: "edit_actions" }],
                [{ text: "💾 Save & Apply Config", callback_data: "save_config" }],
                [{ text: "🔄 Reset to Defaults", callback_data: "reset_defaults" }],
                [{ text: "❌ Close Menu", callback_data: "close_menu" }],
              ],
            },
          }
        );
        delete userStates[chatId];
        break;

      case "save_config":
        saveConfig();
        await bot.answerCallbackQuery(query.id, { text: "✅ Configuration saved!" });
        await bot.editMessageText(
          `⚙️ *Configuration Menu*\n\n${formatConfig()}\n\n💾 *Configuration saved successfully!*`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⚡ Begin", callback_data: "cmd_begin" },
                  { text: "⏹️ Stop", callback_data: "cmd_stop" },
                ],
                [
                  { text: "🔄 Restart", callback_data: "cmd_restart" },
                  { text: "⚙️ Config", callback_data: "cmd_config" },
                ],
              ],
            },
          }
        );
        delete userStates[chatId];
        break;

      case "reset_defaults":
        currentConfig = { ...DEFAULT_CONFIG };
        saveConfig();
        await bot.answerCallbackQuery(query.id, { text: "🔄 Reset to defaults!" });
        await bot.editMessageText(
          `⚙️ *Configuration Menu*\n\n${formatConfig()}\n\n🔄 *Reset to default values*`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎯 Edit Target Tweet", callback_data: "edit_stop_url" }],
                [{ text: "🔁 Edit Repeat Count", callback_data: "edit_repeat" }],
                [{ text: "🎯 Edit Actions", callback_data: "edit_actions" }],
                [{ text: "💾 Save & Apply Config", callback_data: "save_config" }],
                [{ text: "🔄 Reset to Defaults", callback_data: "reset_defaults" }],
                [{ text: "❌ Close Menu", callback_data: "close_menu" }],
              ],
            },
          }
        );
        break;

      case "close_menu":
        await bot.answerCallbackQuery(query.id, { text: "✅ Menu closed" });
        await bot.editMessageText(
          `✅ *Configuration saved*\n\nUse /config to open configuration again, or /begin to start automation.`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "⚡ Begin", callback_data: "cmd_begin" },
                  { text: "⏹️ Stop", callback_data: "cmd_stop" },
                ],
                [
                  { text: "⚙️ Config", callback_data: "cmd_config" },
                  { text: "📊 Status", callback_data: "cmd_status" },
                ],
              ],
            },
          }
        );
        delete userStates[chatId];
        break;

      default:
        await bot.answerCallbackQuery(query.id, { text: "❌ Unknown action" });
    }
  } catch (error) {
    console.error("❌ Callback query error:", error.message);
    await bot.answerCallbackQuery(query.id, { text: "❌ Error occurred" });
  }
});

// Helper function to update actions menu
async function updateActionsMenu(message, chatId) {
  try {
    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [
          [
            {
              text: currentConfig.actions.like ? "❤️ ✅ Like" : "❤️ Like",
              callback_data: "toggle_like"
            },
            {
              text: currentConfig.actions.bookmark ? "🔖 ✅ Bookmark" : "🔖 Bookmark",
              callback_data: "toggle_bookmark"
            },
          ],
          [
            {
              text: currentConfig.actions.retweet ? "🔁 ✅ Retweet" : "🔁 Retweet",
              callback_data: "toggle_retweet"
            },
            {
              text: currentConfig.actions.comment ? "✍️ ✅ Comment" : "✍️ Comment",
              callback_data: "toggle_comment"
            },
          ],
          [{ text: "💾 Save & Back", callback_data: "save_actions" }],
          [{ text: "❌ Cancel", callback_data: "cancel_actions" }],
        ],
      },
      { chat_id: chatId, message_id: message.message_id }
    );
  } catch (error) {
    console.error("❌ Error updating menu:", error.message);
  }
}

// ================== MESSAGE HANDLER (for text input) ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Skip non-text messages and commands
  if (!text || text.startsWith("/")) return;

  if (!isAuthorized(chatId)) {
    return;
  }

  const state = userStates[chatId];
  if (!state) {
    await bot.sendMessage(
      chatId,
      "❓ Send /config to configure, or /begin to start automation."
    );
    return;
  }

  try {
    switch (state.step) {
      case "waiting_repeat":
        const repeat = parseInt(text);
        if (!isNaN(repeat) && repeat >= 0) {
          currentConfig.repeat = repeat;
          saveConfig();
          delete userStates[chatId];
          await bot.sendMessage(
            chatId,
            `✅ *Repeat count updated!*\n\n🔁 New count: \`${repeat}\`\n\nUse /config to continue configuring.`,
            { parse_mode: "Markdown" }
          );
        } else {
          await bot.sendMessage(
            chatId,
            "❌ Invalid number. Please send a valid number (0 or greater).\n\nSend /cancel to stop."
          );
        }
        break;

      case "waiting_stop_url":
        if (text.toLowerCase() === "none") {
          currentConfig.stopUrl = null;
          saveConfig();
          delete userStates[chatId];
          await bot.sendMessage(
            chatId,
            "✅ *Target tweet disabled!*\n\nWill now scroll indefinitely.\n\nUse /config to continue configuring.",
            { parse_mode: "Markdown" }
          );
        } else if (text.startsWith("http")) {
          currentConfig.stopUrl = text;
          saveConfig();
          delete userStates[chatId];

          const profileUrl = extractProfileUrl(text);
          await bot.sendMessage(
            chatId,
            `✅ *Target tweet updated!*\n\n🛑 Tweet URL: \`${text}\`\n👤 Extracted Profile: \`${profileUrl}\`\n\nUse /config to continue configuring.`,
            { parse_mode: "Markdown" }
          );
        } else {
          await bot.sendMessage(
            chatId,
            "❌ Invalid input. Send a valid URL or \"none\" to disable.\n\nSend /cancel to stop."
          );
        }
        break;

      default:
        delete userStates[chatId];
        await bot.sendMessage(chatId, "❌ Invalid operation. Please use /config to start over.");
    }
  } catch (error) {
    console.error("❌ Message handler error:", error.message);
    await bot.sendMessage(chatId, "❌ Error processing your input. Please try again.");
  }
});

// ================== ERROR HANDLING ==================
bot.on("polling_error", (error) => {
  console.error("❌ Telegram polling error:", error.message);
});

// ================== STARTUP ==================
console.log("🤖 Telesix Controller starting...");
loadConfig();
console.log("✅ Controller ready!");
console.log("📡 Listening for Telegram commands...");

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal} - Shutting down controller...`);

  if (currentProcess) {
    console.log("🛑 Stopping telesix.js...");

    try {
      currentProcess.kill("SIGTERM");
    } catch (e) {
      console.log("⚠️ SIGTERM failed:", e.message);
    }

    try {
      currentProcess.kill("SIGINT");
    } catch (e) {
      console.log("⚠️ SIGINT failed:", e.message);
    }

    // Kill all processes on Windows
    if (process.platform === "win32") {
      try {
        execSync(`taskkill /F /PID ${currentProcess.pid}`, { stdio: "ignore" });
        console.log("✅ Node process killed");
      } catch (e) {
        console.log("⚠️ taskkill failed:", e.message);
      }

      try {
        execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" });
        console.log("✅ All Chrome processes killed");
      } catch (e) {
        console.log("⚠️ No Chrome processes to kill");
      }
    } else {
      // Unix systems
      try {
        execSync(`pkill -P ${currentProcess.pid}`, { stdio: "ignore" });
        console.log("✅ Child processes killed");
      } catch (e) {
        console.log("⚠️ pkill failed:", e.message);
      }

      try {
        execSync("pkill chrome", { stdio: "ignore" });
        console.log("✅ Chrome processes killed");
      } catch (e) {
        console.log("⚠️ No Chrome processes");
      }
    }
  }

  console.log("🛑 Stopping Telegram bot...");
  try {
    bot.stopPolling();
  } catch (e) {
    console.log("⚠️ Error stopping bot:", e.message);
  }

  console.log("✅ Shutdown complete");
  process.exit(0);
}

// Handle multiple shutdown signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));        // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));      // kill command
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));        // Terminal closed

// Windows-specific signals
if (process.platform === "win32") {
  process.on("SIGBREAK", () => gracefulShutdown("SIGBREAK"));  // Windows console break
}

console.log("✅ Controller ready!");
console.log("👤 Authorized users:", AUTHORIZED_CHAT_IDS.join(", "));
console.log("📡 Listening for Telegram commands...");
console.log("\n✨ Bot is ready! Send /start in Telegram to see the menu");