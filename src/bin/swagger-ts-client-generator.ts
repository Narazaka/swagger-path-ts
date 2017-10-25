#!/usr/bin/env node
import { genClient } from "../lib/genClient";

process.stdin.setEncoding("utf8");
process.stdin.resume();

let processed = false;
let stdinData = "";

async function onEnd() {
    if (processed) return;
    processed = true;
    // tslint:disable-next-line no-console
    console.log(await genClient(stdinData));
}

process.stdin.on("data", function(chunk) {
    stdinData += chunk;
});

process.stdin.on("close", onEnd);

process.stdin.on("end", onEnd);
