const c = require("chalk");
const { outputFile } = require("fs-extra");
const { resolve } = require("path");
const ora = require("ora");

const {
  getFolderCount,
  logFactory,
  findDirectoriesMatching
} = require("../../utils/misc");

async function find({
  regex,
  path: userPath = "./",
  outputFolder,
  print = false,
  isVerbose = false,
  isSilent = false,
  filename = "results.txt"
}) {
  if (!regex) {
    throw new Error("No RegExp was passed to find");
  }

  const log = logFactory(isVerbose, isSilent);

  const path = resolve(userPath);

  const folderCount = await getFolderCount(path);

  log.verbose(`looking in -> ${path}`);
  log.verbose(`Checking ${folderCount} folders`);
  log.verbose(`Using regex pattern -> ${regex}`);

  const spinner = ora("Please wait...").start();

  let stats = {};
  const match = await findDirectoriesMatching({
    path,
    regex,
    spinner,
    onStats: results => (stats = results)
  });

  if (!match.length) {
    spinner.fail("No matching folders we're found");
    return process.exit(1);
  }

  if (print) {
    log.info("\nResults:");
    match.forEach((x, i) => log.info(`[${i + 1}] -> ${x}`));
  }
  spinner.succeed(
    c`Found {green ${match.length}} / {cyan ${
      stats.dirs
    }} matching folders or {green ${stats.match}} / {cyan ${
      stats.search
    }} files`
  );

  if (outputFolder) {
    const outputFilepath = resolve(outputFolder, filename);
    log.info(`Saving to "results.txt" to -> ${outputFilepath}`);
    await outputFile(outputFilepath, match.join("\n"));
  }

  return match;
}

module.exports = find;
