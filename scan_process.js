const sharp = require('sharp');

const
  [,, mainImagePath, potentialSubImagePath, topStartString, topStopString, vOption] = process.argv;
const topStart = parseInt(topStartString, 10);
const topStop = parseInt(topStopString, 10);
const verbose = vOption === 'true';
const mainImage = sharp(mainImagePath);
const potentialSubImage = sharp(potentialSubImagePath);

const scanForSubImage = async () => {
  const verboseLog = verbose ? console.log : () => {};
  const mainImageMetadata = await mainImage.metadata();
  const potentialSubImageMetadata = await potentialSubImage.metadata();

  const leftOffsetLimit = mainImageMetadata.width - potentialSubImageMetadata.width;
  verboseLog(`Left Offset Limit is: ${leftOffsetLimit}`);
  const topOffsetLimit = topStop;
  verboseLog(`Top Offset Limit is: ${topOffsetLimit}`);

  const potentialSubImageBuffer = await potentialSubImage.toBuffer();

  for (let top = topStart; top <= topOffsetLimit; top += 1) {
    for (let left = 0; left <= leftOffsetLimit; left += 1) {
      verboseLog(`Scan at Top: ${top} Left: ${left}`);
      // eslint-disable-next-line no-await-in-loop
      const slicedImageBuffer = await mainImage
        .extract({
          left,
          top,
          width: potentialSubImageMetadata.width,
          height: potentialSubImageMetadata.height,
        })
        .toBuffer();
      if (slicedImageBuffer.equals(potentialSubImageBuffer)) {
        if (verbose) {
          process.send(`Subimage Found: Top: ${top} Left: ${left}`);
        } else {
          process.send(`${top},${left}`);
        }
      }
    }
  }
};

scanForSubImage();
