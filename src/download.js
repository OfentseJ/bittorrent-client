"use strict";

const net = require("net");
const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const { Download } = require("lucide-react");

module.exports = (torrent) => {
  tracker.getPeers(torrent, (peers) => {
    peers.forEach(download);
  });
};

function download(peer) {
  const socket = net.Socket();
  socket.on(error, console.log);
  socket.connect(peer.port, peer.id, () => {
    socket.write(Buffer.from("Hello Baby"));
  });
  socket.on("data", (data) => {});
}
