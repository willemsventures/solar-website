const http = require('http');
const https = require('https');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const request = require('request');
const session = require('express-session')
const csrf = require('csurf')
const flatten = require('flat')
const uuidv4 = require('uuid/v4');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const fs = require('fs');
const bodyParser = require("body-parser");
const sxpApiHelper = require("@types/sxp-api-helper");
const asyncv3 = require('async');
const indexRouter = require('./routes/index');
const app = express();
const server = http.createServer(app);
const got = require('got'); // got@11
const CoinGecko = require('coingecko-api');
const CoinGeckoClient = new CoinGecko();


const {
    promisify
} = require('util');
const { response } = require('express');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'justsomerandomness1234',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 864000
    }
}));
app.use(csrf());
app.use(flash());
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

server.listen(8795);

const Blockchains = {
    byChainId: (chainId) => {if (chainId==1) {return Blockchains.Ethereum} else {return Blockchains.BSC}},
    Ethereum: {
        chainId: 1,
        name: "Ethereum",
        tokenAddress: "0x8ce9137d39326ad0cd6491fb5cc0cba0e089b6a9",
        knownWallets: {
            "0x0000000000000000000000000000000000000000":"Null address",
            "0x71f7505a78fd1e044ebf38ab6876700a907fc53a": "SXP Swap Contract",
            "0xaf04c95b6a5efa851136049203093468c197517c": "Swipe Founders (locked tokens)",
            "0x6c42c72e80481ad654e63d364bb9d86c90819a25": "Swipe Treasury (Binance)",
            "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance 8",
            "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14",
            "0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2": "FTX Exchange",
            "0xe93381fb4c4f14bda253907b18fad305d799241a": "Huobi 10"
        },
        custodiedWallets: ["0x6c42c72e80481ad654e63d364bb9d86c90819a25", "0xf977814e90da44bfa03b6295a0616a897441acec", "0x28c6c06298d514db089934071355e5743bf21d60"],
        otherExchangesWallets: ["0x2faf487a4414fe77e2327f0bf4ae2a264a776ad2", "0xe93381fb4c4f14bda253907b18fad305d799241a"]
    },
    BSC: {
        chainId: 56,
        name: "BSC",
        tokenAddress: "0x47bead2563dcbf3bf2c9407fea4dc236faba485a",
        knownWallets: {
            "0x0000000000000000000000000000000000001004":"BSC: Token Hub",
            "0xe2fc31f816a9b94326492132018c3aecc4a93ae1": "Binance: Hot wallet 7",
            "0x8894e0a0c962cb723c1976a4421c95949be2d4e3": "Binance: Hot wallet 6",
            "0x2ff3d0f6990a40261c66e1ff2017acbc282eb6d0": "Venus vSXP Token",
            "0xf977814e90da44bfa03b6295a0616a897441acec": "Binance: Hot Wallet 20",
            "0x00000000000000000000000000000000000010040": "BSC: Token Hub",
            "0x44cf30ea4e58818bfae4b8499be409cd4fdd5a20": "SXP Swap Contract",
            "0x47bead2563dcbf3bf2c9407fea4dc236faba485a": "Swipe: SXP Token"
        },
        custodiedWallets: ["0xe2fc31f816a9b94326492132018c3aecc4a93ae1", "0x8894e0a0c962cb723c1976a4421c95949be2d4e3", "0xf977814e90da44bfa03b6295a0616a897441acec"],
        otherExchangesWallets: []
    }
}

let TopBSCHolders = []
let TopETHHolders = []

function getLabel(address, chainId) {
    return Blockchains.byChainId(chainId).knownWallets[address]? Blockchains.byChainId(chainId).knownWallets[address] : undefined;
} 

async function getTopHolders(chainId) {
    
    const tokenByChain = {
        1: "0x8ce9137d39326ad0cd6491fb5cc0cba0e089b6a9",
        56:"0x47bead2563dcbf3bf2c9407fea4dc236faba485a"
    }

    function loadHolders(data) {
        if (data && data.items) {
                
            let top_holders = data.items.slice(0,10).map((item) => {
                return {address:item.address, balance: item.balance, label: getLabel(item.address, chainId), percentage: (100 * item.balance) / item.total_supply }
            })

            if (chainId == Blockchains.Ethereum.chainId) {
                TopETHHolders = top_holders
            } else {
                TopBSCHolders = top_holders
            }
        }
    }

    try {

        response = request.get(`https://api.covalenthq.com/v1/${chainId}/tokens/${tokenByChain[chainId]}/token_holders/?key=ckey_f3365976a84447f281ca1fdfd55`, (error, response, body) => {
            if (body.data && body.data.items) {
                fs.writeFileSync(`holders-${chainId}.json`, JSON.stringify(body));
                loadHolders(body.data)
            }
        });

    } catch {
        try {
            let rawHolders = fs.readFileSync(`holders-${chainId}.json`);
            let holders = JSON.parse(rawHolders)
            loadHolders(holders.data)
        } catch {
            console.error(`Couldn't get ${Blockchains.byChainId(chainId).name} holders neither locally nor from the API.`)
        }
    }
}

