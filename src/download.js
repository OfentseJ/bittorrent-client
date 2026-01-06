"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const message = require("./message");

module.exports = (torrent) => {
  tracker.getPeers(torrent, (peers) => {
    peers.forEach((peer) => download(peer, torrent));
  });
};

function download(peer, torrent) {
  const socket = net.Socket();
  socket.on("error", console.log);
  socket.connect(peer.port, peer.ip, () => {
    socket.write(message.buildHandshake(torrent));
  });
  onWholeMsg(socket, (msg) => msgHandler(msg, socket));
}

function msgHandler(msg, socket) {
  if (isHandshake(msg)) {
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    if (m.id === 0) chokeHandler();
    if (m.id === 1) unchokeHandler();
    if (m.id === 4) haveHandler(m.payload);
    if (m.id === 5) bitfieldHandler(m.payload);
    if (m.id === 7) pieceHandler(m.payload);
  }
}

function chokeHandler() {}

function unchokeHandler() {}

function haveHandler(payload) {}

function bitfieldHandler(payload) {}

function pieceHandler(payload) {}

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
