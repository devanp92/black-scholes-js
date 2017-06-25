import {
    Stock
} from './stock';
import {
    OptionType
} from './optiontype';
const moment = require('moment');

export class Option {
    underlyingAsset ? : Stock;
    expiryDate: Date;
    strikePrice: number;
    type: OptionType;

    getTimeToExpiry(): number {
        return moment(this.expiryDate).diff(new Date(), 'years', true);
    }
}