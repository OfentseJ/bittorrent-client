"use strict";

const fs = reqire("fs");
const bencode = require("bencode");

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

module.exports.size = (torrent) => {
  // ...
};

module.exports.infoHash = (torrent) => {
  // ...
};
