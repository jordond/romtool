const Promise = require("bluebird");
const { readdir } = require("fs");
const { join } = require("path");
const getSize = require("get-folder-size");
const filesize = require("filesize");
const { stat } = require("fs-extra");

function readDirForFiles(dir) {
  return new Promise((resolve, reject) => {
    readdir(dir, async (err, files) => {
      if (err) return reject(err);

      const result = await Promise.filter(files, async file =>
        (await stat(join(dir, file))).isFile()
      );
      resolve(result);
    });
  });
}

async function calcFolderSize(folder) {
  const result = await new Promise((resolve, reject) =>
    getSize(folder, (err, size) => (err ? reject(err) : resolve(size)))
  );

  return filesize(result);
}

async function calcFileSize(path) {
  const result = await stat(path);
  return filesize(result.size);
}

module.exports = {
  calcFolderSize,
  calcFileSize,
  readDirForFiles
};
