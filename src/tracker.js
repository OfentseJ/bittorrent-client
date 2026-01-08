"use strict";
const dgram = require("dgram");
const Buffer = require("buffer").Buffer;
const crypto = require("crypto");
const torrentParser = require("./torrent-parser");
const util = require("./util");

module.exports.getPeers = (torrent, callback) => {
  const socket = dgram.createSocket("udp4");
  const url = "udp://tracker.opentrackr.org:1337";
  // 1. Validate Protocol
  if (url.startsWith("http")) {
    console.error(`Error: This torrent uses an HTTP tracker (${url}).`);
    console.error("This client only supports UDP trackers (udp://).");
    return;
  }

  // 2. Send Connect Request with Retry Logic
  udpSend(socket, buildConnReq(), url);

  let retries = 0;
  const retryInterval = setInterval(() => {
    if (retries >= 3) {
      console.error(
        "Tracker: No response after 3 attempts. Tracker might be down."
      );
      clearInterval(retryInterval);
      socket.close();
      return;
    }
    console.log("Tracker: timed out, retrying...");
    udpSend(socket, buildConnReq(), url);
    retries++;
  }, 2000); // Wait 2 seconds before retrying

  socket.on("message", (response) => {
    // 3. Clear the retry timer as soon as we get a response
    clearInterval(retryInterval);

    if (respType(response) === "connect") {
      const connReq = parseConnReq(response);
      console.log("Tracker: connected!"); // Log success
      const announceReq = buildAnnounceReq(connReq.connection_id, torrent);
      udpSend(socket, announceReq, url);
    } else if (respType(response) === "announce") {
      const announceResp = parseAnnounceResp(response);
      console.log("Tracker: received peers!"); // Log success
      callback(announceResp.peers);
      socket.close();
    }
  });

  socket.on("error", (err) => {
    console.error(`Tracker Socket Error: ${err.message}`);
    socket.close();
  });
};

function udpSend(socket, message, rawUrl, callback = () => {}) {
  const url = new URL(rawUrl);
  // Default to port 80 if none provided, though UDP trackers usually use 6969 or 1337
  const port = url.port || 80;
  // console.log(`Sending to ${url.hostname}:${port}`); // Uncomment to debug address
  socket.send(message, 0, message.length, port, url.hostname, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return "connect";
  if (action === 1) return "announce";
}

function buildConnReq() {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);
  buf.writeUInt32BE(0, 8);
  crypto.randomBytes(4).copy(buf, 12);
  return buf;
}

function parseConnReq(resp) {
  return {
    action: resp.readUInt32BE(0),
    transaction_id: resp.readUInt32BE(4),
    connection_id: resp.slice(8),
  };
}

function buildAnnounceReq(connId, torrent, port = 6881) {
  const buf = Buffer.allocUnsafe(98);
  connId.copy(buf, 0);
  buf.writeUInt32BE(1, 8);
  crypto.randomBytes(4).copy(buf, 12);
  torrentParser.infoHash(torrent).copy(buf, 16);
  util.genId().copy(buf, 36);
  Buffer.alloc(8).copy(buf, 56);
  torrentParser.size(torrent).copy(buf, 64);
  Buffer.alloc(8).copy(buf, 72);
  buf.writeUInt32BE(0, 80);
  buf.writeUInt32BE(0, 84);
  crypto.randomBytes(4).copy(buf, 88);
  buf.writeInt32BE(-1, 92);
  buf.writeUInt16BE(port, 96);
  return buf;
}

function parseAnnounceResp(resp) {
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transaction_id: resp.readUInt32BE(4),
    interval: resp.readUInt32BE(8),
    leechers: resp.readUInt32BE(12),
    seeders: resp.readUInt32BE(16),
    peers: group(resp.slice(20), 6).map((address) => {
      return {
        ip: Array.from(address.slice(0, 4)).join("."),
        port: address.readUInt16BE(4),
      };
    }),
  };
}
