// backend/modifier.js
const fs = require('fs');
const cheerio = require('cheerio');

function writeFileSafe(filePath, content) { /* ... your code ... */ }

function changeText(file, selector, oldText, newText) { /* ... your code ... */ }

function addBlock(file, parentSelector, htmlBlock) { /* ... your code ... */ }

function updateImage(file, selector, newSrc) { /* ... your code ... */ }

function changeStyle(file, selector, property, value) { /* ... your code ... */ }

async function applyActions(actions) { /* ... your code ... */ }

module.exports = { applyActions, changeText, addBlock, updateImage, changeStyle };
