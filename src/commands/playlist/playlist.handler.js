const Promise = require("bluebird");
const c = require("chalk");
const { prompt } = require("inquirer");
const { resolve, basename, join, extname } = require("path");
const { rename, outputFile, remove } = require("fs-extra");
const ora = require("ora");

const { regex: REGEX_TRACKS } = require("../find/findMultiTrack");
const { REGEX_DISC } = require("../find/findMultiDiscs");
const {
  getCLIName,
  logFactory,
  escapeRegExp,
  findDirectoriesMatching,
  clock,
  flatten
} = require("../../utils/misc");
const { findSourceFiles } = require("../../utils/cues");
const { readDirForFiles } = require("../../utils/filesystem");

const ORIGINAL_FOLDER = `${getCLIName()}-original`;
const REGEX_MOVED_FOLDER = new RegExp(escapeRegExp(ORIGINAL_FOLDER), "i");

let log;
let spinner;
let isVerbose;

function spinnerMessage(
  text,
  startMsg = "please wait...",
  symbol = c`{cyan ℹ}`
) {
  spinner.stopAndPersist({ text: c`${text}`, symbol });
  spinner.start(c`${startMsg}`);
}

async function handler({ path, exclude, confirm, verbose, revert }) {
  isVerbose = verbose;
  log = logFactory(verbose);
  log.info(c`{blue playlist} generator`);

  const startingPath = resolve(path);

  const discCueRegex = new RegExp(`${REGEX_DISC.source}.*\\.cue`);
  const searchRegex = revert ? /\.m3u|\.CD[0-9]/i : discCueRegex;
  const userExcludeReg = exclude
    ? new RegExp(escapeRegExp(exclude), "i")
    : undefined;

  let excludeReg = revert
    ? REGEX_TRACKS
    : new RegExp(`${REGEX_TRACKS.source}|\\.m3u`);

  if (userExcludeReg) {
    excludeReg = new RegExp(`${excludeReg.source}|${userExcludeReg.source}`);
  }

  log.info(c`searching -> {magenta ${startingPath}}`);
  revert && log.info(c`{cyan revert} mode is enabled...`);
  log.verbose(
    c`using the search pattern -> {green ${searchRegex}}, excluding -> {cyan ${excludeReg ||
      "none"}}`
  );

  spinner = ora("please wait...").start();

  let stats = {};
  const matched = await findDirectoriesMatching({
    regex: searchRegex,
    spinner,
    depthLimit: 1,
    exclude: excludeReg,
    path: startingPath,
    onStats: results => (stats = results)
  });

  const validFolders = revert ? matched : await filterValidFolders(matched);

  spinnerMessage(
    c`Found {green ${validFolders.length}} / {cyan ${
      stats.dirs
    }} matching folders`
  );

  if (!validFolders.length) {
    spinner.fail("No matching folders we're found");
    return process.exit(1);
  }

  let foldersToUse = validFolders;
  if (confirm) {
    if (revert) {
      spinner.succeed(c`choose which {magenta folders} to revert`);
    } else {
      spinner.succeed(
        c`choose which {magenta folders} to generate {blue playlists} for`
      );
    }
    const result = await prompt({
      type: "checkbox",
      name: "selected",
      message: "choose",
      default: [],
      choices: validFolders.map(x => ({
        name: basename(x),
        checked: true
      }))
    });

    foldersToUse = foldersToUse.filter(x =>
      result.selected.includes(basename(x))
    );

    if (foldersToUse.length === 0) {
      spinner.fail("No folders were selected... exiting");
      return process.exit(0);
    }
  }

  if (revert) {
    const results = await Promise.map(foldersToUse, async folder => {
      const files = flatten(
        await findSourceFiles({
          spinner,
          folders: folder,
          searchReg: /\.(CD[0-9]|m3u)/i,
          excludeReg: REGEX_MOVED_FOLDER
        }).map(item => item.files)
      );

      spinnerMessage(c`reverting {blue ${basename(folder)}}`);
      isVerbose &&
        spinnerMessage(
          c`{magenta ${folder}} => \n\t{cyan ${files.join("\n\t")}}`
        );

      try {
        const m3uFile = files.filter(file => extname(file) === ".m3u")[0];
        if (m3uFile) {
          isVerbose && spinnerMessage(c`{red deleting} -> {cyan ${m3uFile}}`);
          await remove(m3uFile);
        }
      } catch (error) {
        spinnerMessage(c`{red failed to delete m3u}\n${error}`);
        return false;
      }

      const cdFiles = files.filter(file => /\.CD[0-9]/i.test(extname(file)));
      try {
        await Promise.all(
          cdFiles.map(file => {
            const newFilename = file.replace(/\.CD[0-9]/i, ".cue");
            isVerbose &&
              spinnerMessage(
                c`{yellow renaming} -> {cyan ${basename(
                  file
                )}} -> {magenta ${basename(newFilename)}}`
              );
            return rename(file, newFilename);
          })
        );
      } catch (error) {
        spinnerMessage(
          c`{red failed to rename CDx files to CUE files}\n${error}`
        );
        return false;
      }
      return true;
    });

    const successes = results.filter(result => result);

    if (successes.length === 0) {
      spinner.fail(c`unable to revert {red any} folders...`);
      return process.exit(1);
    } else if (successes.length < results.length) {
      spinner.warn(c`only {yellow some} files were successfully reverted...`);
    } else if (successes.length === results.length) {
      spinner.succeed(c`all files {green reverted} successfully!`);
    }
    return process.exit(0);
  }

  const folderMap = await findSourceFiles({
    spinner,
    folders: foldersToUse,
    searchReg: REGEX_DISC,
    excludeReg: REGEX_MOVED_FOLDER
  });

  const results = await createPlaylist(folderMap);

  // TODO - implement & remove
  const success = results.filter(x => x.success);
  spinner.succeed(
    c`{magenta created} playlists for {green ${success.length}} / {blue ${
      results.length
    }} games!`
  );

  return true;
}

