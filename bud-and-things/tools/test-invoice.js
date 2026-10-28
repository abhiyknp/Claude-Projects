// Tests prototype/invoice.js: the amount in words and the Code 128 barcode on the printed invoice.
//   node bud-and-things/tools/test-invoice.js
const path = require('path'), assert = require('assert');
const inv = require(path.join(__dirname, '..', 'prototype', 'invoice.js'));
const W = inv.amountInWords;
assert.strictEqual(W(0), 'Rupees Zero Only');
assert.strictEqual(W(100), 'Rupees One Only');
assert.strictEqual(W(59900), 'Rupees Five Hundred Ninety-Nine Only');
assert.strictEqual(W(59950), 'Rupees Five Hundred Ninety-Nine and Fifty Paise Only');
assert.strictEqual(W(5), 'Five Paise Only');
assert.strictEqual(W(1900), 'Rupees Nineteen Only');
assert.strictEqual(W(10100), 'Rupees One Hundred One Only');
assert.strictEqual(W(12345600), 'Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Only');
assert.strictEqual(W(1234567800), 'Rupees One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only');
assert.strictEqual(W(-250000), 'Minus Rupees Two Thousand Five Hundred Only');
// Code 128 B: matches the output of the python-barcode library for "Bt/ab-xy" (checked when this test was written)
const bits = (t) => { let s = ''; inv.code128Widths(t).forEach((n, i) => { s += (i % 2 ? '0' : '1').repeat(n); }); return s; };
assert.strictEqual(bits('Bt/ab-xy'), '110100100001000101100010011110100101110011001001011000010010000110100110111001111001001011011011110100101111001100011101011');
// every symbol is 11 modules wide, the stop is 13: start + n characters + checksum + stop
const t = 'BT/26-27/0001'; assert.strictEqual(inv.code128Widths(t).reduce((a, b) => a + b, 0), 11 * (t.length + 2) + 13);
assert.throws(() => inv.code128Widths('Ré'), /printable ASCII/);
const svg = inv.code128Svg(t); assert.ok(/^<svg /.test(svg) && /aria-label="Barcode of BT\/26-27\/0001"/.test(svg) && !/<script/.test(svg));
console.log('Invoice checks passed.');
