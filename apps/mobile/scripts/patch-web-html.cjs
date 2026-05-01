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
        background: #EEF1EE;
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
        background: #EEF1EE;
        color: #101814;
        text-align: center;
        animation: shakana-fade-out 0.4s ease 8s forwards;
      }
      @keyframes shakana-fade-out {
        to { opacity: 0; pointer-events: none; }
      }
      .shakana-fallback-card {
        width: min(420px, 100%);
        border: 1px solid #DCE7DE;
        border-radius: 28px;
        background: #FFFFFF;
        padding: 28px;
      }
      .shakana-fallback-logo {
        margin: 0 0 8px;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.04em;
      }
      .shakana-fallback-text {
        margin: 0;
        color: #66746B;
        font-size: 15px;
        line-height: 1.7;
      }
    </style>`;

const fallbackMarkup = `
    <div class="shakana-fallback" aria-hidden="true">
      <div class="shakana-fallback-card">
        <p class="shakana-fallback-logo">shakana</p>
        <p class="shakana-fallback-text">האפליקציה נטענת. אם המסך נשאר כך, רענן פעם אחת כדי לקבל את הגרסה החדשה.</p>
      </div>
    </div>`;

html = html
  .replace('<html lang="en">', '<html lang="he" dir="rtl">')
  .replace('</head>', `${fallbackStyle}\n  </head>`)
  .replace('<!-- The root element for your Expo app. -->', `${fallbackMarkup}\n    <!-- The root element for your Expo app. -->`);

fs.writeFileSync(htmlPath, html);
