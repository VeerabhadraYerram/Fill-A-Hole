const os = require('os');
const fs = require('fs');
fs.writeFileSync('net.json', JSON.stringify(os.networkInterfaces(), null, 2), 'utf8');
