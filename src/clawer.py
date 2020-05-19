import asyncio
import itertools
import json
import os
import re
from collections import Counter
from datetime import date

import requests
from bs4 import BeautifulSoup


BASE_URL = 'https://egov.uscis.gov/casestatus/mycasestatus.do?appReceiptNum='

# see https://egov.uscis.gov/processing-times/
FORM_TYPES = [
    'I-90', 'I-102', 'I-129', 'I-129CW', 'I-129F', 'I-130', 'I-131', 'I-140', 'I-212', 'I-360', 'I-485', 'I-526',
    'I-539', 'I-600', 'I-600A', 'I-601', 'I-601A', 'I-612', 'I-730', 'I-751', 'I-765', 'I-765V', 'I-800', 'I-800A',
    'I-817', 'I-821', 'I-821D', 'I-824', 'I-829', 'I-914', 'I-918', 'I-924', 'I-929'
]
CENTER_NAMES = ['WAC', 'EAC', 'VSC',  'CSC', 'LIN',
                'NSC', 'SRC', 'TSC', 'MSC', 'NBC', 'IOE', 'YSC']


def get_case_id(center_name: str, two_digit_yr: int, day: int, code: int, case_serial_numbers: int) -> str:
    return center_name + str(two_digit_yr) + str(day) + str(code) + (str(case_serial_numbers)).zfill(4)


def get_form_type(text: str):
    for form in FORM_TYPES:
        if form in text:
            return form
    return 'unknown form type'


def parse_response(response):
    text = str(BeautifulSoup(response.text, 'html.parser').findAll(
        'div', {'class': 'text-center'})[0])
    status = re.search('(?<=<h1>).*(?=</h1>)', text)
    if status is None or status[0] == '' or status.group(0) == '':
        return None
    else:
        return status.group(0), get_form_type(text)


def get_last_case_number(center_name: str, two_digit_yr: int, day: int, code: int):
    if parse_response(requests.get(BASE_URL + get_case_id(center_name, two_digit_yr, day, code, 1))) is None:
        return 0
    low = 1
    high = 9999
    while low < high:
        mid = int((low + high) / 2)
        result = parse_response(requests.get(
            BASE_URL + get_case_id(center_name, two_digit_yr, day, code, mid)))
        # find first empty response
        if result is not None:
            low = mid + 1
        else:
            high = mid
    return low - 1


def merge(counter: Counter):
    current_day_since_1970 = str((date.today() - date(1970, 1, 1)).days)
    file_path = os.path.dirname(os.path.realpath(__file__)) + '/data.json'
    with open(file_path) as f:
        counter_all_days = json.loads(f.read())
    with open(file_path, 'w') as f:
        for key in counter:
            if key not in counter_all_days:
                counter_all_days[key] = {}
            counter_all_days[key][current_day_since_1970] = counter[key]
        f.write(json.dumps(counter_all_days, sort_keys=True, indent=4))


def request_ignore_err(url: str):
    try:
        return requests.get(url)
    except:
        print(f'failed in {url}')
        return None


async def claw(center_name: str, two_digit_yr: int, day: int, code: int, counter: Counter):
    event_loop = asyncio.get_event_loop()

    case_serial_numbers = range(1, get_last_case_number(
        center_name, two_digit_yr, day, code))
    ids = [get_case_id(center_name, two_digit_yr, day, code, number)
           for number in case_serial_numbers]
    print(
        f'clawing center {center_name}, day: {day}, code: {code}, total of {len(ids)} cases')
    futures = [event_loop.run_in_executor(
        None, request_ignore_err, BASE_URL + case_id) for case_id in ids]
    responses = [await f for f in futures]

    for response in responses:
        if response is None:
            continue
        parsed = parse_response(response)
        if parsed is not None:
            status, form_type = parsed
            counter[f'{center_name}|{two_digit_yr}|{day}|{code}|{form_type}|{status}'] += 1
    merge(counter)


def run():
    counter = Counter()
    for day in range(145, 200):
        for code in [5]:
            for center in CENTER_NAMES:
                loop = asyncio.get_event_loop()
                loop.run_until_complete(claw(center, 20, day, code, counter))


run()
