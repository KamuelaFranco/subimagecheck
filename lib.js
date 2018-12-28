const getTopOffsetLimit = (mainImageMetadata, potentialSubImageMetadata) => (
  mainImageMetadata.height - potentialSubImageMetadata.height
);

module.exports = { getTopOffsetLimit };
