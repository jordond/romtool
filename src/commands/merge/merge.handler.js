const c = require("chalk");
const Promise = require("bluebird");
const ora = require("ora");
const commandExists = require("command-exists");
const { resolve, basename, dirname, join } = require("path");
const {
  ensureDir,
  move,
  remove,
  rename,
  readFile,
  outputFile
} = require("fs-extra");
const Zip = require("node-7z");

const { regex } = require("../find/findMultiTrack");
const { findCues, findSourceFiles } = require("../../utils/cues");
const { calcFolderSize, calcFileSize } = require("../../utils/filesystem");
const {
  logFactory,
  getFolderCount,
  findFilesMatching,
  flatten,
  escapeRegExp,
  matrixArray,
  clock,
  askConfirm,
  getCLIName
} = require("../../utils/misc");
const mergeBin = require("./binMerge");

const ORIGINAL_FOLDER = `${getCLIName()}-original`;
const REGEX_MERGED_FILES = /.*\.merged\.(cue|bin)/i;
const REGEX_MOVED_FOLDER = new RegExp(escapeRegExp(ORIGINAL_FOLDER), "i");

let log;
let spinner;
let spinStop;

function spinnerFactory(theSpinner) {
  return (text, symbol = c`{blue ℹ}`) =>
    theSpinner.stopAndPersist({ text, symbol }) &&
    theSpinner.start("please wait...");
}

function spinnerMessage(text, startMsg = "please wait...", symbol = "ℹ") {
  spinner.stopAndPersist({ text, symbol });
  spinner.start(startMsg);
}

let isVerbose = false;

