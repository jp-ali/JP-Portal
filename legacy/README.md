# Unused WhatsApp bot prototype

`whatsapp-bot.cjs` was previously `src/whatsapp msgs.js`. It is not imported by the React application or started by the Express server. It uses `whatsapp-web.js` and `qrcode-terminal`, which are not declared dependencies. The active app opens WhatsApp links in the browser instead. This prototype is retained for reference only.
