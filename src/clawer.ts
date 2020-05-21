import * as cheerio from "cheerio";
import * as fs from "fs";
import Immutable from "immutable";
import * as stringify from "json-stable-stringify";
import * as JSON5 from "json5";
import fetch from "node-fetch";
import nullthrows from "nullthrows";

import Constants from "./Constants";
import { constants } from "buffer";

const DATA_FILE_PATH = __dirname + "/data.json5";
const BASE_URL =
  "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=";

const getCaseID = (
  center_name: string,
  two_digit_yr: number,
  day: number,
  code: number,
  case_serial_numbers: number
) =>
  center_name +
  two_digit_yr.toString() +
  day.toString() +
  code.toString() +
  case_serial_numbers.toString().padStart(4, "0");

const getStatus = async (
  url: string
): Promise<{ status: string; formType: string } | null> => {
  try {
    const f = await fetch(url);
    const t = await f.text();
    const status_regexp = new RegExp("(?<=<h1>).*(?=</h1>)");
    const status = nullthrows(
      status_regexp.exec(cheerio.load(t)(".text-center").html() as string)
    )[0];
    return status === ""
      ? null
      : {
          status: status.replace("'", ""),
          formType:
            Constants.FORM_TYPES.find((form) => t.includes(form)) ??
            "unknown form type",
        };
  } catch {
    return null;
  }
};

const getLastCaseNumber = async (
  center_name: string,
  two_digit_yr: number,
  day: number,
  code: number
): Promise<number> => {
  let [low, high] = [0, 4000];
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const result = await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, mid)
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
  code: number
): Promise<void> => {
  const today = 18402;
  const last = await getLastCaseNumber(center_name, two_digit_yr, day, code);
  console.log(`Loading ${last} entires for ${center_name} day ${day}`);
  if (last <= 0) {
    return;
  }

  const results = (
    await Promise.all(
      Array.from(new Array(last), (x, i) => i + 1).map((case_number) =>
        getStatus(
          BASE_URL +
            getCaseID(center_name, two_digit_yr, day, code, case_number)
        )
      )
    )
  )
    .filter((x) => x != null)
    .map((x) => nullthrows(x));

  const counter = results
    .reduce((counter, res) => {
      const key = `${center_name}|${two_digit_yr}|${day}|${code}|${res.formType}|${res.status}`;
      return counter.set(key, 1 + (counter.get(key) ?? 0));
    }, Immutable.Map<string, number>())
    .map((val) => ({ [today]: val }))
    .toObject();

  const json5_obj = JSON5.parse(
    fs.readFileSync(DATA_FILE_PATH, { encoding: "utf8" })
  );
  const new_json5_obj = { ...json5_obj };
  Object.entries(counter).forEach(([key, count]) => {
    new_json5_obj[key] = { ...(new_json5_obj[key] ?? {}), ...count };
  });

  fs.writeFileSync(
    DATA_FILE_PATH,
    // @ts-ignore: solve export issue for json stable stringify
    JSON5.stringify(JSON5.parse(stringify(new_json5_obj)), {
      space: 2,
      quote: '"',
    }),
    {
      encoding: "utf8",
    }
  );
};

Constants.CENTER_NAMES.forEach(async (name) => {
  for (let d = 145; d < 200; d++) {
    await claw(name, 20, d, 5);
  }
});
