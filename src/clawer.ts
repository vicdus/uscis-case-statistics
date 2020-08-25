import * as cheerio from "cheerio";
import * as fs from "fs";
import * as Immutable from "immutable";
import * as stringify from "json-stable-stringify";
import * as JSON5 from "json5";
import * as lodash from "lodash";
import fetch from "node-fetch";
import nullthrows from "nullthrows";

import Constants from "./Constants";

const DATA_FILE_PATH = __dirname + "/data.json5";
const BASE_URL =
  "https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum=";
const today = Math.floor((new Date().getTime() - 3600 * 1000 * 7) / 86400000);

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
          status,
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
  let [low, high] = [1, 1];
  while (
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 1)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 2)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 3)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 4)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 5)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 6)
    )) ||
    (await getStatus(
      BASE_URL + getCaseID(center_name, two_digit_yr, day, code, high + 7)
    ))
  ) {
    [low, high] = [high, high * 2];
  }

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
  const last = await getLastCaseNumber(center_name, two_digit_yr, day, code);
  if (last <= 0) {
    console.log(`No entires for ${center_name} day ${day}`);
    return;
  }

  console.log(`Loading ${last} entires for ${center_name} day ${day}`);
  const results = (
    await Promise.all(
      lodash
        .range(1, last + 1)
        .map((case_number) =>
          getStatus(
            BASE_URL +
              getCaseID(center_name, two_digit_yr, day, code, case_number)
          )
        )
    )
  )
    .filter(Boolean)
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
    { encoding: "utf8" }
  );
  console.log(`Finished ${last} entires for ${center_name} day ${day}`);
};

(async () => {
  for (const d of lodash.range(145, 350)) {
    await Promise.all(
      Constants.CENTER_NAMES.map((name) => claw(name, 20, d, 5))
    );
  }
})();
