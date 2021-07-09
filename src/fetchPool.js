"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var node_fetch_1 = require("node-fetch");
//@ts-ignore
var PromisePool = require("@supercharge/promise-pool");
var lodash = require("lodash");
var URL = "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=MSC2190011436";
var fetchPool = /** @class */ (function () {
    function fetchPool(concurrency) {
        this.waitingList = [];
        this.running = new Map();
        this.tmp = 0;
        this.concurrency = concurrency;
    }
    fetchPool.prototype.fetch = function (url, init) {
        var _this = this;
        var id = this.tmp++;
        if (this.running.size < this.concurrency) {
            var promise = new Promise(function (resolve, reject) {
                return node_fetch_1["default"](url, init).then(function (res) { return resolve(res); }, function (rej) { return reject(rej); });
            }).then(function (response) {
                _this.running["delete"](id);
                return response;
            });
            this.running.set(id, promise);
            return promise;
        }
        else {
        }
        //     .then(response => {
        //         return response;
        //     });
        // }
        //  const cb = function () {
        //      console.log(id + " called");
        //  };
        //  this.waitingList.push({ id, url, init, cb });
        //  this.populate();
        //  return new Promise(cb).then(
        //      async () => {
        //          console.log("resolve" + id);
        //          this.running.delete(id);
        //          this.populate();
        //          return await fetch(url, init);
        //      });
        // populate() {
        //     console.log("populatea");
        //     while (this.running.size < this.concurrency && this.waitingList.length > 0) {
        //         const task = this.waitingList.shift()!;
        //         const { cb } = task;
        //         cb();
        //     }
        // }
    };
    return fetchPool;
}());
// const pool = new fetchPool(10);
// (async () => {
//     console.log('start');
//     const x = (lodash.range(0, 1000).map(_ => pool.fetch(URL, { timeout: 1000 * 60 })));
//     const v = await Promise.all(x);
//     console.log(v);
// })();
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
PromisePool.withConcurrency(1)["for"](lodash.range(0, 100000)).process(function (v) { return __awaiter(void 0, void 0, void 0, function () {
    var res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, node_fetch_1["default"](URL)];
            case 1:
                res = _a.sent();
                console.log(v);
                console.log(res);
                return [2 /*return*/];
        }
    });
}); });
