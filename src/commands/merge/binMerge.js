const { basename } = require("path");
const pythonShell = require("python-shell");

/**
 * binMerge.py
 * binMerge cue_file output_name
 */

function mergeBin(cue, fakeout = false) {
  return new Promise((resolve, reject) => {
    const args = [cue, `${basename(cue, ".cue")}.merged`];
    if (fakeout) return setTimeout(resolve, 10000);
    return pythonShell.run(
      "binMerge.py",
      { args, scriptPath: __dirname },
      (err, results) => (err ? reject(err) : resolve(results))
    );
  });
}

module.exports = mergeBin;
