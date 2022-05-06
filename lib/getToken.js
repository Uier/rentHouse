const { getRequest } = require('./request');

module.exports = async (targetUrl) => {
  const regExp = new RegExp('<meta name="csrf-token" content="([A-Za-z0-9]*)">', 'gi');
  const response = await getRequest({
    url: targetUrl,
    json: true,
  });
  const csrfToken = regExp.exec(response.body)[1];
  const cookie = response.headers['set-cookie'].find((data) => data.includes('591_new_session'));
  return { csrfToken, cookie: `${cookie};urlJumpIp=4;urlJumpIpByTxt=%E6%96%B0%E7%AB%B9%E5%B8%82;` };
};
