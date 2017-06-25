import {
  test
} from 'ava'
import {
  Stock,
  BlackScholes,
  Option,
  OptionType
} from 'black-scholes-js';

let blackScholes;
let stock;
let option;

test.beforeEach('construct black scholes', t => {
  stock = new Stock();
  stock.symbol = "fb";
  stock.price = 100;

  option = new Option();
  option.expiryDate = new Date('2017-07-24');
  option.underlyingAsset = stock;
  option.strikePrice = 100;
  option.type = OptionType.Call;

  blackScholes = new BlackScholes(stock, option, .1, .06);
});

test('construct', t => {
  t.deepEqual(stock, blackScholes.stock);
  t.deepEqual(option, blackScholes.option);
});

test('delta', t => {
  const delta = blackScholes.delta();
  t.true(delta >= .300 && delta <= .600);
});

test('gamma', t => {
  const gamma = blackScholes.gamma();
  t.true(gamma >= .100 && gamma <= .150);
});

test('vega', t => {
  const vega = blackScholes.vega();
  t.true(vega >= 11.000 && vega <= 12.000);
});

test('rho', t => {
  const rho = blackScholes.rho();
  t.true(rho >= 4.00 && rho <= 5.00);
});

test('theta', t => {
  const theta = blackScholes.theta();
  t.true(theta >= -13 && theta <= -12.000);
});

test('value', t => {
  const value = blackScholes.value();
  t.true(value >= 1.3 && value <= 1.4);
});

test('get current price', async t => {
  const data = await blackScholes.getCurrentPrice('fb');
  t.true(typeof data === 'number');
});

// Uncomment if key is present
// test('risk rate', async t => {
//   const data = await blackScholes.getRiskRate();
//   t.true(typeof data === 'number');
// });