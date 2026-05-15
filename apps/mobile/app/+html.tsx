import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#FFFFFF" />
        <title>Shakana – הזמנות שכנים</title>
        <meta name="description" content="Shakana – הזמנות קבוצתיות לשכנים. מדביקים קישור למוצר, שכנים מצטרפים ומשלמים, המייסד קונה מהחנות." />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Shakana – הזמנות שכנים" />
        <meta property="og:description" content="הזמנות קבוצתיות פשוטות לשכנים. מדביקים קישור, קובעים טיימר, שכנים מצטרפים ומשלמים." />
        <meta property="og:url" content="https://shakana1.vercel.app" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Shakana – הזמנות שכנים" />
        <meta name="twitter:description" content="הזמנות קבוצתיות פשוטות לשכנים. מדביקים קישור, קובעים טיימר, שכנים מצטרפים." />
        <meta property="og:image" content="https://shakana1.vercel.app/og-image.png" />
        <meta name="twitter:image" content="https://shakana1.vercel.app/og-image.png" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://shakana1.vercel.app" />
        <ScrollViewStyleReset />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                margin: 0;
                background: #FFFFFF;
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
                background: #FFFFFF;
                text-align: center;
                animation: shakana-fade-out 0.4s ease 8s forwards;
              }
              @keyframes shakana-fade-out {
                to { opacity: 0; pointer-events: none; }
              }
              .shakana-fallback-card {
                width: min(400px, 100%);
                border: 1px solid #E8E8E8;
                border-radius: 20px;
                background: #FFFFFF;
                padding: 32px 28px;
                box-shadow: 0 18px 48px rgba(0,0,0,0.08);
              }
              .shakana-fallback-dot {
                display: inline-block;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #000000;
                margin-bottom: 14px;
              }
              .shakana-fallback-logo {
                margin: 0 0 6px;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: #000000;
              }
              .shakana-fallback-text {
                margin: 0;
                color: #767676;
                font-size: 14px;
                line-height: 1.7;
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="shakana-fallback" aria-hidden="true">
          <div className="shakana-fallback-card">
            <div className="shakana-fallback-dot" />
            <p className="shakana-fallback-logo">shakana</p>
            <p className="shakana-fallback-text">
              The app is loading. If this stays on screen, refresh once to get the newest version.
            </p>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
