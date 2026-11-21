const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');

test('invoice uses the same total and GST breakdown as checkout billing', () => {
  const order = {
    items: [
      { id: 1, name: 'Rice', hsn: '1006', price: 640, qty: 1 },
      { id: 2, name: 'Tea', hsn: '0902', price: 300, qty: 1 }
    ],
    coupon: 'WELCOME'
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(invoiced.subtotal, billed.subtotal);
  assert.equal(invoiced.discount, billed.discount);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.cgst, billed.cgst);
  assert.equal(invoiced.sgst, billed.sgst);
  assert.equal(invoiced.total, billed.total);
  assert.deepEqual(invoiced.rows.map(row => row.lineTax), billed.lines.map(line => line.tax));
});

test('invoice uses the HSN slab used by checkout pricing', () => {
  const order = {
    items: [{ id: 1, name: 'Rice', hsn: '1006', price: 100, qty: 1 }],
    coupon: ''
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(billed.tax, 5);
  assert.equal(billed.total, 105);
  assert.equal(invoiced.tax, 5);
  assert.equal(invoiced.total, 105);
  assert.equal(invoiced.rows[0].gstPercent, 5);
});

test('invoice applies the checkout coupon amount and tax calculation', () => {
  const order = {
    items: [{ id: 1, name: 'Goods', hsn: '1006', price: 2000, qty: 1 }],
    coupon: 'SAVE10'
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(billed.discount, 150);
  assert.equal(billed.tax, 92.5);
  assert.equal(billed.total, 1942.5);
  assert.equal(invoiced.discount, billed.discount);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
});

test('invoice line GST uses checkout tax after apportioned coupon discount', () => {
  const order = {
    items: [{ id: 1, name: 'Goods', price: 100, qty: 1 }],
    coupon: 'WELCOME'
  };

  const billed = pricing.computeTotals(order.items, order.coupon);
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.deepEqual(
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, total: billed.total },
    { subtotal: 100, discount: 5, tax: 17.1, total: 112.1 }
  );
  assert.equal(invoiced.rows[0].line, billed.lines[0].gross);
  assert.equal(invoiced.rows[0].lineTax, billed.lines[0].tax);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
});

test('invoice rendering does not flag a correctly recorded billed total', () => {
  const html = invoice.render({
    id: 42,
    date: '2026-11-21',
    total: 105,
    items: [{ name: 'Rice', hsn: '1006', price: 100, qty: 1 }]
  });

  assert.match(html, /Invoice Total<\/td><td class="r">₹105\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
