"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");
const Pieces = require("./Pieces");

module.exports = (torrent) => {
  tracker.getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent.info.pieces.length / 20);
    peers.forEach((peer) => download(peer, torrent, pieces));
  });
};

function download(peer, torrent, pieces) {
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });
  const queue = [];
  onWholeMsg(socket, (msg) => msgHandler(msg, socket, pieces, queue));
}

function msgHandler(msg, socket, pieces, queue) {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    if (m.id === 0) chokeHandler();
    if (m.id === 1) unchokeHandler();
    if (m.id === 4) haveHandler(m.payload, socket, pieces, queue);
    if (m.id === 5) bitfieldHandler(m.payload);
    if (m.id === 7) pieceHandler(m.payload, socket, pieces, queue);
  }
}

function chokeHandler() {}

function unchokeHandler() {}

function haveHandler(payload, socket, pieces, queue) {
  const pieceIndex = payload.readUInt32BE(0);
  queue.push(pieceIndex);
  if (queue.length === 1) {
    requestPiece(socket, pieces, queue);
  }
}

function bitfieldHandler(payload) {}

function pieceHandler(payload, socket, pieces, queue) {
  queue.shift();
  requestPiece(socket, pieces, queue);
}

function requestPiece(socket, pieces, queue) {
  if (queue.chocked) return null;

  while (queue.queue.length) {
    const pieceIndex = queue.shift();
    if (pieces.needed(pieceIndex)) {
      socket.write(message.buildRequest(pieceIndex));
      pieces.addRequested(pieceIndex);
      break;
    }
  }
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString("utf8", 1) === "BitTorrent protocol"
  );
}

function onWholeMsg(socket, callback) {
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on("data", (receivedBuf) => {
    const msgLength = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readUInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, receivedBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLength()) {
      callback(savedBuf.slice(0, msgLength()));
      savedBuf = savedBuf.slice(msgLength());
      handshake = false;
    }
  });
}
