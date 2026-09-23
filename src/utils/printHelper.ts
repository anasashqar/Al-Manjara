/**
 * Universal A4 Isolated Printing Helper
 * Opens an isolated iframe, suppresses browser headers/footers, and prints cleanly.
 */
export function printElementToA4(elementId: string, documentTitle: string) {
  const elem = document.getElementById(elementId);
  if (!elem) {
    const originalTitle = document.title;
    document.title = documentTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
    return;
  }

  // Create isolated iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Gather stylesheet links and inline styles
  let styles = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((s) => {
    styles += s.outerHTML;
  });

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${documentTitle}</title>
      ${styles}
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        * {
          visibility: visible !important;
        }
        body {
          margin: 0 !important;
          padding: 12mm 14mm !important;
          background: white !important;
          color: #0f172a !important;
          font-family: 'ThmanyahSans', sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .no-print {
          display: none !important;
        }
      </style>
    </head>
    <body>
      ${elem.outerHTML}
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2500);
  }, 300);
}
