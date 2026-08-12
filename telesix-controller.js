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
    const username = pathParts[1];
    return `${url.protocol}//${url.host}/${username}`;
  } catch (error) {
    return "https://x.com/am1rax";
  }
}

// ================== STATE MANAGEMENT ==================
let currentProcess = null;
let currentConfig = { ...DEFAULT_CONFIG };
let userStates = {};

// ================== CONFIG FILE FUNCTIONS ==================
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf8");
      const loadedConfig = JSON.parse(data);

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
    } catch (error) {
      currentConfig = { ...DEFAULT_CONFIG };
    }
  } else {
    saveConfig();
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  } catch (error) {
    console.error("Config save error:", error.message);
  }
}

// ================== TELEGRAM BOT SETUP ==================
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

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

  return `⚙️ *Current Settings*

👤 Profile: \`${profileUrl}\`

🛑 Stop at: \`${currentConfig.stopUrl || "No limit"}\`

🔁 Repeat: \`${currentConfig.repeat}x\`

🎯 Actions: ${enabledActions}`;
}

// Format main menu with status
function getMainMenu() {
  const statusEmoji = currentProcess ? "🟢" : "🔴";
  const statusText = currentProcess ? "Running" : "Stopped";
  const uptime = currentProcess
    ? `${Math.floor((Date.now() - currentProcess.startTime) / 1000)}s`
    : "--";

  return `✨ *Telesix Automation*

${statusEmoji} Status: *${statusText}* | ⏱️ ${uptime}s

${formatConfig()}

💡 *Progress updates appear in notifications*`;
}

// ================== PROCESS MANAGEMENT ==================
function startTelesix() {
  if (currentProcess && !currentProcess.killed) {
    return { success: false, message: "Already running! Use Restart instead." };
  }

  try {
    const profileUrl = extractProfileUrl(currentConfig.stopUrl);

    const args = [
      "telesix.js",
      "--profile",
      profileUrl,
      "--repeat",
      currentConfig.repeat.toString(),
    ];

    if (currentConfig.stopUrl) {
      args.push("--stop-url", currentConfig.stopUrl);
    }

    if (currentConfig.actions.like) args.push("--like");
    if (currentConfig.actions.bookmark) args.push("--bookmark");
    if (currentConfig.actions.retweet) args.push("--retweet");
    if (currentConfig.actions.comment) args.push("--comment");

    currentProcess = spawn("node", args, {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      detached: false,
    });

    currentProcess.startTime = Date.now();
    currentProcess.killed = false;

    // Capture stdout for progress updates
    currentProcess.stdout.on("data", (data) => {
      const output = data.toString();
      parseAndBroadcastProgress(output);
    });

    // Capture stderr for errors
    currentProcess.stderr.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Error") || output.includes("error")) {
        broadcastMessage(`⚠️ Error: ${output.trim()}`);
      }
    });

    currentProcess.on("close", (code) => {
      if (currentProcess) {
        currentProcess.killed = true;
        currentProcess = null;
        broadcastMainMenuUpdate();
        broadcastMessage(`✅ Process completed (exit code: ${code})`);
      }
    });

    currentProcess.on("error", () => {
      if (currentProcess) {
        currentProcess.killed = true;
        currentProcess = null;
        broadcastMainMenuUpdate();
        broadcastMessage(`❌ Process error occurred`);
      }
    });

    return { success: true, message: "Started successfully!" };
  } catch (error) {
    currentProcess = null;
    return { success: false, message: `Failed: ${error.message}` };
  }
}

