import http from "node:http";
import { createApp } from "./app.mjs";

const port = Number(process.env.PORT || 5050);
const server = http.createServer(createApp());

server.listen(port, "127.0.0.1", () => {
  console.log(`Synthetic inspection demo listening on http://127.0.0.1:${port}`);
});
