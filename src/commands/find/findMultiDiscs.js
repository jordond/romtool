const findInFolder = require("./folderSearchLib");
const optionsFactory = require("./commonOptions");

const REGEX_DISC = /\(Disc [0-9]+\)/g;

module.exports = {
  REGEX_DISC,
  command: "find-discs [options]",
  handler: async options => {
    console.log("Searching for all multi-disc games...");

    await findInFolder({
      regex: REGEX_DISC,
      ...options
    });
  },
  describe: "Find all folders with multiple discs",
  builder: yargs => optionsFactory(yargs)
};
