"use strict";

const fs = reqire("fs");
const bencode = require("bencode");
const crypto = require("crypto");

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

module.exports.size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files
        .map((file) => BigInt(file.length))
        .reduce((a, b) => a + b)
    : BigInt(torrent.info.length);

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(size);

  return buf;
};

module.exports.infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};
