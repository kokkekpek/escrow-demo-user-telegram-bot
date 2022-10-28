import {Address, BOC, Builder, Cell, Coins, Contracts} from 'ton3'
import escrow from '../build/escrow.base64'

export enum Operations {
    Transfer = 0,
    Initialization = 1,
    Accept = 2,
    Reject = 3
}

export type InitialDataConfig = {
    guarantors: {
        guarantor: Address,
        deadline: number | bigint,
        guarantorFallback: Address,
        deadlineFallback: number | bigint,
        royalty: Coins
    },
    initialized: number | bigint,
    nonce: number | bigint,
    value: Coins,
    seller: Address,
    buyer: Address
}

export type MessageParams = {
    state: Cell
    body: Cell
}

function initialData(config: InitialDataConfig): Cell {
    const guarantors: Cell = new Builder()
        .storeAddress(config.guarantors.guarantor)
        .storeUint(config.guarantors.deadline, 64)
        .storeAddress(config.guarantors.guarantorFallback)
        .storeUint(config.guarantors.deadlineFallback, 64)
        .storeCoins(config.guarantors.royalty)
        .cell()
    return new Builder()
        .storeRef(guarantors)
        .storeUint(config.initialized, 1)
        .storeUint(config.nonce, 256)
        .storeCoins(config.value)
        .storeAddress(config.seller)
        .storeAddress(config.buyer)
        .cell()
}

export default class Escrow extends Contracts.ContractBase {
    constructor(workchain: number, config: InitialDataConfig) {
        const storage: Cell = initialData(config)
        const code: Cell = BOC.fromStandard(escrow)
        super({
            code,
            workchain,
            storage
        })
    }

    public deployMessage(): MessageParams {
        return {
            state: this.state,
            body: new Builder().storeUint(Operations.Initialization, 32).cell()
        }
    }
}