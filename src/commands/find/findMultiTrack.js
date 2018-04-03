const findInFolder = require("./folderSearchLib");
const optionsFactory = require("./commonOptions");

const regex = /\(Track [0-9]+\)/gi;

module.exports = {
  regex,
  command: "find-tracks [options]",
  handler: async options => {
    console.log("Searching for multi-track games...");

    await findInFolder({
      regex,
      ...options
    });
  },
  describe: "Find all folders with games that have multiple tracks",
  builder: optionsFactory
};
