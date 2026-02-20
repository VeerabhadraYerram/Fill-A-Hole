const { spawn } = require('child_process');
const QRCode = require('qrcode');
const fs = require('fs');

console.log('Starting localtunnel...');
const lt = spawn('npx', ['localtunnel', '--port', '8081'], { shell: true });

lt.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    const match = output.match(/your url is: (https:\/\/.+)/);
    if (match) {
        const url = match[1];
        // Convert to exp:// URL so Expo Go can open it natively
        const expUrl = url.replace('https://', 'exp://');
        console.log('Got Tunnel URL:', expUrl);

        QRCode.toFile('expo-qr-code.png', expUrl, {
            color: { dark: '#000000', light: '#ffffff' }
        }, (err) => {
            if (err) console.error('QR Generation Error:', err);
            else console.log('QR Code generated successfully as expo-qr-code.png');
        });
    }
});

lt.stderr.on('data', data => {
    process.stderr.write(data);
});

lt.on('close', code => {
    console.log(`localtunnel exited with code ${code}`);
});
