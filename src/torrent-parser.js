"use strict";

const fs = require("fs");
const bencode = require("bencode.js");
const crypto = require("crypto");

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

module.exports.size = (torrent) => {
  // Returns BigInt (Required for the tracker packet)
  if (torrent.info.files) {
    return torrent.info.files
      .map((file) => BigInt(file.length))
      .reduce((a, b) => a + b);
  } else {
    return BigInt(torrent.info.length);
  }
};

module.exports.infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

// Standard block size is 2^14 (16kb)
module.exports.BLOCK_LEN = Math.pow(2, 14);

module.exports.pieceLen = function (torrent, pieceIndex) {
  const totalLength = Number(this.size(torrent));
  const pieceLength = torrent.info["piece length"];

  const lastPieceIndex = Math.floor(totalLength / pieceLength);

  return lastPieceIndex === pieceIndex
    ? totalLength % pieceLength
    : pieceLength;
};

module.exports.blocksPerPiece = function (torrent, pieceIndex) {
  const pieceLength = this.pieceLen(torrent, pieceIndex);
  return Math.ceil(pieceLength / this.BLOCK_LEN);
};

module.exports.blockLen = function (torrent, pieceIndex, blockIndex) {
  const pieceLength = this.pieceLen(torrent, pieceIndex);

  const lastBlockIndex = Math.floor(pieceLength / this.BLOCK_LEN);
  const lastBlockLength = pieceLength % this.BLOCK_LEN;

  if (blockIndex === lastBlockIndex && lastBlockLength > 0) {
    return lastBlockLength;
  }
  return this.BLOCK_LEN;
};