async function filterValidFolders(folders) {
  const excluded = new Set();
  const validFolders = await Promise.filter(folders, async folder => {
    const files = await readDirForFiles(folder);
    isVerbose &&
      spinnerMessage(
        c`{magenta ${folder}} => \n\t{cyan ${files.join("\n\t")}}`
      );
    const discCues = files.filter(file =>
      new RegExp(`${REGEX_DISC.source}\\.cue`).test(file)
    );
    const discBins = discCues.filter(cue =>
      files.find(file => file === cue.replace(".cue", ".bin"))
    );

    isVerbose &&
      spinnerMessage(
        `found cues -> ${discCues.length}, found bins -> ${discBins.length}`
      );

    if (discCues.length && discCues.length === discBins.length) {
      return true;
    }

    if (discCues.length === 0 || discBins.length === 0) {
      isVerbose && spinnerMessage(`no cues or bins were found in ${folder}`);
    }

    if (discCues.length !== discBins.length) {
      isVerbose &&
        spinnerMessage(
          c`{yellow ${folder}} has {cyan ${
            discCues.length
          }} cues but only {magenta ${discBins.length} bins}`
        );
    }

    const hasTracks = files.some(x => REGEX_TRACKS.test(x));
    if (hasTracks) {
      excluded.add(folder);
    }

    return false;
  });

  if (excluded.size) {
    spinnerMessage(
      c`the following {magenta ${excluded.size}} folders were {yellow excluded}`
    );
    excluded.forEach(x => spinnerMessage(c`  -> {cyan ${basename(x)}}`));
    spinnerMessage(
      c`run {blue '${getCLIName()} merge -h'} for more {magenta info} on how to merge them`
    );
  }

  return validFolders;
}

// folderMap => [{folder: "some/folder", files: [1, 3.cue, 3.bin]}]
async function createPlaylist(folderMap) {
  const timer = clock();
  const results = await Promise.map(folderMap, async ({ folder, files }) => {
    const name = basename(folder);
    const cues = files.filter(file => /\.cue/i.test(file));

    spinnerMessage(
      c`starting {green ${name}} with -> {cyan ${cues.length}} discs`
    );
    isVerbose && spinnerMessage(c`{magenta path} -> ${folder}`);
    isVerbose && spinnerMessage(c`\n\t {cyan -> ${cues.join("\n\t-> ")}}`);

    // rename .cue to CDX
    const discReg = /\(Disc ([0-9])\)/i;
    const promises = cues
      .map(cue => {
        const result = cue.replace(".cue", `.CD${cue.match(discReg)[1]}`);
        isVerbose &&
          spinnerMessage(
            c`{green ${basename(cue)}} ->  {cyan ${basename(result)}}`
          );
        spinner.text = `-> ${result}`;
        return { old: cue, result };
      })
      .map(async ({ old, result }) => {
        try {
          await rename(old, result);
          isVerbose &&
            spinnerMessage(c`{magenta renamed} -> ${basename(result)}`);
          return result;
        } catch (err) {
          spinnerMessage(
            c`{red failed} to generate playlist for {red ${basename(old)}}`
          );
          spinnerMessage(c`{red ${err}}`);
        }
      });

    // Create the m3u file
    const filename = join(folder, `${basename(folder)}.m3u`);
    try {
      const newNames = await Promise.all(promises);
      const content = newNames.map(x => basename(x)).join("\n");

      spinnerMessage(c`creating {cyan ${filename}}`);
      isVerbose && spinnerMessage(c`contents ->\n\t{blue ${content}}`);
      await outputFile(filename, content);
      return { filename, success: true };
    } catch (error) {
      spinnerMessage(c`{red failed} to save playlist{red \n${error}}`);
      return { filename, success: false };
    }
  });

  spinnerMessage(
    c`took {cyan ${clock(timer) / 1000}s} to generate the {magenta playlists}`
  );

  return results;
}

module.exports = handler;
