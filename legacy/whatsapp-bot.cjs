const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Session ko save rakhne ke liye LocalAuth use hota hai
const client = new Client({
    authStrategy: new LocalAuth()
});

// QR Code scan karne ke liye terminal me dikhayega
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Client Ready!');
});

// Portal se aane waale numbers aur message ko send karne ka function
function sendBulkMessages(numbers, messageText) {
    numbers.forEach((number, index) => {
        // Spam protection: Har message ke darmiyan 5-10 second ka gap rakhein
        setTimeout(() => {
            // Country code k sath number format: 923001234567@c.us
            const formattedNumber = `${number}@c.us`;
            client.sendMessage(formattedNumber, messageText)
                .then(response => console.log(`Sent to ${number}`))
                .catch(err => console.error(`Failed for ${number}`, err));
        }, index * 8000); // 8 seconds delay per message
    });
}

client.initialize();