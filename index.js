"use strict";

const download = require("./src/download");
const torrentParser = require("./src/torrent-parser");

const torrent = torrentParser.open(process.argv[2]);

console.log("Tracker URL:", torrent.announce.toString("utf8"));
download(torrent, torrent.info.name);
