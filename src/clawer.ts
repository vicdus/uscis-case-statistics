import * as cheerio from "cheerio";
import * as fs from "fs";
import * as https from "https";
import * as Immutable from "immutable";
import * as stringify from "json-stable-stringify";
import * as JSON5 from "json5";
import * as lodash from "lodash";

//@ts-ignore
import * as PromisePool from "@supercharge/promise-pool";
import fetch, { FetchError } from "node-fetch";
import nullthrows from "nullthrows";

import Constants from "./Constants";

https.globalAgent.options.rejectUnauthorized = false;

// const DATA_FILE_PATH = __dirname + "/data.json5";
const BASE_URL =
  "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=";
const today = Math.floor((new Date().getTime() - 3600 * 1000 * 7) / 86400000);

// 4 digit serial number
type CaseNumberFormat = "center-year-day-code-serial"  // i-797
  | "center-year-code-day-serial"; // i-485

const DATA_FILE_PATH: Map<CaseNumberFormat, string> = new Map([
  ["center-year-day-code-serial", __dirname + "/data.json5"],
  ["center-year-code-day-serial", __dirname + "/data485.json5"],
]);

const getCaseID = (
  center_name: string,
  two_digit_yr: number,
  day: number,
  code: number,
  case_serial_numbers: number,
  case_number_format: CaseNumberFormat
): string => {
  switch (case_number_format) {
    case "center-year-code-day-serial":
      return center_name +
        two_digit_yr.toString() +
        code.toString() +
        day.toString().padStart(3, "0") +
        case_serial_numbers.toString().padStart(4, "0");
    case "center-year-day-code-serial":
      return center_name +
        two_digit_yr.toString() +
        day.toString().padStart(3, "0") +
        code.toString() +
        case_serial_numbers.toString().padStart(4, "0");
  }
};


const getStatus = async (
  url: string,
  retry: number = 3
): Promise<{ status: string; formType: string; } | null> => {
  if (retry <= 0) {
    console.log(`Request for ${url} failed too many times`);
    return null;
  }
  try {
    // 60 seconds timeout. always retry if timetout
    const f = await fetch(url, { timeout: 1000 * 30 });
    const t = await f.text();
    const status_regexp = new RegExp("(?<=<h1>).*(?=</h1>)");
    const status = nullthrows(
      status_regexp.exec(cheerio.load(t)(".text-center").html() as string)
    )[0];
    return status === ""
      ? null
      : {
        status,
        formType:
          Constants.FORM_TYPES.find((form) => t.includes(form)) ??
          "unknown form type",
      };
  } catch (e) {
    if (e instanceof FetchError && e.message.includes('timeout')) {
      console.log('timeout! ' + url);
      return getStatus(url, retry - 1);
    } else {
      console.log(e + " " + url);
      return null;
    }
  }
};

const getLastCaseNumber = async (
  center_name: string,
  two_digit_yr: number,
  day: number,
  code: number,
  case_number_format: CaseNumberFormat
): Promise<number> => {
  let [low, high] = [1, 1];
  while (
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 1, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 2, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 3, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 4, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 5, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 6, case_number_format)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 7, case_number_format)
    ))
  ) {
    [low, high] = [high, high * 2];
  }

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const result = await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, mid, case_number_format)
    );
    if (result) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low - 1;
};

const claw = async (
  center_name: string,
  two_digit_yr: number,
  day: number,
  code: number,
  format: CaseNumberFormat
): Promise<void> => {
  const path = DATA_FILE_PATH.get(format)!;
  const last = await getLastCaseNumber(center_name, two_digit_yr, day, code, format);
  if (last <= 0) {
    console.log(`No entires for ${center_name} day ${day}`);
    return;
  }

  console.log(`Loading ${last} entires for ${center_name} day ${day}`);
  const results = (await PromisePool.withConcurrency(1000).for(lodash
    .range(1, last + 1))
    .process(case_number => getStatus(BASE_URL + getCaseID(center_name, two_digit_yr, day, code, case_number, format))))
    .results
    .filter(Boolean)
    .map((x) => nullthrows(x));

  // const results = (
  //   await Promise.all(
  //     lodash
  //       .range(1, last + 1)
  //       .map((case_number) =>
  //         getStatus(
  //           BASE_URL +
  //           getCaseID(center_name, two_digit_yr, day, code, case_number, format)
  //         )
  //       )
  //   )
  // )
  // .filter(Boolean)
  // .map((x) => nullthrows(x));

  const counter = results
    .reduce((counter, res) => {
      const key = `${center_name}|${two_digit_yr}|${day}|${code}|${res.formType}|${res.status}`;
      return counter.set(key, 1 + (counter.get(key) ?? 0));
    }, Immutable.Map<string, number>())
    .map((val) => ({ [today]: val }))
    .toObject();

  const json5_obj = JSON5.parse(
    fs.readFileSync(path, { encoding: "utf8" })
  );

  const new_json5_obj = { ...json5_obj };

  Object.entries(counter).forEach(([key, count]) => {
    new_json5_obj[key] = { ...(new_json5_obj[key] ?? {}), ...count };
  });

  Object.entries(new_json5_obj).forEach(([key, count]) => {
    new_json5_obj[key] = lodash.pickBy(new_json5_obj[key], (_count, day) => Math.abs(Number.parseInt(day) - today) <= 14);
    if (lodash.isEmpty(new_json5_obj[key])) {
      delete new_json5_obj[key];
    }
  });

  fs.writeFileSync(
    path,
    // @ts-ignore: solve export issue for json stable stringify
    JSON5.stringify(JSON5.parse(stringify(new_json5_obj)), {
      space: 2,
      quote: '"',
    }),
    { encoding: "utf8" }
  );
  console.log(`Finished ${last} entires for ${center_name} day ${day}`);
};

(async () => {
  for (const d of lodash.range(1, 350)) {
    // await Promise.all(
    //   Constants.CENTER_NAMES.map((name) => claw(name, 21, d, 5, 'center-year-day-code-serial'))
    // );

    await Promise.all(
      Constants.CENTER_NAMES.map((name) => claw(name, 21, d, 9, 'center-year-code-day-serial'))
    );
  }
})();
