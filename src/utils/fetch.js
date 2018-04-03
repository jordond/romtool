const fetch = require("node-fetch");

async function urlExists(url) {
  const result = await fetch(url);
  return result.status !== 404;
}

module.exports = {
  urlExists
};
