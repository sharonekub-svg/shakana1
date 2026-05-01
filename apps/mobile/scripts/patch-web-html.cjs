const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const fallbackStyle = `
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet" />
    <style id="shakana-boot-fallback-style">
      body {
        margin: 0;
        background: #060A12;
        font-family: 'Rubik', Arial, sans-serif;
      }
      #root {
        position: relative;
        z-index: 1;
      }
      .shakana-fallback {
        position: fixed;
        inset: 0;
        z-index: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #060A12;
        text-align: center;
        animation: shakana-fade-out 0.4s ease 8s forwards;
      }
      @keyframes shakana-fade-out {
        to { opacity: 0; pointer-events: none; }
      }
      .shakana-fallback-orb {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -80%);
        width: 440px;
        height: 440px;
        border-radius: 50%;
        background: rgba(75,138,255,0.15);
        filter: blur(80px);
        pointer-events: none;
      }
      .shakana-fallback-card {
        position: relative;
        width: min(420px, 100%);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 28px;
        background: rgba(255,255,255,0.05);
        padding: 32px 28px;
      }
      .shakana-fallback-logo {
        margin: 0 0 10px;
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: #FFFFFF;
        text-transform: lowercase;
      }
      .shakana-fallback-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #4B8AFF;
        margin-bottom: 14px;
      }
      .shakana-fallback-text {
        margin: 0;
        color: rgba(255,255,255,0.50);
        font-size: 15px;
        line-height: 1.7;
      }
    </style>`;

const fallbackMarkup = `
    <div class="shakana-fallback" aria-hidden="true">
      <div class="shakana-fallback-orb"></div>
      <div class="shakana-fallback-card">
        <p class="shakana-fallback-logo">shakana</p>
        <div class="shakana-fallback-dot"></div>
        <p class="shakana-fallback-text">האפליקציה נטענת. אם המסך נשאר כך, רענן פעם אחת כדי לקבל את הגרסה החדשה.</p>
      </div>
    </div>`;

html = html
  .replace('<html lang="en">', '<html lang="he" dir="rtl">')
  .replace('</head>', `${fallbackStyle}\n  </head>`)
  .replace('<!-- The root element for your Expo app. -->', `${fallbackMarkup}\n    <!-- The root element for your Expo app. -->`);

fs.writeFileSync(htmlPath, html);
