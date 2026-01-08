"use strict";

const fs = require("fs");
const bencode = require("bencode.js"); // Ensure you have this package
const crypto = require("crypto");

module.exports.open = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

module.exports.size = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    : torrent.info.length;

  // If you strictly need a Buffer return for other parts of your app:
  // const buf = Buffer.alloc(8);
  // buf.writeBigUInt64BE(BigInt(size));
  // return buf;

  return size;
};

module.exports.infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

// Standard block size is 2^14 (16384 bytes)
module.exports.BLOCK_LEN = Math.pow(2, 14);

module.exports.pieceLen = function (torrent, pieceIndex) {
  const totalLength = this.size(torrent);
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
