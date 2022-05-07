require('dotenv').config();

const { getRequest } = require('./lib/request');
const sendLineNotify = require('./lib/sendLineNotify');
const getFirstPostId = require('./lib/getFirstPostId');
const getToken = require('./lib/getToken');

let stopIntervalId;
let countFail = 0;
let lastNotiForConfirm = new Date();
(async () => {
  let originPostId = await getFirstPostId();
  stopIntervalId = setInterval(async () => {
    const now = new Date();
    if ( (now - lastNotiForConfirm) / (1000*60*60*24) > 1 ) {
      lastNotiForConfirm = now;
      sendLineNotify('我還活著', process.env.LINE_NOTIFY_TOKEN);
    }
    console.log(`${now}: '我還活著'`);
    const { csrfToken, cookie } = await getToken(process.env.TARGET_URL);
    const houseListURL = `https://rent.591.com.tw/home/search/rsList?${process.env.TARGET_URL.split('?')[1]}`;
    try {
      const resp = await getRequest({
        url: houseListURL,
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          Cookie: cookie,
        },
        json: true,
      });
      if (resp.statusCode !== 200) {
        const error = new Error(`Token 可能過期了，目前 StatusCode: ${resp.statusCode}`);
        throw error;
      }
      const { data } = resp.body.data;
      const targetData = (data[0].post_id !== originPostId) ? data[0].post_id : originPostId;
      if (targetData === originPostId) return;
      const webUrl = `https://rent.591.com.tw/rent-detail-${targetData}.html`;
      const mobileUrl = `https://house591.page.link/?link=https://m.591.com.tw/v2/rent/${targetData}&apn=com.addcn.android.house591&amv=147&afl=https://www.591.com.tw/home/tools/app/android?id=com.addcn.android.house591&ifl=https://www.591.com.tw/home/tools/app/ios&isi=448156496&ibi=com.Addcn.house591&ipbi=com.Addcn.house591&efr=1`
      const messageContent = process.env.WITH_MOBILE_APP_URL === 'true'
        ? `\n${webUrl}\n\n${mobileUrl}`
        : `\n${webUrl}`;
      await sendLineNotify(messageContent, process.env.LINE_NOTIFY_TOKEN);
      originPostId = targetData;
    } catch (error) {
      if (countFail > 10) {
        await sendLineNotify(`\n好像出事了! 但是我嘗試重新拿 Token 第 ${countFail} 次了所以暫時先把程式關閉，有空可以檢查一下。\n `, process.env.LINE_NOTIFY_TOKEN);
        clearInterval(stopIntervalId);
      }
      console.error(`Fetch the 591 rent fail: ${error}`);
      countFail += 1;
    }
  }, process.env.REQUEST_FREQUENCY);
})();
