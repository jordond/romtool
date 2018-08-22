const c = require("chalk");
const Promise = require("bluebird");
const { outputFile } = require("fs-extra");
const { resolve } = require("path");
const xray = require("x-ray")();
const { URL } = require("url");
const ora = require("ora");

const scrape = require("../utils/scraper");
const { urlExists } = require("../utils/fetch");
const {
  flattenNonNull,
  flatten,
  regexFromExtension,
  logFactory,
  ensureArray
} = require("../utils/misc");

module.exports = {
  command: "scrape-archive [options]",
  describe: "Scrape locked links from archive.org",
  handler,
  builder: yargs =>
    yargs
      .options("identifier", {
        alias: ["i"],
        type: "string|string[]",
        desc: "Archive.org identifier to scrape",
        require: true
      })
      .options("multi", {
        alias: ["m", "part"],
        type: "boolean",
        default: true,
        desc: "Check to see if there is multiple parts available"
      })
      .options("all", {
        type: "boolean",
        desc: "Grab all the links, not just the dead ones"
      })
      .options("extension", {
        alias: ["e", "ext"],
        type: "string || string[]",
        desc: "Extension of files to list"
      })
      .options("output", {
        alias: ["o", "out"],
        type: "string",
        default: "./",
        desc: c`Path to save the results to, {yellow disable} with {cyan '--no-out'}`
      })
      .options("print", {
        default: false,
        type: "boolean",
        desc: "Print the URL's to the console"
      })
};

const ARCHIVE_BASE_URL = "https://archive.org/download/";

let spinner;
let isVerbose;

function spinnerMessage(
  text,
  startMsg = "please wait...",
  symbol = c`{magenta ℹ}`
) {
  spinner.stopAndPersist({ text: c`${text}`, symbol });
  spinner.start(c`${startMsg}`);
}

async function handler({
  identifier,
  multi,
  all,
  extension,
  output,
  print,
  verbose
}) {
  const log = logFactory(verbose);
  isVerbose = verbose;
  spinner = ora("please wait...");

  log.info(c`{blue scraping} {magenta archive.org} for locked links...`);

  const searchReg = extension ? regexFromExtension(extension) : null;
  const identifiers = ensureArray(identifier);
  const outputPath = output
    ? resolve(
        output,
        `${identifiers.length > 1 ? "scraperresults" : identifiers[0]}.txt`
      )
    : null;

  log.verbose(c`Searching {magenta archive.org} for {cyan ${identifiers}}`);
  !multi && log.verbose(c`Multi-part search has been disabled`);
  log.verbose(
    c`Using {green regex} pattern -> {cyan ${extension ? searchReg : "none"}}`
  );
  outputPath &&
    log.verbose(c`Saving {magenta results} to {cyan ${outputPath}}`);
  print && log.info("Will print output results to the console");

  spinner.start();

  const results = await scrapeIndentifiers(identifiers, {
    searchReg,
    all,
    multi,
    extension
  });
  const successfulLinks = results
    .filter(item => item.filter(x => !x.error).length)
    .map(item => {
      const path = item[0].path
        .split("/")
        .pop()
        .replace(/Part[0-9]/, "");
      const links = flatten(item.map(x => x.links));
      spinnerMessage(c`total {cyan ${links.length}} links from {blue ${path}}`);
      return links;
    });

  const links = flattenNonNull(successfulLinks);

  if (links.length) {
    if ((verbose || print) && links.length > 0) {
      spinnerMessage(
        c`{green found the following links}\n{blue ${links.join("\n")}}`
      );
    }

    if (!print && outputPath) {
      spinnerMessage(c`writing to {cyan ${outputPath}}`);
      try {
        await outputFile(outputPath, links.join("\n"));
      } catch (error) {
        spinner.fail(c`{red Failed to save file...}`, error);
        return process.exit(1);
      }
    }
    spinner.succeed(
      c`{green success}! found a total of {green ${links.length}} links`
    );
  } else {
    spinner.fail(c`no links were {red found}`);
    process.exit(1);
  }
}

function getMultiPartUrls(identifier) {
  return new Promise(async success => {
    const sanitizedIdent = identifier.replace(/Part[0-9]/, "");
    const parts = [];
    for (let i = 1; i++; ) {
      const partPath = `Part${i}`;
      isVerbose &&
        spinnerMessage(
          c`checking for {blue ${ARCHIVE_BASE_URL}${sanitizedIdent}}{magenta ${partPath}}`
        );
      try {
        const exists = await urlExists(
          `${ARCHIVE_BASE_URL}${sanitizedIdent}${partPath}`
        );
        if (exists) {
          isVerbose &&
            spinnerMessage(
              c`found another part {cyan ${sanitizedIdent}${partPath}}`
            );
          parts.push(`${sanitizedIdent}${partPath}`);
        } else {
          isVerbose &&
            spinnerMessage(
              c`{magenta ${partPath}} doesn't exist so no more {magenta additional parts} are available`
            );
          break;
        }
      } catch (err) {
        spinnerMessage(
          c`{red failed} to fetch {cyan ${sanitizedIdent}}{magenta ${partPath}}\n${err}`
        );
      }
    }

    success(parts);
  });
}

async function scrapeIndentifiers(
  identifiers,
  { multi, all, extension, searchReg }
) {
  return Promise.map(identifiers, async identifier => {
    spinnerMessage(c`{blue ${identifier}} - starting...`);
    isVerbose &&
      spinnerMessage(
        c`{blue ${identifier}} - {yellow checking} if it exists...`
      );
    const exists = await urlExists(`${ARCHIVE_BASE_URL}${identifier}`);
    if (!exists) {
      spinnerMessage(
        c`{blue ${identifier}} - {red uh-oh} does {red not} exist...`
      );
      return {
        path: `${ARCHIVE_BASE_URL}${identifier}`,
        error: "Doesn't exist"
      };
    }

    const urlPaths = [identifier];
    if (multi) {
      isVerbose &&
        spinnerMessage(
          c`{blue ${identifier}} - checking for {magenta multiple} parts...`
        );
      const parts = await getMultiPartUrls(identifier);
      if (parts.length) {
        spinnerMessage(
          c`{blue ${identifier}} - {green ${
            parts.length
          }} additional {magenta parts} were found`
        );
      } else {
        spinnerMessage(
          c`{blue ${identifier}} - no additional parts were found`
        );
      }
      urlPaths.push(...parts);
    }

    return Promise.all(
      urlPaths.map(item => `${ARCHIVE_BASE_URL}${item}`).map(async it => {
        try {
          spinnerMessage(c`scraping {cyan ${it}}...`);
          const result = await scrape(it, {
            names: xray(
              `.directory-listing-table${all ? "" : "__restricted-file"}`,
              ["td:first-child"]
            )
          });

          const resultUrls = result.names
            .map(name => new URL(name, `${it}/`).href)
            .filter(x => !extension || (extension && searchReg.test(x)));

          spinnerMessage(
            c`{green found} {blue ${
              resultUrls.length
            }} links from {magenta ${it}}`
          );
          return { path: it, links: resultUrls };
        } catch (error) {
          spinnerMessage(c`{red Unable to scrape} {blue ${it}} {red ${error}}`);
          isVerbose && spinnerMessage(c`{red ${error.stack}}`);
          return { path: it, error };
        }
      })
    );
  });
}
