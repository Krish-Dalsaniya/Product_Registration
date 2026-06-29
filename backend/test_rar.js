const fs = require('fs');
const unrar = require('node-unrar-js');

async function testRarData() {
  try {
    const buffer = Buffer.from('dummy data');
    const extractor = await unrar.createExtractorFromData({ data: buffer });
    console.log("Extractor created from data:", !!extractor);
  } catch(e) {
    console.log("Error loading unrar from data:", e);
  }
}
testRarData();
