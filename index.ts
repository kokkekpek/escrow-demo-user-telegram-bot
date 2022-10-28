// BAD CODE
// it was done quickly on the knee

import {Message} from 'node-telegram-bot-api'
import TelegramBot from 'node-telegram-bot-api'
import token from './config/token'
import {Address, BOC, Builder, Coins, Utils} from 'ton3';
import Escrow, {InitialDataConfig, MessageParams, Operations} from './src/contract'
import crypto from 'crypto'
import * as qs from 'qs'
// import {TonClient, Address as TONAddress} from "ton";

const bot: TelegramBot = new TelegramBot(token, {polling: true})
const help: string = `You can use commands:

/help - help
/create - create escrow contract
/accept - accept escrow transfer
/reject - reject escrow transfer`

const createHelp1: string = `You can create escrow contract using this variables:

/create {\`seller\`} {\`buyer\`} {\`guarantor\`} {\`value\`} {\`royalty\`}

\`seller\` - seller wallet address
\`buyer\` - your wallet address
\`guarantor\` - your wallet address
\`value\` - price in TON. Must be > 0
\`royalty\` - guarantor royalty in TON. Must be > value

Example:`
const createHelp2: string = `/create EQAAAw3fAcnvz7iAJ0zcq72O_4Pv_bDaJx3TkHDLxxoZkJdC EQAAAw3fAcnvz7iAJ0zcq72O_4Pv_bDaJx3TkHDLxxoZkJdC EQAAAw3fAcnvz7iAJ0zcq72O_4Pv_bDaJx3TkHDLxxoZkJdC 0.1 0.01`
const acceptHelp: string = `You can accept escrow using this variables:

/accept {\`escrow\`}

\`escrow\` - deployed escrow address`
const rejectHelp: string = `You can reject escrow using this variables:

/reject {\`escrow\`}

\`escrow\` - deployed escrow address`

bot.onText(/\/help/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return
    await bot.sendMessage(msg.chat.id, help).then()
})

bot.onText(/\/create$/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return
    await bot.sendMessage(msg.chat.id, createHelp1, { parse_mode: 'Markdown' }).then()
    await bot.sendMessage(msg.chat.id, createHelp2, { parse_mode: 'Markdown' }).then()
})

bot.onText(/\/accept$/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return
    await bot.sendMessage(msg.chat.id, acceptHelp, { parse_mode: 'Markdown' }).then()
})

bot.onText(/\/reject$/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return
    await bot.sendMessage(msg.chat.id, rejectHelp, { parse_mode: 'Markdown' }).then()
})

bot.onText(/^\/create (.+) (.+) (.+) (.+) (.+)/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return

    const seller: string = match[1]
    const buyer: string = match[2]
    const guarantor: string = match[3]
    const value: string = match[4]
    const royalty: string = match[5]
    if (!Address.isValid(seller)) {
        await bot.sendMessage(msg.chat.id, `Invalid seller address: ${seller}`)
        return
    }
    if (!Address.isValid(buyer)) {
        await bot.sendMessage(msg.chat.id, `Invalid buyer address: ${buyer}`)
        return
    }
    if (!Address.isValid(guarantor)) {
        await bot.sendMessage(msg.chat.id, `Invalid guarantor address: ${guarantor}`)
        return
    }
    if (isNaN(parseFloat(value))) {
        await bot.sendMessage(msg.chat.id, `Invalid value: ${value}`)
        return
    }
    if (isNaN(parseFloat(royalty))) {
        await bot.sendMessage(msg.chat.id, `Invalid royalty: ${royalty}`)
        return
    }
    const config: InitialDataConfig = {
        initialized: 0,
        nonce: randomUint256(),
        value: new Coins(parseFloat(value)),
        seller: new Address(seller),
        buyer: new Address(buyer),
        guarantors: {
            guarantor: new Address(guarantor),
            deadline: Date.now() + 30 * 24 * 60 * 60,
            guarantorFallback: new Address(guarantor),
            deadlineFallback:  Date.now() + 60 * 24 * 60 * 60,
            royalty: new Coins(parseFloat(royalty))
        }
    }

    const escrow = new Escrow(0, config)
    const message: MessageParams = escrow.deployMessage()

    const link: string = 'https://test.tonhub.com/transfer/'
        + escrow.address.toString('base64', { bounceable: true, testOnly: true })
        + '?'
        + qs.stringify({
            text: 'deploy',
            amount: Math.floor((parseFloat(value) + 0.02) * 1_000_000_000).toString(),
            bin: BOC.toBase64Standard(message.body),
            init: BOC.toBase64Standard(message.state)
        })
    await bot.sendMessage(msg.chat.id, escrow.address.toString(), {
        reply_markup: {
            inline_keyboard: [[{
                text: `Create escrow`,
                callback_data: 'callbackData',
                url: link,
            }]]
        }
    })
})

bot.onText(/^\/accept (.+)/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return
    if (!msg) return

    const address: string = match[1]
    if (!Address.isValid(address)) {
        await bot.sendMessage(msg.chat.id, `Invalid escrow address: ${address}`)
        return
    }

    const link: string = 'https://test.tonhub.com/transfer/'
        + address
        + '?'
        + qs.stringify({
            text: 'deploy',
            amount: Math.floor(0.02 * 1_000_000_000).toString(),
            bin: BOC.toBase64Standard(new Builder().storeUint(Operations.Accept, 32).cell())
        })
    await bot.sendMessage(msg.chat.id, address, {
        reply_markup: {
            inline_keyboard: [[{
                text: `Accept escrow`,
                callback_data: 'callbackData',
                url: link,
            }]]
        }
    })
})

bot.onText(/^\/reject (.+)/, async (msg: Message, match: RegExpExecArray | null) => {
    if (!match) return
    if (!msg) return

    const address: string = match[1]
    if (!Address.isValid(address)) {
        await bot.sendMessage(msg.chat.id, `Invalid escrow address: ${address}`)
        return
    }

    const link: string = 'https://test.tonhub.com/transfer/'
        + address
        + '?'
        + qs.stringify({
            text: 'deploy',
            amount: Math.floor(0.02 * 1_000_000_000).toString(),
            bin: BOC.toBase64Standard(new Builder().storeUint(Operations.Reject, 32).cell())
        })
    await bot.sendMessage(msg.chat.id, address, {
        reply_markup: {
            inline_keyboard: [[{
                text: `Reject escrow`,
                callback_data: 'callbackData',
                url: link,
            }]]
        }
    })
})
//
// bot.onText(/^\/info (.+)/, async (msg: Message, match: RegExpExecArray | null) => {
//     if (!match) return
//     if (!msg) return
//
//     const address: string = match[1]
//     if (!Address.isValid(address)) {
//         await bot.sendMessage(msg.chat.id, `Invalid escrow address: ${address}`)
//         return
//     }
//
//     const client: TonClient = new TonClient({endpoint: 'https://sandbox.tonhubapi.com/jsonRPC'})
//     try {
//         const result = await client.callGetMethod(TONAddress.parse(address), 'info')
//         console.log(result.stack[3][1].object)
//         console.log(result.stack[4][1].object)
//         console.log(result.stack[5][1].object)
//     } catch (e: any) {
//         console.log(e)
//         await bot.sendMessage(msg.chat.id, 'Fail. Can not read contract info')
//     }
// })

function randomUint256(): bigint {
    return BigInt(`0x${Utils.Helpers.bytesToHex(crypto.randomBytes(32))}`)
}