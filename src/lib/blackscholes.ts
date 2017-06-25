const request = require('supertest');
const moment = require('moment');

import {
    Stock
} from './stock';
import {
    OptionType
} from "./optiontype";
import {
    IBlackScholes
} from './iblackscholes';
import {
    Option
} from "./option";
import {
    NormalDist
} from './normaldist';
import {
    Config
} from './config';

export class BlackScholes implements IBlackScholes {
    stock: Stock;
    option: Option;
    riskFree: number;
    deviation: number;

    constructor(stock: Stock, option: Option, deviation: number, riskFree: number) {
        this.deviation = deviation;
        this.riskFree = riskFree;
        this.option = option;

        if (stock === null || stock === undefined) {
            throw new Error('Parameter stock is undefined');
        }

        if (stock.price === null || stock.price === undefined) {
            this.getCurrentPrice(stock.symbol)
                .then(price => stock.price = price);
        }

        this.stock = stock;
    }

    /**
     * First partial derivative of stock price
     * (velocity)
     */
    delta(): number | null {
        if (this.d1 === null) {
            return null;
        }

        const delta = NormalDist.cdf(this.d1);

        return _toFixed(delta, 3);
    }

    /**
     * Second partial derivative of Stock price movement
     * (acceleration)
     */
    gamma(): number | null {
        if (this.normPDFD1 === null) {
            return null;
        }

        const gamma = NormalDist.pdf(this.normPDFD1) /
            (this.stock.price *
                this.deviation *
                Math.sqrt(this.option.getTimeToExpiry()));

        return _toFixed(gamma, 3);
    }

    /**
     * First partial derivative of time to maturity
     * (time decay)
     * Theta of value -10 means the option is losing $10 in time value each day.
     */
    theta(): number | null {
        if (this.d2 === null) {
            return null;
        }

        if (this.d1 === null) {
            return null;
        }

        if (this.normPDFD1 === null) {
            return null;
        }

        const sign = this.option.type === OptionType.Call ?
            1 :
            -1;

        const theta = (-1 *
                this.stock.price *
                NormalDist.cdf(this.d1) *
                this.deviation /
                (2 *
                    Math.sqrt(this.option.getTimeToExpiry()))) -
            (sign *
                this.riskFree *
                this.option.strikePrice *
                Math.exp(-1 * this.riskFree * this.option.getTimeToExpiry()) *
                NormalDist.pdf(sign * this.d2));

        return _toFixed(theta, 3);
    }

    /**
     * First partial derivative of risk-free rate
     * How much a change in 1% of interest rates impacts the option's price
     */
    rho(): number | null {
        if (this.d2 === null) {
            return null;
        }

        const sign = this.option.type === OptionType.Call ?
            1 :
            -1;

        const expiryTime = this.option.getTimeToExpiry();

        const rho = sign *
            this.option.strikePrice *
            expiryTime *
            Math.exp(-1 * this.riskFree * expiryTime) *
            NormalDist.cdf(sign * this.d2);

        return _toFixed(rho, 3);
    }

    /**
     * First partial derivative of deviation (volatility)
     * How much a change in 1% of the underlying assets impacts the option's price
     */
    vega(): number | null {
        if (this.d1 === null) {
            return null;
        }

        if (this.d2 === null) {
            return null;
        }

        const expiryTime = this.option.getTimeToExpiry();

        const vega = this.stock.price *
            Math.sqrt(this.option.getTimeToExpiry()) *
            NormalDist.pdf(this.d1);

        return _toFixed(vega, 3);
    }

    value(): number | null {
        if (this.d1 === null) {
            return null;
        }

        if (this.d2 === null) {
            return null;
        }

        // One day
        const minTimeToExpire = 1 / 365;

        const sign = this.option.type === OptionType.Call ?
            1 :
            -1;

        if (this.option.getTimeToExpiry() < minTimeToExpire) {
            return Math.max(sign * (this.stock.price - this.option.strikePrice), 0);
        }

        const priceNorm = this.stock.price * NormalDist.cdf(sign * this.d1);
        const strikeRisk = this.option.strikePrice * Math.exp(-1 * this.riskFree * this.option.getTimeToExpiry()) * NormalDist.cdf(sign * this.d2);

        if (this.option.type === OptionType.Call) {
            return priceNorm - strikeRisk;
        } else {
            return strikeRisk - priceNorm;
        }
    }

    get d1(): number | null {
        const timeToExpiry = this.option.getTimeToExpiry();

        if (timeToExpiry < 0) {
            return null;
        }

        return (Math.log(this.stock.price / this.option.strikePrice) +
                (this.riskFree +
                    Math.pow(this.deviation, 2) / 2) *
                timeToExpiry) /
            (this.deviation * Math.sqrt(timeToExpiry));
    }

    get d2(): number | null {
        const d1 = this.d1;

        if (d1 === null) {
            return null;
        }

        return d1 - (this.deviation * Math.sqrt(this.option.getTimeToExpiry()));
    }

    get normPDFD1(): number | null {
        if (this.d1 === null) {
            return null;
        }

        return NormalDist.pdf(this.d1);
    }

    /**
     * Gets the closest maturing Treasury Bill for option's expiry date
     * I access this data via Quandl
     */
    async getRiskRate() {
        const res = await request('https://www.quandl.com')
            .get(`/api/v3/datasets/USTREASURY/BILLRATES.json?api_key=${Config.quandlAPIKey}`);

        const data = JSON.parse(res.text).dataset.data[0];

        const expiryTime = moment(this.option.expiryDate).diff(new Date(), 'weeks', true);

        if (expiryTime < 0) {
            throw new Error('Option has already expired');
        }

        const mid4And13 = (13 - 4) / 2;
        const mid13And26 = (26 - 13) / 2;
        const mid26And52 = (52 - 26) / 2;

        // Index: Num weeks out
        // 1: 4wk
        // 3: 13wk
        // 5: 26wk
        // 7: 52wk

        if (expiryTime <= mid4And13) {
            return data[1];
        } else if (expiryTime <= mid13And26) {
            return data[3];
        } else if (expiryTime <= mid26And52) {
            return data[5];
        } else {
            return data[7];
        }
    }

    /**
     * Get the last official price from IEX API
     */
    async getCurrentPrice(symbol: string) {
        const res = await request('https://api.iextrading.com/1.0/')
            .get(`tops?symbols=${symbol}`);

        const data = res.body;
        if (data === null || data === undefined ||
            data[0] === null || data[0] === undefined) {
            throw new Error('Cannot find the stock price.');
        }

        return data[0].lastSalePrice;
    }
}

function _toFixed(x: number, numDigits: number) {
    const powerOfTen = Math.pow(10, numDigits);
    const roundedToNearestNth = Math.round(x * powerOfTen) / powerOfTen;

    return parseFloat(roundedToNearestNth.toFixed(numDigits));
}