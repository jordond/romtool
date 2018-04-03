const klaw = require("klaw");

const filterFactory = (callback = () => true) => item =>
  !item.path.includes("node_modules") &&
  !item.path.includes(".git") &&
  callback(item.path, item.stats.isDirectory());

function walk(
  dir,
  { depthLimit = 3, filter, onFound = () => {}, transform, onFinished } = {}
) {
  const matchFilter = filterFactory(filter);

  if (!dir) {
    throw new Error("No path was supplied to walk");
  }

  return new Promise((resolve, reject) => {
    const items = [];
    klaw(dir, { depthLimit })
      .on("data", item => {
        if (matchFilter(item)) {
          onFound(item.path);
          items.push(item.path);
        }
      })
      .on("error", (err, item) => reject({ err, item }))
      .on("end", () => {
        let results = items;
        if (transform) {
          results = transform(items);
        }
        if (onFinished) {
          onFinished(results);
        }
        resolve(results);
      });
  });
}

module.exports = {
  walk
};