function stopTelesix() {
  if (!currentProcess) {
    return { success: false, message: "Not running!" };
  }

  try {
    const pid = currentProcess.pid;

    try { currentProcess.kill("SIGTERM"); } catch (e) {}
    try { currentProcess.kill("SIGINT"); } catch (e) {}

    if (process.platform === "win32") {
      try { execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" }); } catch (e) {}
      try { execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" }); } catch (e) {}
    } else {
      try { execSync(`pkill -P ${pid}`, { stdio: "ignore" }); } catch (e) {}
      try { execSync("pkill chrome", { stdio: "ignore" }); } catch (e) {}
    }

    currentProcess.killed = true;
    currentProcess = null;

    return { success: true, message: "Stopped completely!" };
  } catch (error) {
    return { success: false, message: `Failed: ${error.message}` };
  }
}

function restartTelesix() {
  const stopResult = stopTelesix();

  setTimeout(() => {
    if (currentProcess) {
      currentProcess.killed = true;
      currentProcess = null;
    }
    if (process.platform === "win32") {
      try { execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" }); } catch (e) {}
    }
    const startResult = startTelesix();
    broadcastMainMenuUpdate();
  }, 2000);

  return { success: true, message: "Restarting..." };
}

// Broadcast main menu update to all users
function broadcastMainMenuUpdate() {
  for (const chatId of AUTHORIZED_CHAT_IDS) {
    sendMainMenu(chatId);
  }
}

// Broadcast message to all users
function broadcastMessage(message) {
  for (const chatId of AUTHORIZED_CHAT_IDS) {
    bot.sendMessage(chatId, message, { parse_mode: "Markdown" }).catch((error) => {
      console.error(`Broadcast to ${chatId} failed:`, error.message);
    });
  }
}

// Parse progress output and send updates
function parseAndBroadcastProgress(output) {
  const lines = output.split("\n").filter(line => line.trim());

  for (const line of lines) {
    // Individual account success with tweet count
    if (line.includes("— Success") && line.includes("tweets processed")) {
      broadcastMessage(`${line.trim()}`);
    }
    // Batch completion
    else if (line.includes("Batch complete") || line.includes("✅ Batch complete")) {
      broadcastMessage(`${line.trim()}`);
    }
  }
}

// Send main menu with persistent control buttons
async function sendMainMenu(chatId) {
  try {
    await bot.sendMessage(chatId, getMainMenu(), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "▶️ Start", callback_data: "action_start" },
            { text: "⏸️ Stop", callback_data: "action_stop" },
          ],
          [
            { text: "🔄 Restart", callback_data: "action_restart" },
            { text: "⚙️ Settings", callback_data: "menu_settings" },
          ],
          [
            { text: "📊 Refresh", callback_data: "action_refresh" },
            { text: "❓ Help", callback_data: "menu_help" },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Send menu error:", error.message);
  }
}

// ================== COMMAND HANDLERS ==================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "You're not authorized to use this bot.");
    return;
  }

  delete userStates[chatId];
  await sendMainMenu(chatId);
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isAuthorized(chatId)) {
    await bot.sendMessage(chatId, "You're not authorized to use this bot.");
    return;
  }

  await bot.sendMessage(
    chatId,
    `🤖 *Quick Help*

*Controls:*
▶️ Start - Begin automation
⏸️ Stop - Stop automation
🔄 Restart - Stop and start again
⚙️ Settings - Change configuration
📊 Refresh - Update status display

*Configuration:*
Tap Settings to change:
• Target profile/tweet
• Repeat count
• Actions (like, bookmark, etc.)

*Tips:*
• Menu stays updated automatically
• Use Settings to customize everything
• Status updates when process starts/stops`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Back to Main", callback_data: "menu_main" }],
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
      await bot.answerCallbackQuery(query.id, { text: "Not authorized" });
      return;
    }

    // Main control actions
    switch (data) {
      case "action_start":
        const startResult = startTelesix();
        try {
          await bot.editMessageText(getMainMenu(), {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "▶️ Start", callback_data: "action_start" },
                  { text: "⏸️ Stop", callback_data: "action_stop" },
                ],
                [
                  { text: "🔄 Restart", callback_data: "action_restart" },
                  { text: "⚙️ Settings", callback_data: "menu_settings" },
                ],
                [
                  { text: "📊 Refresh", callback_data: "action_refresh" },
                  { text: "❓ Help", callback_data: "menu_help" },
                ],
              ],
            },
          });
        } catch (e) {
          // Message didn't need update, that's fine
        }
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, startResult.message);
        break;

      case "action_stop":
        const stopResult = stopTelesix();
        try {
          await bot.editMessageText(getMainMenu(), {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "▶️ Start", callback_data: "action_start" },
                  { text: "⏸️ Stop", callback_data: "action_stop" },
                ],
                [
                  { text: "🔄 Restart", callback_data: "action_restart" },
                  { text: "⚙️ Settings", callback_data: "menu_settings" },
                ],
                [
                  { text: "📊 Refresh", callback_data: "action_refresh" },
                  { text: "❓ Help", callback_data: "menu_help" },
                ],
              ],
            },
          });
        } catch (e) {
          // Message didn't need update, that's fine
        }
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, stopResult.message);
        break;

      case "action_restart":
        const restartResult = restartTelesix();
        try {
          await bot.editMessageText(getMainMenu(), {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "▶️ Start", callback_data: "action_start" },
                  { text: "⏸️ Stop", callback_data: "action_stop" },
                ],
                [
                  { text: "🔄 Restart", callback_data: "action_restart" },
                  { text: "⚙️ Settings", callback_data: "menu_settings" },
                ],
                [
                  { text: "📊 Refresh", callback_data: "action_refresh" },
                  { text: "❓ Help", callback_data: "menu_help" },
                ],
              ],
            },
          });
        } catch (e) {
          // Message didn't need update, that's fine
        }
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, restartResult.message);
        break;

      case "action_refresh":
        try {
          await bot.editMessageText(getMainMenu(), {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "▶️ Start", callback_data: "action_start" },
                  { text: "⏸️ Stop", callback_data: "action_stop" },
                ],
                [
                  { text: "🔄 Restart", callback_data: "action_restart" },
                  { text: "⚙️ Settings", callback_data: "menu_settings" },
                ],
                [
                  { text: "📊 Refresh", callback_data: "action_refresh" },
                  { text: "❓ Help", callback_data: "menu_help" },
                ],
              ],
            },
          });
        } catch (e) {
          // Message didn't need update, that's fine
        }
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(chatId, getMainMenu());
        break;

      case "menu_main":
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageText(getMainMenu(), {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "▶️ Start", callback_data: "action_start" },
                { text: "⏸️ Stop", callback_data: "action_stop" },
              ],
              [
                { text: "🔄 Restart", callback_data: "action_restart" },
                { text: "⚙️ Settings", callback_data: "menu_settings" },
              ],
              [
                { text: "📊 Refresh", callback_data: "action_refresh" },
                { text: "❓ Help", callback_data: "menu_help" },
              ],
            ],
          },
        });
        break;

      case "menu_settings":
        await bot.answerCallbackQuery(query.id);
        delete userStates[chatId];
        await bot.editMessageText(
          `⚙️ *Settings*\n\n${formatConfig()}\n\nChoose what to edit:`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🎯 Change Target Tweet", callback_data: "edit_stop_url" }],
                [{ text: "🔁 Change Repeat Count", callback_data: "edit_repeat" }],
                [{ text: "✅ Toggle Actions", callback_data: "edit_actions" }],
                [{ text: "🔄 Reset Defaults", callback_data: "reset_defaults" }],
                [{ text: "💾 Save & Back", callback_data: "save_settings" }],
                [{ text: "❌ Cancel", callback_data: "menu_main" }],
              ],
            },
          }
        );
        break;

      case "menu_help":
        await bot.answerCallbackQuery(query.id);
        await bot.editMessageText(
          `🤖 *Quick Help*\n\n*Controls:*\n▶️ Start - Begin automation\n⏸️ Stop - Stop automation  \n🔄 Restart - Stop and start again\n⚙️ Settings - Change configuration\n📊 Refresh - Update status display\n\n*Configuration:*\nTap Settings to change:\n• Target profile/tweet\n• Repeat count\n• Actions (like, bookmark, etc.)\n\n*Tips:*\n• Menu stays updated automatically\n• Use Settings to customize everything\n• Status updates when process starts/stops`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Main", callback_data: "menu_main" }],
              ],
            },
          }
        );
        break;

      case "edit_repeat":
        await bot.answerCallbackQuery(query.id);
        userStates[chatId] = { step: "waiting_repeat" };
        await bot.editMessageText(
          `📝 *New Repeat Count*\n\nCurrent: \`${currentConfig.repeat}\`\n\nSend a number (0 or higher).\nSend /cancel to go back.`,
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
          `📝 *New Target Tweet*\n\nCurrent: \`${currentConfig.stopUrl || "No limit"}\`\n\nSend a tweet URL or "none" for no limit.\nSend /cancel to go back.`,
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
          `✅ *Toggle Actions*\n\n${formatConfig()}\n\nTap to toggle:`,
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
                [{ text: "💾 Save & Back", callback_data: "save_settings" }],
                [{ text: "❌ Cancel", callback_data: "menu_main" }],
              ],
            },
          }
        );
        break;

      case "toggle_like":
        currentConfig.actions.like = !currentConfig.actions.like;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.like ? "❤️ On" : "❤️ Off"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "toggle_bookmark":
        currentConfig.actions.bookmark = !currentConfig.actions.bookmark;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.bookmark ? "🔖 On" : "🔖 Off"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "toggle_retweet":
        currentConfig.actions.retweet = !currentConfig.actions.retweet;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.retweet ? "🔁 On" : "🔁 Off"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "toggle_comment":
        currentConfig.actions.comment = !currentConfig.actions.comment;
        await bot.answerCallbackQuery(query.id, {
          text: currentConfig.actions.comment ? "✍️ On" : "✍️ Off"
        });
        await updateActionsMenu(query.message, chatId);
        break;

      case "save_settings":
        saveConfig();
        await bot.answerCallbackQuery(query.id, { text: "Settings saved!" });
        await bot.editMessageText(getMainMenu(), {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "▶️ Start", callback_data: "action_start" },
                { text: "⏸️ Stop", callback_data: "action_stop" },
              ],
              [
                { text: "🔄 Restart", callback_data: "action_restart" },
                { text: "⚙️ Settings", callback_data: "menu_settings" },
              ],
              [
                { text: "📊 Refresh", callback_data: "action_refresh" },
                { text: "❓ Help", callback_data: "menu_help" },
              ],
            ],
          },
        });
        delete userStates[chatId];
        break;

      case "reset_defaults":
        currentConfig = { ...DEFAULT_CONFIG };
        saveConfig();
        await bot.answerCallbackQuery(query.id, { text: "Reset to defaults!" });
        await bot.editMessageText(getMainMenu(), {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "▶️ Start", callback_data: "action_start" },
                { text: "⏸️ Stop", callback_data: "action_stop" },
              ],
              [
                { text: "🔄 Restart", callback_data: "action_restart" },
                { text: "⚙️ Settings", callback_data: "menu_settings" },
              ],
              [
                { text: "📊 Refresh", callback_data: "action_refresh" },
                { text: "❓ Help", callback_data: "menu_help" },
              ],
            ],
          },
        });
        delete userStates[chatId];
        break;

      default:
        await bot.answerCallbackQuery(query.id, { text: "Unknown action" });
    }
  } catch (error) {
    console.error("Callback error:", error.message);
    await bot.answerCallbackQuery(query.id, { text: "Error occurred" });
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
          [{ text: "💾 Save & Back", callback_data: "save_settings" }],
          [{ text: "❌ Cancel", callback_data: "menu_main" }],
        ],
      },
      { chat_id: chatId, message_id: message.message_id }
    );
  } catch (error) {
    console.error("Update actions error:", error.message);
  }
}

