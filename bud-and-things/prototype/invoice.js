// BUD & THINGS · small helpers for the printed invoice: the amount in words (Indian style) and a Code 128 barcode as
// an SVG string. The same file runs in the browser and in tools/test-invoice.js.
(function (root) {
  'use strict';
  // ---------- amount in words ----------
  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
  const below1000 = (n) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n));
  function words(n) { // whole number, lakh and crore grouping
    if (n === 0) return 'Zero';
    const parts = []; const crore = Math.floor(n / 1e7); n %= 1e7; const lakh = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1e3); n %= 1e3;
    if (crore) parts.push(words(crore) + ' Crore'); if (lakh) parts.push(below100(lakh) + ' Lakh'); if (th) parts.push(below100(th) + ' Thousand'); if (n) parts.push(below1000(n));
    return parts.join(' ');
  }
  // paise (a whole number) -> "Rupees Five Hundred Ninety-Nine and Fifty Paise Only"
  function amountInWords(paise) {
    paise = Math.round(Number(paise) || 0); const neg = paise < 0; paise = Math.abs(paise);
    const r = Math.floor(paise / 100), p = paise % 100;
    return (neg ? 'Minus ' : '') + (r || !p ? 'Rupees ' + words(r) + (p ? ' and ' : '') : '') + (p ? below100(p) + ' Paise' : '') + ' Only';
  }

  // ---------- Code 128 (set B) ----------
  // bar and space widths for symbols 0 to 105, then the start-B symbol is 104 and the stop is the last entry
  const PAT = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232'.split(' ');
  const STOP = '2331112', START_B = 104;
  // the list of bar / space widths (in modules), starting with a bar, for printable ASCII text
  function code128Widths(text) {
    const s = String(text == null ? '' : text); const codes = [START_B]; let sum = START_B;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i) - 32; if (c < 0 || c > 94) throw new Error('Code 128 B draws only printable ASCII, not "' + s[i] + '"'); codes.push(c); sum += c * (i + 1); }
    codes.push(sum % 103);
    return codes.map((c) => PAT[c]).concat(STOP).join('').split('').map(Number);
  }
  // the barcode as an SVG string, quiet zone included. `height` in px, `module` px per module
  function code128Svg(text, opts) {
    opts = opts || {}; const w = code128Widths(text); const mod = opts.module || 2; const h = opts.height || 44; const quiet = 10;
    let x = quiet, d = ''; w.forEach((n, i) => { if (i % 2 === 0) d += 'M' + x * mod + ' 0h' + n * mod + 'v' + h + 'h-' + n * mod + 'z'; x += n; });
    const width = (x + quiet) * mod;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + h + '" width="' + width + '" height="' + h + '" role="img" aria-label="Barcode of ' + String(text).replace(/[&<>"']/g, '') + '" shape-rendering="crispEdges"><rect width="' + width + '" height="' + h + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }

  const api = { amountInWords, code128Widths, code128Svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BTInvoice = api;
})(typeof window !== 'undefined' ? window : globalThis);
