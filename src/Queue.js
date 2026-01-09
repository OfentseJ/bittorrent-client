"use strict";

const tp = require("./torrent-parser");

module.exports = class {
  constructor(torrent) {
    this._torrent = torrent;
    this._queue = [];
    this.choked = true;
    const nPieces = Math.ceil(torrent.info.pieces.length / 20);
    this._peerPieces = new Array(nPieces).fill(false);
  }

  addHave(pieceIndex) {
    this._peerPieces[pieceIndex] = true;
  }

  has(pieceIndex) {
    return this._peerPieces[pieceIndex];
  }

  queue(pieceIndex) {
    const nBlocks = tp.blocksPerPiece(this._torrent, pieceIndex);
    for (let i = 0; i < nBlocks; i++) {
      const pieceBlock = {
        index: pieceIndex,
        begin: i * tp.BLOCK_LEN,
        length: tp.blockLen(this._torrent, pieceIndex, i),
      };
      this._queue.push(pieceBlock);
    }
  }

  deque() {
    return this._queue.shift();
  }
  peek() {
    return this._queue[0];
  }
  length() {
    return this._queue.length;
  }
};
