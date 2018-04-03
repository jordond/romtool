module.exports = yargs => yargs
    .options("path", {
      alias: "p",
      type: "string",
      desc: "Path to folder to search, defaults to current directory",
      default: "./"
    })
    .options("print", {
      alias: "P",
      type: "boolean",
      desc: "Print results to stdout"
    })
    .options("output", {
      alias: ["outputFolder", "o"],
      type: "string",
      desc: "Path to save the results to"
    })
    .options("verbose", {
      alias: ["v", "isVerbose"],
      type: "boolean",
      desc: "Display all the things"
    });
