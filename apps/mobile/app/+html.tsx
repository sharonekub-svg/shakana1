import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#9ECAF2" />
        <title>Shakana</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
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
            `,
          }}
        />
      </head>
      <body>
        <div className="shakana-fallback" aria-hidden="true">
          <div className="shakana-fallback-card">
            <p className="shakana-fallback-logo">shakana</p>
            <p className="shakana-fallback-text">
              האפליקציה נטענת. אם המסך נשאר כך, רענן פעם אחת כדי לקבל את הגרסה החדשה.
            </p>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
