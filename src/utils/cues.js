const c = require("chalk");
const Promise = require("bluebird");
const { basename, dirname } = require("path");
const { prompt } = require("inquirer");

const { regex: REGEX_TRACKS } = require("../commands/find/findMultiTrack");
const {
  findDirectoriesMatching,
  findFilesMatching,
  regexFromExtension,
  flatten,
  filterValidCues,
  isFunction
} = require("./misc");

const CUE_REGEX = regexFromExtension(".cue");

async function findCues({
  folderRegex,
  excludeFolderRegex,
  findFilesExcludeRegex,
  spinner,
  depthLimit = 3,
  startingPath,
  spinnerMessage,
  isVerbose,
  confirm,
  log
}) {
  let stats = {};
  const matched = await findDirectoriesMatching({
    regex: folderRegex,
    spinner,
    depthLimit,
    exclude: excludeFolderRegex,
    path: startingPath,
    onStats: results => (stats = results)
  });

  if (!matched.length) {
    spinner.fail("No matching folders we're found");
    return process.exit(1);
  }

  spinnerMessage(
    c`Found {green ${matched.length}} / {cyan ${
      stats.dirs
    }} matching folders or {green ${stats.match}} / {cyan ${
      stats.search
    }} files`
  );

  // For each folder, get each .cue file
  spinner.start("gathering all of the .cue sheets...");
  const foundCues = flatten(
    await Promise.all(
      matched.map(matchedPath =>
        findFilesMatching({
          path: matchedPath,
          regex: CUE_REGEX,
          spinner,
          depthLimit: 1,
          exclude: findFilesExcludeRegex
        })
      )
    )
  );

  spinnerMessage(c`validating the {cyan cues}...`);

  // Handles the case where a folder may contain multiple discs, some that have already been merged
  const validCues = await filterValidCues(
    REGEX_TRACKS,
    foundCues,
    spinnerMessage,
    isVerbose
  );

  if (validCues.length === 0) {
    log.info("\nNo valid cue files were found...");
    process.exit(1);
  }

  isVerbose &&
    spinnerMessage("here are the matching cue files I found", "✔") &&
    validCues.forEach(x => spinnerMessage(`-> ${basename(x)}`));

  spinner.succeed(`found ${validCues.length} cue files`);

  // ask which cue files to merge or skip
  let cuesToUse = validCues;
  if (confirm) {
    const result = await prompt({
      type: "checkbox",
      name: "selected",
      message: "select which files to merge",
      default: [],
      choices: validCues.map(x => ({ name: basename(x), checked: true }))
    });

    cuesToUse = cuesToUse.filter(x => result.selected.includes(basename(x)));

    if (cuesToUse.length === 0) {
      spinner.fail("No cue files were selected... exiting");
      return process.exit(0);
    }
  }

  return cuesToUse;
}

function findSourceFiles({
  folders,
  searchReg,
  excludeReg,
  spinner,
  onModifyFolder
}) {
  if (!folders || !folders.length) {
    throw new Error("No folders were passed to 'findSourceFiles'");
  }

  const foldersToSearch = Array.isArray(folders) ? folders : [folders];
  return Promise.all(
    foldersToSearch.map(async item => {
      const folder = onModifyFolder ? onModifyFolder(item) : item;
      return {
        folder,
        files: [
          item,
          ...(await findFilesMatching({
            regex: isFunction(searchReg) ? searchReg(item) : searchReg,
            spinner,
            path: folder,
            exclude: excludeReg
          }))
        ]
      };
    })
  );
}

module.exports = { findCues, findSourceFiles };
