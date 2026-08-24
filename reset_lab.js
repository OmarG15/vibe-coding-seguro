const fs = require('fs');
const path = require('path');

const seed = path.join(__dirname, 'data', 'seed.json');
const lab = path.join(__dirname, 'data', 'lab.json');
fs.copyFileSync(seed, lab);
console.log('Laboratorio reiniciado:', lab);
