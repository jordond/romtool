const handler = require("./merge.handler");

module.exports = {
  command: "merge [options] [--path]",
  describe: "Merge multi-track roms into a single '.bin' + '.cue'",
  handler,
  builder: yargs =>
    yargs
      .options("path", {
        alias: "p",
        type: "string",
        desc: "Path to search for multi-track roms",
        default: "./"
      })
      .options("exclude", {
        alias: "x",
        type: "RegExp",
        desc: "Pattern to exclude files"
      })
      .options("recursive", {
        alias: "r",
        type: "boolean",
        desc:
          "Recursively look through directories, pass '--no-recursive' to disable",
        default: true
      })
      .options("workers", {
        alias: "w",
        type: "number",
        desc:
          "Number of concurrent merges to do, higher number will speed up the process.  Do so at your computer's expense",
        default: 6
      })
      .options("archive", {
        alias: "a",
        type: "boolean|string",
        desc:
          "Archive the source files instead of deleting, if a string, the 7z's will be moved there"
      })
      .options("archiveWorkers", {
        alias: "W",
        type: "number",
        desc:
          "Number of concurrent 7zip processes to use, WARNING: using too many may cause serious performance problems",
        default: 1
      })
      .options("confirm", {
        default: true,
        type: "boolean",
        desc: "Ask before merging"
      })
      .options("clean", {
        alias: ["d", "delete"],
        default: false,
        type: "boolean",
        desc: "Delete the source files after completion. * CANNOT BE UNDONE"
      })
      .example(
        "$0 merge",
        "Merge all multi-track files in the current directory."
      )
      .example(
        "$0 merge --path /roms/psx --archive /backup/psx",
        "Merge all multi-track files in '/roms/psx' and create a 7z backup in '/backup/psx'."
      )
      .example(
        "$0 merge --no-confirm --clean",
        "Merge files the delete without needing any user input."
      )
      .example(
        "$0 merge --path /roms/psx --clean",
        "Merge all multi-track files in '/roms/psx' and permanently DELETE all of the originals."
      )
};
