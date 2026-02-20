const os = require('os');
const QRCode = require('qrcode');
const fs = require('fs');

const ip = Object.values(os.networkInterfaces()).flat().find(i => i.family === 'IPv4' && !i.internal).address;
const expoUrl = `exp://${ip}:8081`;

QRCode.toFile('expo-qr-code.png', expoUrl, {
    color: {
        dark: '#000000',
        light: '#ffffff'
    }
}, function (err) {
    if (err) throw err;
    console.log('QR Code generated successfully as expo-qr-code.png -> URL: ', expoUrl);
});
