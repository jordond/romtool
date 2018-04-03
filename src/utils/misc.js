const Promise = require("bluebird");
const chalk = require("chalk");
const { readdir } = require("fs-extra");
const { resolve, basename, dirname } = require("path");
const { walk } = require("./walk");
const { prompt } = require("inquirer");

const packageJson = require("../../package.json");

async function getFolderCount(path) {
  const result = await readdir(path);
  return (result || []).length;
}

function getCLIName() {
  return Object.keys(packageJson.bin)[0] || "cmd";
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [value];
}

const flatten = list =>
  list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);

const flattenNonNull = list =>
  flatten(list.filter(it => it != null || it !== undefined));

function ensureFirstChar(shouldBe, string) {
  return string.substring(0, 1) === shouldBe ? string : shouldBe + string;
}

function regexFromExtension(extensions) {
  const extArr = flatten([extensions]).map(x => `\\${ensureFirstChar(".", x)}`);

  return new RegExp(`${extArr.join("|")}`, "gi");
}

function logFactory(verbose = false, silent = false) {
  return {
    info: message => !silent && console.log(chalk`${message}`),
    verbose: message => verbose && !silent && console.log(chalk`${message}`)
  };
}

async function findDirectoriesMatching({ path, ...options }) {
  return walk(resolve(path), {
    ...walkOptions({ path, ...options }),
    transform: found => [...new Set(found.map(x => dirname(x)))]
  });
}

function findFilesMatching({ path, ...options }) {
  return walk(resolve(path), walkOptions({ path, ...options }));
}

function walkOptions({
  regex = /.*/,
  spinner,
  depthLimit,
  exclude,
  foundMatch,
  onFilter,
  onStats
}) {
  const reg = new RegExp(regex.source);
  const stats = {
    search: 0,
    dirs: 0,
    match: 0
  };
  return {
    depthLimit,
    onFound: found => {
      if (foundMatch) {
        foundMatch(found);
      }
    },
    filter: (check, isDirectory) => {
      let match = reg.test(check);
      if (exclude) {
        const isExclude = exclude.test(check) && match;
        if (isExclude) {
          match = false;
        }
      }
      if (spinner) {
        // eslint-disable-next-line no-param-reassign
        spinner.text = `Checked -> ${match ? "✓" : "×"}  ${basename(check)}`;
      }
      stats.search++;
      isDirectory && stats.dirs++;
      match && stats.match++;
      if (onFilter) {
        onFilter(check);
      }
      return match;
    },
    onFinished: () => onStats && onStats(stats)
  };
}

async function filterValidCues(regex, cues, spinnerMessage, isVerbose) {
  const results = await Promise.mapSeries(cues, async cue => {
    const files = await readdir(dirname(cue));
    const cueReg = new RegExp(
      `${escapeRegExp(basename(cue, ".cue"))} ${regex.source}`
    );
    const hasTracks = files.some(file => cueReg.test(file));
    if (hasTracks) {
      isVerbose && spinnerMessage(`found ${cue}`);
      return cue;
    }
    isVerbose && spinnerMessage(`not valid -> ${cue}`);
    return null;
  });

  return results.filter(item => item !== null);
}

function escapeRegExp(str) {
  // eslint-disable-next-line no-useless-escape
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Splits the array into sub arrays of n size ex: ([1,2,3,4,5], 2) => [[1,2], [3,4], [5]]
function chunkArrayInGroups(arr, size) {
  const myArray = [];
  for (let i = 0; i < arr.length; i += size) {
    myArray.push(arr.slice(i, i + size));
  }
  return myArray;
}

// Splits the array into n chunks, ex: ([1,2,3,4,5], 2) => [[1,2,3], [4,5]]
function matrixArray(target, size) {
  const cloned = target.slice();
  const t = Math.ceil(cloned.length / size);
  const arr = [];
  for (let i = 0; i < size; i += 1) {
    arr.push(cloned.splice(0, t));
  }
  return arr.filter(x => x.length);
}

function clock(start) {
  if (!start) return process.hrtime();
  const end = process.hrtime(start);
  return Math.round(end[0] * 1000 + end[1] / 1000000);
}

async function askConfirm(message = "are you sure?") {
  const result = await prompt({
    type: "confirm",
    name: "yes",
    message
  });

  return result.yes;
}

function isFunction(functionToCheck) {
  return (
    functionToCheck && {}.toString.call(functionToCheck) === "[object Function]"
  );
}

module.exports = {
  getCLIName,
  flatten,
  flattenNonNull,
  ensureFirstChar,
  getFolderCount,
  regexFromExtension,
  logFactory,
  findDirectoriesMatching,
  findFilesMatching,
  escapeRegExp,
  chunkArrayInGroups,
  matrixArray,
  clock,
  filterValidCues,
  askConfirm,
  isFunction,
  ensureArray
};
