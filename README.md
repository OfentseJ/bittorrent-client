# Node.js BitTorrent Client

A lightweight, scratch-built BitTorrent client implementation in Node.js. This project demonstrates the core mechanics of the BitTorrent protocol, including connecting to trackers, handshaking with peers, and downloading files piece-by-piece using TCP sockets.

## Features

- **Core Protocol Implementation:** Implements the BitTorrent v1.0 protocol manually (Bencoding, Handshakes, Interested/Unchoke flows).
- **TCP Socket Management:** Handles raw TCP connections to multiple peers simultaneously.
- **UDP Tracker Support:** Communicates with UDP trackers to retrieve peer lists.
- **Pipelining:** Supports request pipelining to maximize download speed and saturation.
- **End-Game Mode:** specialized logic to handle the final few blocks of a download (re-requesting missing pieces from any available peer).
- **Resume Capability:** verifying existing file data on startup to resume partial downloads.
- **Memory Efficiency:** "Lazy queueing" to handle large torrents without exhausting RAM.
- **Visual Progress:** Real-time console progress bar with download percentage.

## Prerequisites

- **Node.js:** v18.0.0 or higher (Project uses `fs` and `net` modules heavily).
- **A Torrent File:** You need a `.torrent` file to test (e.g., [Sintel](https://webtorrent.io/torrents/sintel.torrent) or [Big Buck Bunny](https://webtorrent.io/torrents/big-buck-bunny.torrent)).

## Installation

1.  Clone the repository:

    ```bash
    git clone [https://github.com/OfentseJ/bittorrent-client.git](https://github.com/OfentseJ/bittorrent-client.git)
    cd bittorrent-client
    ```

2.  Install dependencies:
    ```bash
    npm install bencode.js
    ```
    _(Note: The project relies mostly on Node.js standard libraries like `net`, `dgram`, `fs`, `buffer`, and `crypto`.)_

## Usage

Run the client by passing the path to a `.torrent` file as an argument:

```bash
node index.js path/to/your-file.torrent

```

### Example

```bash
node index.js sintel.torrent

```

**Output:**

```text
Tracker URL: udp://tracker.leechers-paradise.org:6969
Tracker: contacting...
Tracker: connected!
Tracker: received 200 peers
Downloading: [████████████------------------] 45.20%

```

## Project Structure

- **`index.js`**: Entry point. Reads the torrent file and kicks off the download process.
- **`src/download.js`**: Main download engine. Manages peer connections, the message loop, and writing files to disk.
- **`src/tracker.js`**: Handles UDP communication with the tracker to find peers.
- **`src/message.js`**: Builds and parses BitTorrent protocol messages (Handshake, Keep-Alive, Choke, Piece, etc.).
- **`src/torrent-parser.js`**: Utilities for reading the `.torrent` file (calculating size, info hash, piece length).
- **`src/Pieces.js`**: Tracks which pieces have been requested and received.
- **`src/Queue.js`**: Manages the list of blocks to request from specific peers.

## How It Works

1. **Parse:** The client decodes the `.torrent` file to get the "Info Hash" and file size.
2. **Announce:** It sends a UDP request to the Tracker URL to get a list of Peers (IPs and Ports).
3. **Connect:** It opens TCP connections to multiple peers.
4. **Handshake:** It performs the standard BitTorrent handshake.
5. **Download Loop:**

- Exchange `Bitfield` to see what pieces the peer has.
- Send `Interested` message.
- Wait for `Unchoke` message.
- Request blocks (16KB chunks) using Pipelining.
- Write received blocks to a buffer/file.

6. **Verify & Save:** Once all blocks for a piece are received, it checks the SHA1 hash. If correct, it writes to disk.

## Known Limitations

- **UDP Trackers Only:** Does not currently support HTTP trackers.
- **Single File Output:** Best suited for single-file torrents; multi-file support flattens structure.
- **No Uploading:** This is a leech-only client (does not seed back to peers).

## License

This project is open-source and available for educational purposes.

```

### Next Step
Would you like me to show you how to initialize a Git repository and push this code to your GitHub?

```
