#!/usr/bin/env node
import { genClient } from "../lib/genClient";

process.stdin.setEncoding("utf8");
process.stdin.resume();

let stdinData = "";

process.stdin.on("data", function(chunk) {
    stdinData += chunk;
});

process.stdin.on("close", async function() {
    // tslint:disable-next-line no-console
    console.log(await genClient(stdinData));
    process.exit();
});

process.stdin.on("end", async function() {
    // tslint:disable-next-line no-console
    console.log(await genClient(stdinData));
    process.exit();
});
