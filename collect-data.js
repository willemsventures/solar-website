const fs = require("fs")

function getDateKey(unixtime) {
    return  `${(new Date(unixtime*1000)).getUTCMonth()+1}-${(new Date(unixtime*1000)).getUTCDate()}-${(new Date(unixtime*1000)).getUTCFullYear()}`
}

const getAllTransactions = async (stopOn) => {
    let transactions = {};
    let walletsDay = {};
    let pageCount = 1;
    let lastTx = "";
    let txMeta = await (await fetch(`https://sxp.mainnet.sh/api/transactions`)).json()
    if (txMeta.meta) {
        pageCount = txMeta.meta.pageCount
    }
    
    for (let index = 1; index <= pageCount; index++) {
        console.log(`Getting page ${index} from ${pageCount}`)
        let txRq = await (await fetch(`https://sxp.mainnet.sh/api/transactions?page=${index}`)).json()
        
        txRq.data.forEach((tx) => {
            
            if (walletsDay[getDateKey(tx.timestamp.unix)]) { 
                if (walletsDay[getDateKey(tx.timestamp.unix)].indexOf(tx.sender) == -1) {
                    walletsDay[getDateKey(tx.timestamp.unix)].push(tx.sender)
                }
            } else {
                walletsDay[getDateKey(tx.timestamp.unix)] = [tx.sender]
            }

            if (tx.id != "2b290b5c805517e701d4fcde43ab4cf4a27acfaed6beeb1e3481fa6464287dc7") {
                if (transactions[getDateKey(tx.timestamp.unix)]) {
                    if (tx.amount > 0) {
                        transactions[getDateKey(tx.timestamp.unix)].volume += parseInt(tx.amount)
                    }
                    transactions[getDateKey(tx.timestamp.unix)].transfers += 1
                } else {
                    transactions[getDateKey(tx.timestamp.unix)] = {transfers: 1, volume: tx.amount > 0? parseInt(tx.amount) : 0, wallets: 0}
                }
            }
            if (index == pageCount) {
                lastTx = txRq.data[txRq.meta.count-1].id
            }
        })
    }
    Object.keys(transactions).forEach((date_key) => {
        transactions[date_key].wallets = walletsDay[date_key].length
    })

    fs.writeFileSync("data/mainnet.json", JSON.stringify({lastPage: pageCount, transactions: transactions, lastTx: lastTx}))

}

function loadMainnetData() {
    JSON.parse(fs.readFileSync(`data/mainnet.json`))
}