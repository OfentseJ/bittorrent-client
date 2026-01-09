"use strict";

const net = require("net");
const fs = require("fs");
const tracker = require("./tracker");
const message = require("./message");
const Pieces = require("./Pieces");
const Queue = require("./Queue");

module.exports = (torrent, path) => {
  tracker.getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent);
    const file = fs.openSync(path, "w");
    peers.forEach((peer) => download(peer, torrent, pieces, file));
  });
};

function download(peer, torrent, pieces, file) {
  const socket = new net.Socket();
  socket.on("error", (err) => {
    // Keep this silent or minimal to avoid spamming the progress bar
    // console.log("Socket Error: " + err.message);
  });

  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });

  const queue = new Queue(torrent);
  onWholeMsg(socket, (msg) =>
    msgHandler(msg, socket, pieces, queue, torrent, file)
  );
}

function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on("data", (recvBuf) => {
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      callback(savedBuf.slice(0, msgLen()));
      savedBuf = savedBuf.slice(msgLen());
      handshake = false;
    }
  });
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString("utf8", 1, 20) === "BitTorrent protocol"
  );
}

function msgHandler(msg, socket, pieces, queue, torrent, file) {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    if (m.id === 0) chokeHandler(socket, queue);
    if (m.id === 1) unchokeHandler(socket, pieces, queue);
    if (m.id === 4) haveHandler(socket, pieces, queue, m.payload);
    if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    if (m.id === 7)
      pieceHandler(socket, pieces, queue, torrent, file, m.payload);
  }
}

function chokeHandler(socket, queue) {
  queue.choked = true;
}

function unchokeHandler(socket, pieces, queue) {
  queue.choked = false;
  requestPiece(socket, pieces, queue);
}

function haveHandler(socket, pieces, queue, payload) {
  const pieceIndex = payload.readUInt32BE(0);
  queue.addHave(pieceIndex);
  if (queue.length() === 0) requestPiece(socket, pieces, queue);
}

function bitfieldHandler(socket, pieces, queue, payload) {
  payload.forEach((byte, i) => {
    for (let j = 0; j < 8; j++) {
      if (byte % 2) {
        const pieceIndex = i * 8 + 7 - j;
        queue.addHave(pieceIndex);
      }
      byte = Math.floor(byte / 2);
    }
  });
  if (queue.length() === 0) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent, file, pieceResp) {
  pieces.addReceived(pieceResp);

  const offset =
    pieceResp.index * torrent.info["piece length"] + pieceResp.begin;

  fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});

  // --- PROGRESS BAR START ---
  const allBlocks = pieces._received.flat();
  const downloaded = allBlocks.filter((i) => i).length;
  const total = allBlocks.length;
  const percent = (downloaded / total) * 100;

  const width = 30;
  const filled = Math.floor((percent / 100) * width);
  const bar = "█".repeat(filled) + "-".repeat(width - filled);

  process.stdout.write(`\rDownloading: [${bar}] ${percent.toFixed(2)}% `);
  // --- PROGRESS BAR END ---

  if (pieces.isDone()) {
    console.log("\nDownload complete!");
    console.log(`File saved to: ${torrent.info.name.toString()}`);
    fs.closeSync(file);
    process.exit(0);
  } else {
    requestPiece(socket, pieces, queue);
  }
}

function requestPiece(socket, pieces, queue) {
  if (queue.choked) return null;

  if (queue.length() === 0) {
    for (let i = 0; i < queue._peerPieces.length; i++) {
      if (queue.has(i) && pieceHandler.isNeeded(i)) {
        queue.queue(i);
        break;
      }
    }
  }
  while (queue.length()) {
    const pieceBlock = queue.deque();
    if (pieces.needed(pieceBlock)) {
      socket.write(message.buildRequest(pieceBlock));
      pieces.addRequested(pieceBlock);
    }
  }
}