async function handler({
  path = "./",
  recursive,
  confirm,
  clean,
  exclude,
  archive,
  verbose,
  workers = 3,
  archiveWorkers = 1
}) {
  isVerbose = verbose;
  log = logFactory(verbose);
  log.info("multi-track bin merger");

  const startingPath = resolve(path);
  const folderCount = await getFolderCount(startingPath);
  const excludeReg = exclude
    ? new RegExp(escapeRegExp(exclude), "i")
    : undefined;

  log.info(`searching -> ${startingPath}`);
  log.verbose(`checking ${folderCount} folders`);
  log.verbose(
    `using the search pattern -> ${regex}, excluding -> ${excludeReg || "none"}`
  );
  recursive &&
    log.verbose("recursive mode is enabled, it's turtles all the way down!");

  try {
    await commandExists("python");
    log.verbose(c`i found {magenta python}!`);
  } catch (error) {
    log.info(
      c`{red uh-oh}... {magenta python} was not found, install it and try again`
    );
    return process.exit(1);
  }

  let archivePath = path;
  if (archive) {
    try {
      await commandExists("7z");
      if (typeof archive === "string") {
        archivePath = resolve(archive);
      }
      log.verbose(`archiving file to ${archivePath}`);
      log.verbose("7zip executable exists on the path! :)");
      if (archiveWorkers > 3) {
        log.info(
          c`{yellow WARNING:} running more than 3 7zip processes might melt your computer`
        );
        if (confirm && !await askConfirm("do it anyway?")) {
          log.info(c`either remove the '--archiveWorkers' flag, or lower it`);
          return process.exit(0);
        }
      }
    } catch (err) {
      log.info(
        c`{red ERROR} archive mode is enabled but 7zip's '7z' command is not available!`
      );
      return process.exit(1);
    }
  }

  if (clean) {
    log.info(
      c`{yellow WARNING:} Clean is enabled original files will be deleted!`
    );
    log.info(
      c`Meaning the original files will be {red deleted}, this cannot be {red undone}!`
    );
  }

  if (workers < 1) {
    log.info(
      "invalid number of workers, there needs to be at least 1, defaulting to 1"
    );
  }

  log.info("finding all of the multi-track files");

  spinner = ora("Please wait...").start();
  spinStop = spinnerFactory(spinner);

  const depthLimit = recursive ? 3 : undefined;

  const cuesToUse = await findCues({
    spinner,
    startingPath,
    depthLimit,
    log,
    confirm,
    isVerbose,
    spinnerMessage,
    folderRegex: regex,
    excludeFolderRegex: new RegExp(
      `${REGEX_MERGED_FILES.source}|${REGEX_MOVED_FOLDER.source}`
    ),
    findFilesExcludeRegex: REGEX_MOVED_FOLDER
  });

  spinStop(`alrighty, lets merge these ${cuesToUse.length} cues!`, ":)");

  // for each file
  const workerCount = workers < 1 ? 1 : workers;
  const numWorkers =
    workerCount > cuesToUse.length ? cuesToUse.length : workerCount;
  spinStop(`merging [${cuesToUse.length}] cues [${numWorkers}] at a time`);
  spinner.start(`please wait...`);

  const mergeResults = await mergeCueFiles(cuesToUse, numWorkers);
  const mergedCount = mergeResults.filter(x => x.success).length;
  if (mergedCount === cuesToUse.length) {
    spinner.succeed(
      c`successfully merged all {green ${mergedCount}} cue files`
    );
  } else if (mergedCount === 0) {
    spinner.fail(c`{red none} of the cues we're able to be merged...`);
    log.info(
      "re-run the script using the '--verbose' flag to see why it failed"
    );
    process.exit(1);
  } else if (mergedCount < cuesToUse.length) {
    spinner.info(
      c`only {yellow ${mergedCount} / ${cuesToUse.length}} files were merged`
    );
  }

  const findSourceFileOptions = {
    spinner,
    folders: cuesToUse,
    excludeReg: REGEX_MERGED_FILES,
    onModifyFolder: item => dirname(item),
    searchReg: cue =>
      new RegExp(escapeRegExp(basename(cue, ".cue")) + /.*\.bin/.source, "i")
  };

  if (archive) {
    log.info(c`{magenta archiving} the original files`);
    spinner.start("please wait...");

    // Gather all the source files
    const sourceFiles = await findSourceFiles(findSourceFileOptions);
    const archiveResults = await archiveSourceFiles(
      sourceFiles,
      archivePath,
      archiveWorkers
    );

    spinnerMessage(
      c`archived {green ${archiveResults.filter(x => x.success).length}} games`
    );
  } else if (clean) {
    log.info(c`{red deleting} the original files`);
    log.info(c`this action {red CANNOT} be undone`);
    log.info(c`use the '{cyan --archive} flag to 7zip the originals`);

    if (confirm) {
      if (!await askConfirm("continue?")) return process.exit(0);
    }

    const sourceFiles = await findSourceFiles(findSourceFileOptions);
    await deleteSourceFiles(sourceFiles);
  } else {
    // Move the originals to an './original' folder
    spinnerMessage(c`moving {magenta original} files`);
    const sourceFiles = await findSourceFiles(findSourceFileOptions);
    await moveSourceFiles(sourceFiles);
  }

  // Rename the merged files back to their original filename
  // TODO - this is broken.... finding files from every dir instead of ones just being used
  spinnerMessage(c`cleaning up the {magenta filenames}`);
  const merged = await findFilesMatching({
    path: startingPath,
    spinner,
    regex: REGEX_MERGED_FILES
  });

  await Promise.map(merged, async file => {
    spinner.text = `removing '.merged' from ${basename(file)}`;
    if (/\.cue/i.test(file)) {
      const contents = await readFile(file, "utf8");
      await outputFile(file, contents.replace(".merged", ""));
    }
    return rename(file, file.replace(".merged", ""));
  });

  spinner.succeed(c`have a {magenta nice} day! :)`);
  return true;
}

async function mergeCueFiles(cues, workers) {
  const cueChunks = matrixArray(cues, workers);

  const timer = clock();
  spinner.start(`please wait...`);
  const results = await Promise.all(
    cueChunks.map(chunk =>
      Promise.mapSeries(chunk, async cue => {
        const name = basename(cue);
        try {
          const start = clock();
          spinnerMessage(c`starting {green ${name}}...`);
          isVerbose && spinnerMessage(c`path -> ${cue}`);

          await mergeBin(cue);
          spinnerMessage(c`finished {cyan ${name}} in ${clock(start) / 1000}s`);
          return { cue, success: true };
        } catch (error) {
          spinnerMessage(
            c`❌ failed to merge {red ${name}}... -> ERROR: \n${error}`
          );
          return { cue, success: false };
        }
      })
    )
  );

  spinnerMessage(c`merging took {cyan ${clock(timer) / 1000}s}`);

  return flatten(results);
}

