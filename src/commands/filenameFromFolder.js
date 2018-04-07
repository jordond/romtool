const { renameSync, writeFileSync } = require("fs-extra");
const { extname, resolve, basename, dirname, sep } = require("path");
const inquirer = require("inquirer");
const ora = require("ora");

const { walk } = require("../utils/walk");
const { getFolderCount, regexFromExtension } = require("../utils/misc");

// Hidden Command
// Rename single file inside a folder with the folder name.
// Each folder must have a single file with the given extension
module.exports = {
  command: "rename [options]",
  describe: false,
  handler,
  builder: yargs =>
    yargs
      .options("path", {
        alias: "p",
        type: "string",
        desc: "Path to folder to search, defaults to current directory",
        default: "./"
      })
      .options("extension", {
        alias: ["e", "ext"],
        type: "string || string[]",
        desc: "Extension of file to rename ex: '.iso'"
      })
      .options("regex", {
        alias: ["reg", "R"],
        type: "RegExp",
        desc:
          "Search by regex instead of extension * Takes priority over --extension *"
      })
      .options("confirm", {
        default: true,
        type: "boolean",
        desc: "Ask before renaming"
      })
      .options("id", {
        default: true,
        type: "boolean",
        desc: "Write ID file alongside rom"
      })
};

async function handler({
  path,
  extension,
  regex,
  confirm,
  id,
  verbose = false
}) {
  let searchReg = regex;

  if (regex) {
    searchReg = new RegExp(regex, "i");
  } else if (!regex && extension) {
    searchReg = regexFromExtension(extension);
  } else {
    console.error(
      "Error: Requires either '--extension' or '--regex' to be passed in"
    );
    process.exit(1);
  }

  const folderCount = await getFolderCount(path);
  verbose && console.log(`looking in -> ${path}`);
  verbose && console.log(`Checking ${folderCount} folders`);
  verbose && console.log(`Using regex pattern -> ${searchReg}`);

  const spinner = ora("Please wait...").start();

  const match = await walk(path, {
    filter: check => {
      const isMatch = checkForMatch(check, searchReg);
      spinner.text = `Check -> ${isMatch ? "✓" : "×"}  ${basename(check)}`;
      return isMatch;
    },
    transform: found =>
      found.map(x => {
        const dir = dirname(x);
        return {
          old: resolve(x),
          new: resolve(`${dir}${sep + basename(dir)}${extname(x)}`)
        };
      })
  });

  if (!match.length) {
    spinner.fail("No matching files we're found");
    return process.exit(1);
  }

  console.log("");
  match.forEach(({ old, new: current }) => console.log(`${old} -> ${current}`));

  spinner.succeed(
    `Found ${match.length} matching folders out of ${folderCount}`
  );

  // For each file, get the name of the parent folder
  let result;

  if (confirm) {
    result = await inquirer.prompt({
      type: "confirm",
      name: "confirm",
      message: "Good to go?",
      default: false
    });
  }

  // Rename the file to match the parent folder
  if (!confirm || result.confirm) {
    match.forEach(x => {
      console.log(`Creating ${x.new}`);
      renameSync(x.old, x.new);

      // Create ID file containing SLES number
      if (id) {
        const newPath = resolve(
          dirname(x.old),
          basename(x.old, extname(x.old))
            .split(" ")
            .shift()
        );
        console.log(`\t-> Writing ID file => ${basename(newPath)}`);
        writeFileSync(`${newPath}.id`, "");
      }
    });
  } else {
    console.log("Aborted, nothing else to do");
  }

  return process.exit(0);
}

/**
 * Check if the path is a valid match
 * Must match the regex, must not already be named as the folder,
 * and for now multiple files are not supported
 * ie 'Blah Disc 1.iso, Blah Disc 2.iso'
 * @param {*} path
 * @param {*} regex
 */
function checkForMatch(path, regex) {
  return (
    regex.test(path) &&
    basename(path, extname(path)) !== basename(dirname(path)) &&
    !/Disc [0-9]+/g.test(basename(path))
  );
}
