const xray = require("x-ray")();

function scrape(url, fields) {
  return new Promise((resolve, reject) => {
    xray(url, fields)((err, result) => {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  });
}

module.exports = scrape;
