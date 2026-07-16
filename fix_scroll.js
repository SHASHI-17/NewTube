const fs = require('fs');

// Fix for teletwit.js
let teletwit = fs.readFileSync('teletwit.js', 'utf8');
const oldTeletwit = `    await page.goto(TWEET_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await sleepWithJitter(2500, accountIndex);
    await page.evaluate(() => window.scrollBy(0, 300));
    await sleepWithJitter(1000, accountIndex);`;

const newTeletwit = `    await page.goto(TWEET_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await sleepWithJitter(2500, accountIndex);

    // Only scroll if tweet action buttons are not visible in viewport
    const needsScroll = await page.evaluate(() => {
      const retweetBtn = document.querySelector('[data-testid="retweet"]');
      if (!retweetBtn) return true; // Scroll if button not found

      const rect = retweetBtn.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if button is below the visible viewport
      return rect.top > windowHeight || rect.bottom < 0;
    });

    if (needsScroll) {
      await page.evaluate(() => window.scrollBy(0, 300));
      console.log(\`📜 Scrolled to show tweet actions\`);
    }

    await sleepWithJitter(1000, accountIndex);`;

teletwit = teletwit.replace(oldTeletwit, newTeletwit);
fs.writeFileSync('teletwit.js', teletwit);
console.log('✅ Fixed teletwit.js');

// Fix for twit.js
let twit = fs.readFileSync('twit.js', 'utf8');
const oldTwit = `      await page.goto(tweetUrl, { waitUntil: "networkidle2", timeout: 60000 });
      await sleepWithJitter(2500, accountIndex); // Match twit.js exactly
      await page.evaluate(() => window.scrollBy(0, 300));
      await sleepWithJitter(1000, accountIndex); // Match twit.js exactly`;

const newTwit = `      await page.goto(tweetUrl, { waitUntil: "networkidle2", timeout: 60000 });
      await sleepWithJitter(2500, accountIndex); // Match twit.js exactly

      // Only scroll if tweet action buttons are not visible in viewport
      const needsScroll = await page.evaluate(() => {
        const retweetBtn = document.querySelector('[data-testid="retweet"]');
        if (!retweetBtn) return true; // Scroll if button not found

        const rect = retweetBtn.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Check if button is below the visible viewport
        return rect.top > windowHeight || rect.bottom < 0;
      });

      if (needsScroll) {
        await page.evaluate(() => window.scrollBy(0, 300));
        console.log(\`📜 Scrolled to show tweet actions\`);
      }

      await sleepWithJitter(1000, accountIndex); // Match twit.js exactly`;

twit = twit.replace(oldTwit, newTwit);
fs.writeFileSync('twit.js', twit);
console.log('✅ Fixed twit.js');
