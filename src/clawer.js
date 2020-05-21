"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var cheerio = require("cheerio");
var fs = require("fs");
var immutable_1 = require("immutable");
var stringify = require("json-stable-stringify");
var JSON5 = require("json5");
var node_fetch_1 = require("node-fetch");
var nullthrows_1 = require("nullthrows");
var Constants_1 = require("./Constants");
var DATA_FILE_PATH = __dirname + "/data.json5";
var BASE_URL = "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=";
var getCaseID = function (center_name, two_digit_yr, day, code, case_serial_numbers) {
    return center_name +
        two_digit_yr.toString() +
        day.toString() +
        code.toString() +
        case_serial_numbers.toString().padStart(4, "0");
};
var getStatus = function (url) { return __awaiter(void 0, void 0, void 0, function () {
    var f, t_1, status_regexp, status_1, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                return [4 /*yield*/, node_fetch_1["default"](url)];
            case 1:
                f = _c.sent();
                return [4 /*yield*/, f.text()];
            case 2:
                t_1 = _c.sent();
                status_regexp = new RegExp("(?<=<h1>).*(?=</h1>)");
                status_1 = nullthrows_1["default"](status_regexp.exec(cheerio.load(t_1)(".text-center").html()))[0];
                return [2 /*return*/, status_1 === ""
                        ? null
                        : {
                            status: status_1,
                            formType: (_b = Constants_1["default"].FORM_TYPES.find(function (form) { return t_1.includes(form); })) !== null && _b !== void 0 ? _b : "unknown form type"
                        }];
            case 3:
                _a = _c.sent();
                return [2 /*return*/, null];
            case 4: return [2 /*return*/];
        }
    });
}); };
var getLastCaseNumber = function (center_name, two_digit_yr, day, code) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, low, high, mid, result;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = [0, 4000], low = _a[0], high = _a[1];
                _b.label = 1;
            case 1:
                if (!(low < high)) return [3 /*break*/, 3];
                mid = Math.floor((low + high) / 2);
                return [4 /*yield*/, getStatus(BASE_URL + getCaseID(center_name, two_digit_yr, day, code, mid))];
            case 2:
                result = _b.sent();
                if (result) {
                    low = mid + 1;
                }
                else {
                    high = mid;
                }
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/, low - 1];
        }
    });
}); };
var claw = function (center_name, two_digit_yr, day, code) { return __awaiter(void 0, void 0, void 0, function () {
    var today, last, results, counter, json5_obj, new_json5_obj;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                today = 18402;
                return [4 /*yield*/, getLastCaseNumber(center_name, two_digit_yr, day, code)];
            case 1:
                last = _a.sent();
                if (last <= 0) {
                    console.log("No entires for " + center_name + " day " + day);
                    return [2 /*return*/];
                }
                console.log("Loading " + last + " entires for " + center_name + " day " + day);
                return [4 /*yield*/, Promise.all(Array.from(new Array(last), function (x, i) { return i + 1; }).map(function (case_number) {
                        return getStatus(BASE_URL +
                            getCaseID(center_name, two_digit_yr, day, code, case_number));
                    }))];
            case 2:
                results = (_a.sent())
                    .filter(function (x) { return x != null; })
                    .map(function (x) { return nullthrows_1["default"](x); });
                counter = results
                    .reduce(function (counter, res) {
                    var _a;
                    var key = center_name + "|" + two_digit_yr + "|" + day + "|" + code + "|" + res.formType + "|" + res.status;
                    return counter.set(key, 1 + ((_a = counter.get(key)) !== null && _a !== void 0 ? _a : 0));
                }, immutable_1["default"].Map())
                    .map(function (val) {
                    var _a;
                    return (_a = {}, _a[today] = val, _a);
                })
                    .toObject();
                json5_obj = JSON5.parse(fs.readFileSync(DATA_FILE_PATH, { encoding: "utf8" }));
                new_json5_obj = __assign({}, json5_obj);
                Object.entries(counter).forEach(function (_a) {
                    var key = _a[0], count = _a[1];
                    var _b;
                    new_json5_obj[key] = __assign(__assign({}, ((_b = new_json5_obj[key]) !== null && _b !== void 0 ? _b : {})), count);
                });
                fs.writeFileSync(DATA_FILE_PATH, 
                // @ts-ignore: solve export issue for json stable stringify
                JSON5.stringify(JSON5.parse(stringify(new_json5_obj)), {
                    space: 2,
                    quote: '"'
                }), { encoding: "utf8" });
                return [2 /*return*/];
        }
    });
}); };
var _loop_1 = function (d) {
    Promise.all(Constants_1["default"].CENTER_NAMES.map(function (name) { return claw(name, 20, d, 5); }));
};
for (var d = 152; d < 200; d++) {
    _loop_1(d);
}
