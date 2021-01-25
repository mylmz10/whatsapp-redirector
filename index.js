const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "/tmp/myChromeSession",
    args: [
      "--start-maximized", // you can also use '--start-fullscreen'
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto("https://web.whatsapp.com");

  const $chatList = "#pane-side > div > div > div > div";
  let rcTitle = '[title="fromUserTitle"]';
  let $RC;

  const $forwardOpenerButton = '[data-icon="forward"]';
  const $forwardButton = '.overlay .copyable-area [data-icon="send"]';

  let fcTitle = "toUserTitle";
  const $forwardUser = `.overlay .copyable-area > div > div > div > div span[title="${fcTitle}"]`;
  let $FC;

  // HELPERS

  const eventFire = (el, etype) => {
    var evt = document.createEvent("MouseEvents");
    // prettier-ignore
    evt.initMouseEvent(etype, true, true, window,0, 0, 0, 0, 0, false, false, false, false, 0, null);
    el.dispatchEvent(evt);
  };

  function delay(time) {
    return new Promise(function (resolve) {
      setTimeout(resolve, time);
    });
  }

  async function newEvaluate(page, fn, ...rawArgs) {
    const args = await Promise.all(
      rawArgs.map((arg) => {
        return typeof arg === "function"
          ? page.evaluateHandle(`(${arg.toString()})`)
          : arg;
      })
    );
    return page.evaluate(fn, ...args);
  }

  // FUNCTIONS

  const openWhatsApp = async () => {};

  const selectRC = async () => {
    await page.waitForSelector($chatList);

    await page.waitForSelector(rcTitle);

    setInterval(async () => {
      const unReadMessageCount = await newEvaluate(
        page,
        (rcTitle) => {
          const unReadElement = document
            .querySelector(rcTitle)
            .parentNode.parentNode.parentNode.parentNode.querySelector(
              "[aria-label$='unread messages'], [aria-label$='unread message']"
            );

          let unReadCount = -1;

          if (unReadElement) {
            console.log("unReadElement exist");

            if (parseInt(unReadElement.innerText)) {
              console.log(parseInt(unReadElement.innerText));

              unReadCount = parseInt(unReadElement.innerText);
            }
          } else {
            console.log("unReadElement is not exist");
            unReadCount = 0;
          }

          return unReadCount;
        },
        rcTitle
      );

      if (unReadMessageCount > 0) {
        await forwardMessages(unReadMessageCount);
      }
    }, 15000);
  };

  const selectMessages = async () => {};

  const forwardMessages = async (unReadMessageCount) => {
    await newEvaluate(
      page,
      (rcTitle, eventFire) => {
        eventFire(document.querySelector(rcTitle), "mousedown");
      },
      rcTitle,
      eventFire
    );

    await delay(500);

    await page.hover(".message-in:last-child > div");

    await delay(500);

    const selectMessageCount = unReadMessageCount;

    // Select Message
    const messagesSelected = await newEvaluate(
      page,
      async (eventFire, delay, selectMessageCount, $forwardOpenerButton) => {
        const moreActionButton = document.querySelector(
          '.message-in:last-child > div > div > span [data-icon="down-context"]'
        );
        if (moreActionButton) {
          eventFire(moreActionButton, "mousedown");
        } else {
          console.log("moreActionButton not found!");
          return false;
        }

        // Select first message
        document.querySelector('[title="Forward message"]').click();

        await delay(100);

        var incomingMessages = document.querySelectorAll(".message-in");
        var totalMessageCount = incomingMessages.length;

        var start = totalMessageCount - selectMessageCount;

        for (let i = start; i < totalMessageCount - 1; i++) {
          console.log(i);
          console.log(incomingMessages[i]);

          setTimeout(() => {
            eventFire(
              incomingMessages[i].querySelector('[role="checkbox"]'),
              "click"
            );
          }, i * 50);
        }

        await delay(2000);

        document.querySelector($forwardOpenerButton).click();

        return true;
      },
      eventFire,
      delay,
      selectMessageCount,
      $forwardOpenerButton
    );

    if (!messagesSelected) {
      return;
    }

    await page.keyboard.type(fcTitle);
    await page.waitForTimeout(100);

    // Select forwarding Message
    await newEvaluate(
      page,
      ($forwardUser) => {
        document.querySelector($forwardUser).click();
      },
      $forwardUser
    );

    // Forward Messages to user
    await newEvaluate(
      page,
      ($forwardButton) => {
        document.querySelector($forwardButton).click();
      },
      $forwardButton
    );
  };

  // Do it

  await selectRC();
})();
