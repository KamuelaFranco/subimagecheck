#!/usr/bin/env node
const { fork } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const program = require('commander');
const sharp = require('sharp');

const { getTopOffsetLimit } = require('./lib');

let firstImagePath = '';
let secondImagePath = '';

program
  .version('1.0.0')
  .arguments('<image path> <image path>')
  .action((path1, path2) => {
    firstImagePath = path1;
    secondImagePath = path2;
  })
  .option('-v, --verbose', 'Display output (useful for debugging)')
  .option('-s, --single', 'Execute in single-threaded mode (useful for debugging)')
  .parse(process.argv);

if (!fs.existsSync(firstImagePath) || !fs.existsSync(secondImagePath)) {
  console.error('Error: Input file not found');
  process.exit(1);
}

const numCPUs = program.single ? 1 : os.cpus().length;

const childProcesses = [];
const main = async () => {
  const firstImage = sharp(firstImagePath);
  const secondImage = sharp(secondImagePath);
  const firstImageMetadata = await firstImage.metadata();
  const secondImageMetadata = await secondImage.metadata();
  const firstImageArea = firstImageMetadata.width * firstImageMetadata.height;
  const secondImageArea = secondImageMetadata.width * secondImageMetadata.height;

  if (firstImageArea === secondImageArea) {
    const firstImageBuffer = await firstImage.toBuffer();
    const secondImageBuffer = await secondImage.toBuffer();
    if (firstImageBuffer.equals(secondImageBuffer)) {
      console.log('0,0');
      return;
    }
  }

  const scanProcess = path.resolve('scan_process.js');

  if (firstImageArea > secondImageArea) {
    const topOffsetLimit = getTopOffsetLimit(firstImageMetadata, secondImageMetadata);
    const chunkSize = topOffsetLimit / numCPUs;
    for (let i = 0; i < numCPUs; i += 1) {
      const topOffsetStart = Math.round(chunkSize * i);
      const topOffsetStop = Math.round(topOffsetStart + chunkSize) > topOffsetLimit
        ? topOffsetLimit : Math.round(topOffsetStart + chunkSize);
      const child = fork(
        scanProcess,
        [firstImagePath, secondImagePath, topOffsetStart, topOffsetStop, program.verbose],
      );
      childProcesses.push(child);
      child.on('message', (message) => {
        console.log(message);
        childProcesses.forEach(childProc => childProc.kill());
      });
    }
  } else {
    const topOffsetLimit = getTopOffsetLimit(secondImageMetadata, firstImageMetadata);
    const chunkSize = topOffsetLimit / numCPUs;
    for (let i = 0; i < numCPUs; i += 1) {
      const topOffsetStart = Math.round(chunkSize * i);
      const topOffsetStop = Math.round(topOffsetStart + chunkSize) > topOffsetLimit
        ? topOffsetLimit : Math.round(topOffsetStart + chunkSize);
      const child = fork(
        scanProcess,
        [secondImagePath, firstImagePath, topOffsetStart, topOffsetStop, program.verbose],
      );
      childProcesses.push(child);
      child.on('message', (message) => {
        console.log(message);
        childProcesses.forEach(childProc => childProc.kill());
      });
    }
  }
};

main();
