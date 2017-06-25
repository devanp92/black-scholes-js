# Black-Scholes JS

This project serves as my pricing tool for European-style options in my trading algorithms.

I use the [IEX API](https://www.iextrading.com/developer/docs/) to get current stock price and [Quandl's US T bill rates](https://www.quandl.com/api/v3/datasets/USTREASURY/BILLRATES) to get the risk-free interest rates.

To use this, ensure that your Quandl API key is placed in `config.ts`.