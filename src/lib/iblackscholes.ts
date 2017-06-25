export interface IBlackScholes {
    standardDeviation ? : number;

    delta(): number | null;
    gamma(): number | null;
    theta(): number | null;
    rho(): number | null;
    vega(): number | null;
    value(): number | null;
}