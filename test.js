"use strict";
const Promise = require('bluebird');
const mongoose = require('mongoose');       // tested with v5.0.7 + mongo driver 3.0.2
mongoose.Promise = require('bluebird');

const N_DBS = 20000;
const N_COLLECTIONS = 10;

function log(...args) {
    console.log("", new Date(), ...args);
}

class DbConn {
    constructor(dbName) {
        this.dbName = dbName;
    }

    init() {
        let self = this;
        let sslEnabled = false;
        let connectionOptions = {
            ssl: sslEnabled,
            ignoreUndefined: true
        };
        let authConfig = {user: 'admin', pass: 'XXXXXXXXXXXXXXXXXXXX', db: 'admin'};
        let user = authConfig.user;
        let pass = authConfig.pass;
        if (user && pass) {
            connectionOptions.user = user;
            connectionOptions.pass = pass;
        }
        let url = `mongodb://XXXXXXXXXXXXXXXXXXX/${self.dbName}?user=${authConfig.user}&authSource=${authConfig.db}&ssl=${connectionOptions.ssl}`;     // 'user' was added to the URI only for debug
        return new Promise((resolve, reject) => {
            self.connection = mongoose.createConnection(url, connectionOptions, err => {
                if (err) {
                    log(`ERROR connecting to DB: ${self.dbName}, err: ${err}`);
                    reject(err);
                } else {
                    resolve(self);
                }
            });
        })
    }

    terminate() {
        let self = this;
        return self.connection.close().then(function () {
            self.connection.removeAllListeners();
            for (let model in self.connection.collections) {
                delete self.connection.models[model];
                delete self.connection.collections[model];
                delete self.connection.base.modelSchemas[model];
            }
            self.connection.models = null;
            self.connection.collections = null;
            self.connection.base = null;
            self.connection.db = null;
        });
    }

    dropDb() {
        return this.connection.db.dropDatabase();
    }
}

async function test(i) {
    let t0 = new Date();
    log("start", i);
    let conn = await (new DbConn('DB_' + i)).init();
    log("connected", i);
    for (let j = 0; j < N_COLLECTIONS; j++) {
        log("collection", j);
        await conn.connection.db.collection('test_' + j).createIndex({a: 1, b: 1, c: 1});
        await conn.connection.db.collection('test_' + j).createIndex({b: 1, a: 1, c: 1});
        await conn.connection.db.collection('test_' + j).createIndex({c: 1, b: 1, a: 1});
        await conn.connection.db.collection('test_' + j).createIndex({a: 1, c: 1, b: 1});
        await conn.connection.db.collection('test_' + j).createIndex({b: 1, c: 1, a: 1});
        await conn.connection.db.collection('test_' + j).createIndex({c: 1, a: 1, b: 1});
        await conn.connection.db.collection('test_' + j).insert({a: 1, b: 2, c: 3});
    }
    for (let j = 0; j < N_COLLECTIONS; j++) {
        log("drop collection", j);
        await conn.connection.db.dropCollection('test_' + j);
    }
    log("drop", i);
    await conn.dropDb('DB_' + i);
    await conn.terminate();
    log("finish", i, '|', new Date() - t0);
    //await Promise.delay(10);    
}

async function testAll() {
    for (let i = 0; i < N_DBS; i++) {
        await test(i);
    }
}

testAll();