// ================== MESSAGE HANDLER ==================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  if (!isAuthorized(chatId)) {
    return;
  }

  const state = userStates[chatId];
  if (!state) {
    await bot.sendMessage(chatId, "Use the menu buttons or /start");
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
          await bot.sendMessage(chatId, `Repeat set to ${repeat}x`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Main", callback_data: "menu_main" }],
              ],
            },
          });
        } else {
          await bot.sendMessage(chatId, "Send a valid number (0 or higher). /cancel to go back.");
        }
        break;

      case "waiting_stop_url":
        if (text.toLowerCase() === "none") {
          currentConfig.stopUrl = null;
          saveConfig();
          delete userStates[chatId];
          await bot.sendMessage(chatId, "Target tweet removed - no limit set", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Main", callback_data: "menu_main" }],
              ],
            },
          });
        } else if (text.startsWith("http")) {
          currentConfig.stopUrl = text;
          saveConfig();
          delete userStates[chatId];
          const profileUrl = extractProfileUrl(text);
          await bot.sendMessage(chatId, `Target updated!\nProfile: ${profileUrl}`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔙 Back to Main", callback_data: "menu_main" }],
              ],
            },
          });
        } else {
          await bot.sendMessage(chatId, 'Send a URL or "none". /cancel to go back.');
        }
        break;

      default:
        delete userStates[chatId];
        await bot.sendMessage(chatId, "Use /start to begin");
    }
  } catch (error) {
    console.error("Message handler error:", error.message);
    await bot.sendMessage(chatId, "Error processing input");
  }
});

// ================== ERROR HANDLING ==================
bot.on("polling_error", (error) => {
  console.error("Polling error:", error.message);
});

// ================== STARTUP ==================
loadConfig();
console.log("Telesix Controller ready");

// Graceful shutdown
async function gracefulShutdown(signal) {
  if (currentProcess) {
    try { currentProcess.kill("SIGTERM"); } catch (e) {}
    try { currentProcess.kill("SIGINT"); } catch (e) {}

    if (process.platform === "win32") {
      try { execSync(`taskkill /F /PID ${currentProcess.pid}`, { stdio: "ignore" }); } catch (e) {}
      try { execSync("taskkill /F /IM chrome.exe", { stdio: "ignore" }); } catch (e) {}
    } else {
      try { execSync(`pkill -P ${currentProcess.pid}`, { stdio: "ignore" }); } catch (e) {}
      try { execSync("pkill chrome", { stdio: "ignore" }); } catch (e) {}
    }
  }

  try { bot.stopPolling(); } catch (e) {}
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => gracefulShutdown("SIGHUP"));

if (process.platform === "win32") {
  process.on("SIGBREAK", () => gracefulShutdown("SIGBREAK"));
}
