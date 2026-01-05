"use strict";

const tracker = require("./src/tracker");
const torrentParser = require("./src/torrent-parser");

const torrent = torrentParser.open("sintel.torrent");

// for (let i = 0; i < 8; i++) {
//   setTimeout(() => {
//     console.log("Retry count: " + (i + 1));
//     tracker.getPeers(torrent, (peers) => {
//       console.log("list of peers:", peers);
//     });
//   }, Math.pow(2, i) * 15000);
// }

function getPeersWithRetry(retries = 3, delay = 15000) {
  console.log(`attempting to find peers... (${retries} retries left)`);
  tracker.getPeers(torrent, (peers) => {
    console.log("Success! Found peers:", peers);
  });

  if (retries > 0) {
    setTimeout(() => {
      getPeersWithRetry(retries - 1, delay * Math.pow(2, retries));
    }, delay);
  }
}
getPeersWithRetry();