function mergeDuplicateFolders(files) {
  const merged = files.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.folder]: [...(prev[curr.folder] || []), ...curr.files]
    }),
    {}
  );

  return Object.keys(merged).map(folder => ({ folder, files: merged[folder] }));
}

// files => [{ folder: basename of file, files: [bin1, bin2, ...] }]
async function archiveSourceFiles(files, destPath, workers) {
  const merged = mergeDuplicateFolders(files);
  const chunks = matrixArray(merged, workers);

  const start = clock();
  spinner.start(`please wait...`);
  const results = await Promise.all(
    chunks.map(chunk =>
      Promise.mapSeries(chunk, async sourceSet => {
        const folderName = basename(sourceSet.folder);
        try {
          const newPath = join(sourceSet.folder, folderName);
          log.verbose(`new path => ${newPath}`);
          await ensureDir(newPath);
          spinner.text = `created folder ${folderName}`;

          await Promise.all(
            sourceSet.files.map(async file => {
              await move(file, join(newPath, basename(file)));
              spinner.text = `copied ${file}`;
            })
          );

          const time = clock();
          const zipPath = `${newPath}.7z`;

          const oldSize = await calcFolderSize(newPath);
          spinnerMessage(
            c`zipping {magenta ${folderName}} -> {cyan ${oldSize}}`
          );
          await new Zip().add(zipPath, newPath);

          spinner.text = `deleting ${newPath}`;
          await remove(newPath);

          const finalDestination = join(destPath, basename(zipPath));
          spinner.text = `moving to ${finalDestination}`;
          await move(zipPath, finalDestination);

          const zipSize = await calcFileSize(finalDestination);
          spinnerMessage(
            c`finished {green ${finalDestination}} in ${clock(time) /
              1000}s -> {cyan ${zipSize}}`
          );
          return { zip: finalDestination, name: folderName, success: true };
        } catch (err) {
          spinnerMessage(
            c`{red ERROR} unable to archive ${folderName}\nERROR -> ${err}`
          );
          return { name: folderName, success: false };
        }
      })
    )
  );

  spinnerMessage(c`archiving took {cyan ${clock(start) / 1000}}s`);

  return flatten(results);
}

async function modifySourceFiles(files, action = () => {}) {
  const toModify = flatten(
    mergeDuplicateFolders(files).map(file => file.files)
  );
  return Promise.all(
    toModify.map(async file => {
      try {
        await action(file);
      } catch (error) {
        spinnerMessage(c`failed to modify {red ${file}}`);
        spinnerMessage(error);
        return false;
      }
    })
  );
}

async function moveSourceFiles(files) {
  const start = clock();
  const results = await modifySourceFiles(files, async file => {
    const destination = join(dirname(file), ORIGINAL_FOLDER, basename(file));
    const moveText = c`-> {cyan ${destination}}`;
    spinner.text = moveText;
    isVerbose && spinnerMessage(moveText);
    await move(file, destination);
    return true;
  });

  spinnerMessage(
    c`moving {cyan ${results.length}} files took {cyan ${clock(start) / 1000}}s`
  );
  return results;
}

async function deleteSourceFiles(files) {
  const start = clock();
  const results = await modifySourceFiles(files, async file => {
    const deleteText = c`-> {red ${basename(file)}}`;
    spinner.text = deleteText;
    isVerbose && spinnerMessage(deleteText);
    await remove(file);
    return true;
  });

  spinnerMessage(
    c`deleting {cyan ${results.length}} files took {cyan ${clock(start) /
      1000}}s`
  );
  return results;
}

module.exports = handler;