// setInterval(() => { // get top holders every 30 min
//     getTopHolders(Blockchains.Ethereum.chainId)
//     getTopHolders(Blockchains.BSC.chainId)
// }, 1800000)

// // get top holders now

getTopHolders(Blockchains.Ethereum.chainId)
getTopHolders(Blockchains.BSC.chainId)

//// Socket.io

const io = require('socket.io').listen(server);

//// sxpApiHelper
const sxpApi = sxpApiHelper.sxpApi;
const sxpapi = new sxpApi.default();

io.on('connection', function(socket) {

    /* covalent api */

    socket.on('getBSCholders', function(input) {
        (async () => {
            socket.emit('showBSCholders', {top_holders: TopBSCHolders})
        })()
    });

    socket.on('getETHholders', function(input) {
        (async () => {
            socket.emit('showETHholders', {top_holders: TopETHHolders})
        })()
    });

    socket.on('getBlockchainStats', function(input) {
        (async () => {
            let response = {
                wallet_count: 0,
                total_burned: 0,
                supply: 0,
                produced: 0,
                unswapped: 0,
                eth_binance_custody: 0,
                eth_other_exchanges: 0,
                bsc_binance_custody: 0,
                bsc_other_exchanges: 0
            }

            let rq_wallets = await (await fetch("https://sxp.mainnet.sh/api/wallets")).json()
            if (rq_wallets.meta) {
                response.wallet_count = rq_wallets.meta.totalCount
                response.unswapped = 520737576 - (rq_wallets.data[0].balance/100000000)
            }
            let rq_blockchain = await (await fetch("https://sxp.mainnet.sh/api/blockchain")).json()
            if (rq_blockchain.data.burned.total) {
                response.total_burned = rq_blockchain.data.burned.total;
                response.supply = rq_blockchain.data.supply
                response.produced = (response.supply - response.total_burned) - 52073757600000000;
            }

            response.bsc_binance_custody = TopBSCHolders.filter((holder) =>  Blockchains.BSC.custodiedWallets.indexOf(holder.address) >= 0).reduce((pv, cv) => { return pv + cv.percentage; }, 0)

            response.bsc_other_exchanges = TopBSCHolders.filter((holder) =>  Blockchains.BSC.otherExchangesWallets.indexOf(holder.address) >= 0).reduce((pv, cv) => { return pv + cv.percentage; }, 0)

            response.eth_binance_custody = TopETHHolders.filter((holder) =>  Blockchains.Ethereum.custodiedWallets.indexOf(holder.address) >= 0).reduce((pv, cv) => { return pv + cv.percentage; }, 0)

            response.eth_other_exchanges = TopETHHolders.filter((holder) =>  Blockchains.Ethereum.otherExchangesWallets.indexOf(holder.address) >= 0).reduce((pv, cv) => { return pv + cv.percentage; }, 0)
            console.log(response)
            socket.emit('showBlockchainStats', response)
        })()
    });

    /* sxp api */

    socket.on('getwallet', function(input) {
        (async() => {
           let response = await sxpapi.getWalletByID(input.walletId);
            const data = (response.data);
            const flatJson = {
                balance: (parseFloat(data.balance) / 100000000).toFixed(2)
            };
            socket.emit('showwallet', flatJson);
        })();

    });

    socket.on('getWalletSent', function(input) {

        (async() => {
           let response = await sxpapi.getWalletSentTransactions(input.walletId);

            const data = (response.data);
            const flatJson = [];

            for (let i = 0; i < data.length; i++) {
                let tempJson = {
                    nonce: data[i].nonce,
                    recipient: data[i].recipient? data[i].recipient : data[i].asset.transfers? data[i].asset.transfers.length > 1? `${data[i].asset.transfers.length} recipients` : `${data[i].asset.transfers[0].recipientId}` : "Other",
                    memo: data[i].memo == undefined ? '<span>-</span>' : data[i].memo,
                    amount: data[i].amount,
                    id: data[i].id,
                    timestamp: data[i].timestamp.human
                };
                flatJson.push(tempJson);
            }
            socket.emit('showWalletSent', flatJson);
        })();

    });
});