const handler = require("./playlist.handler");

// TODO - Revert the playlist renaming and cue editing

module.exports = {
  command: "playlist [options] [--path]",
  describe: "Create a '.m3u' playlist for multi-disc games",
  handler,
  builder: yargs =>
    yargs
      .options("path", {
        alias: "p",
        type: "string",
        desc: "Path to search for multi-track roms",
        default: "./"
      })
      .options("revert", {
        alias: "r",
        type: "Boolean",
        desc:
          "Revert the playlist creation, ie delete m3u and rename files to original"
      })
      .options("exclude", {
        alias: "x",
        type: "RegExp",
        desc: "Pattern to exclude files"
      })
      .options("confirm", {
        default: true,
        type: "boolean",
        desc: "Select which files to use"
      })
};
