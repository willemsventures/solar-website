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

server.listen(8789);

//// Socket.io

const io = require('socket.io').listen(server);

//// sxpApiHelper
const sxpApi = sxpApiHelper.sxpApi;
const sxpapi = new sxpApi.default();

io.on('connection', function(socket) {
    /* sxp api */

    socket.on('getwallet', function(input) {
        (async() => {
            response = await sxpapi.getWalletByID(input.walletId);
            const data = (response.data);
            const flatJson = {
                balance: (parseFloat(data.balance) / 100000000).toFixed(2)
            };
            socket.emit('showwallet', flatJson);
        })();

    });
    socket.on('getWalletSent', function(input) {

        (async() => {
            response = await sxpapi.getWalletSentTransactions(input.walletId);

            const data = (response.data);
            const flatJson = [];

            for (let i = 0; i < data.length; i++) {
                let tempJson = {
                    nonce: data[i].nonce,
                    recipient: data[i].recipient,
                    memo: data[i].memo == undefined ? '<span>-</span>' : data[i].memo,
                    amount: data[i].amount,
                    id: data[i].id,
                    timestamp: data[i].timestamp.human
                };
                flatJson.push(tempJson);
                console.log(data[i].recipient)
            }
            socket.emit('showWalletSent', flatJson);
        })();

    });
});