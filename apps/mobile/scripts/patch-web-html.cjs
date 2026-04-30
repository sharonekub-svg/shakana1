const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const fallbackStyle = `
    <style id="shakana-boot-fallback-style">
      body {
        margin: 0;
        background: #f5f8fb;
        font-family: Arial, sans-serif;
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
        background:
          radial-gradient(circle at top right, rgba(158, 202, 242, 0.65), transparent 34%),
          linear-gradient(135deg, #f7fbff 0%, #eef6ef 100%);
        color: #071225;
        text-align: center;
      }
      .shakana-fallback-card {
        width: min(420px, 100%);
        border: 1px solid rgba(7, 18, 37, 0.1);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 20px 60px rgba(7, 18, 37, 0.12);
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
        color: #52606d;
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
