const c = require("chalk");

const commands = [
  require("./commands/merge"),
  require("./commands/playlist"),
  require("./commands/find/findMultiDiscs"),
  require("./commands/find/findMultiTrack"),
  require("./commands/scrapeArchive"),

  // Hidden Commands
  require("./commands/filenameFromFolder")
];

// TODO - Add middleware to detect errors thrown

const addMiddleware = command => ({
  ...command,
  handler: args => middleware(command.handler, args)
});

async function middleware(handler, args) {
  try {
    await handler(args);
  } catch (error) {
    console.error(c`\n{red Something went wrong...}`);
    args.verbose && console.error(c`{red ${error.stack}}`);
    console.error(c`{red ${error}}`);
    process.exit(1);
  }
}

/* eslint no-unused-expressions: 0 */
commands
  .map(addMiddleware)
  .reduce((yargs, cmd) => yargs.command(cmd), require("yargs"))
  .demandCommand(1, "You must enter a command")
  .option("verbose", {
    alias: "v",
    type: "boolean",
    desc: "Enable extra logging"
  })
  .help()
  .alias("help", "h")
  .strict().argv;
