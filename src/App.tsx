import ColorHash from "color-hash";
import Immutable from "immutable";
import JSON5 from "json5";
import nullthrows from "nullthrows";
import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Grid from "@material-ui/core/Grid";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Slider from "@material-ui/core/Slider";

import WeChatDonation from "./donation_wechat.jpg";

const JSON5_URL =
  "https://raw.githubusercontent.com/vicdus/uscis-case-statistics/master/src/data.json5";

function getColor(s: string): string {
  return (
    Immutable.Map([
      ["Case Was Received", "#999900"],
      ["Case Was Approved", "#00FF00"],
      ["Request for Additional Evidence Was Sent", "#FF0000"]
    ]).get(s) ?? new ColorHash().hex(s)
  );
}

function App() {
  const [selectedForm, setSelectedForm] = useState<string>("I-129");
  const [selectedCenter, setSelectedCenter] = useState<string>("WAC");
  const [selectedUpdateDay, setSelectedUpdateDay] = useState<string | null>(
    null
  );
  const [caseData, setCaseData] = useState<Object>({});

  useEffect(() => {
    (async () =>
      setCaseData(JSON5.parse(await (await fetch(JSON5_URL)).text())))();
  }, []);

  const entires = Immutable.List(
    Object.entries(caseData).flatMap(([key, counts]) => {
      const [center, year, day, code, form, status] = key.split("|");
      return Object.entries(counts).map((count) => {
        return {
          center,
          year,
          day,
          code,
          form,
          status,
          updateDay: count[0] as string,
          count: count[1] as number,
        };
      });
    })
  );

  const selectedEntriesAllDate = entires.filter(
    (e) => e.form === selectedForm && e.center === selectedCenter
  );
  const availableUpdateDays = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.updateDay))
    .toSet()
    .toList()
    .sort();

  const countValueForAllDays = selectedEntriesAllDate
    .map((e) => e.count)
    .toSet()
    .toList()
    .sort();

  const latestUpdateDay = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.updateDay))
    .max();

  const selectedEntries = selectedEntriesAllDate.filter(
    (e) => e.updateDay === (selectedUpdateDay ?? latestUpdateDay)?.toString()
  );

  const formTypes = entires.map((e) => e.form).toSet();
  const centerNames = entires.map((e) => e.center).toSet();

  const statusCount = selectedEntriesAllDate.countBy((x) => x.status);
  const existStatus = selectedEntriesAllDate
    .map((e) => e.status)
    .toSet()
    .toList()
    .sortBy((s) => -(statusCount.get(s) ?? 0));

  const exisitDays = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.day))
    .toSet()
    .toList()
    .sort();

  const dataset = selectedEntries
    .groupBy((e) => e.day)
    .map((e, day) => {
      return {
        day,
        ...e
          .reduce(
            (counter, v) => counter.set(v.status, v.count),
            Immutable.Map<string, number>()
          )
          .toObject(),
      };
    })
    .toList()
    .sort((a, b) => Number.parseInt(a.day) - Number.parseInt(b.day))
    .toArray();

  const datasetWithBackfill = exisitDays
    .map((day) => dataset.find((v) => v.day === day.toString()) ?? { day })
    .toArray();

  const chart = (
    <LineChart width={1440} height={810} data={datasetWithBackfill}>
      <CartesianGrid strokeDasharray='3 3' />
      <XAxis dataKey='day' />
      <YAxis
        type='number'
        height={810}
        domain={[0, countValueForAllDays.max() ?? 1]}
      />
      <Tooltip
        offset={100}
        itemSorter={(a) => -a.payload[nullthrows(a.dataKey?.toString())]}
      />
      {existStatus.toArray().map((s, ind) => (
        <Line
          key={ind}
          type='linear'
          isAnimationActive={false}
          dataKey={s}
          stroke={getColor(s)}
        />
      ))}
    </LineChart>
  );

  const barChart = (
    <BarChart width={1440} height={810} data={datasetWithBackfill}>
      <CartesianGrid strokeDasharray='3 3' />
      <XAxis dataKey='day' />
      <YAxis
        type='number'
        height={810}
        domain={[0, countValueForAllDays.max() ?? 1]}
      />
      <Tooltip
        offset={100}
        itemSorter={(a) =>
          -existStatus.indexOf(nullthrows(a.dataKey) as string)
        }
      />
      {existStatus.toArray().map((s, ind) => (
        <Bar
          key={ind}
          isAnimationActive={false}
          dataKey={s}
          stackId='a'
          fill={getColor(s)}
        />
      ))}
    </BarChart>
  );

  const introduction = (
    <div>
      <h1>USCIS case progress tracker</h1>
      <p>
        Current Form: <strong>{selectedForm}</strong>,<br /> location:{" "}
        <strong>{selectedCenter}</strong> ,<br /> Last Update for this form and
        location:
        <strong>
          {latestUpdateDay
            ? new Date(86400000 * latestUpdateDay).toDateString()
            : "Not Exist currently"}
        </strong>
      </p>
      <h3>Help needed for UI and clawer</h3>
      <p>
        GitHub project:
        <a
          href='https://github.com/vicdus/uscis-case-statistics/'
          target='_blank'
          rel='noopener noreferrer'
        >
          https://github.com/vicdus/uscis-case-statistics/
        </a>
      </p>
    </div>
  );

  const updateDayPicker = availableUpdateDays.max() ? (
    <Grid item xs={8}>
      <Slider
        style={{ marginLeft: "128px", marginRight: "128px" }}
        defaultValue={availableUpdateDays.max() ?? 1}
        onChange={(_, f) => setSelectedUpdateDay(f.toString())}
        aria-labelledby='discrete-slider'
        valueLabelDisplay='off'
        step={null}
        marks={availableUpdateDays
          .map((e) => ({
            value: e,
            label:
              1 +
              new Date(3600 * 1000 * 7 + 86400000 * e).getMonth() +
              "/" +
              new Date(3600 * 1000 * 7 + 86400000 * e).getDate(),
          }))
          .toArray()}
        min={availableUpdateDays.min() ?? 0}
        max={availableUpdateDays.max() ?? 1}
      />
    </Grid>
  ) : null;

  const QA = (
    <div>
      <h3>Q and A</h3>
      <h4>Q: 怎么用？</h4>
      <p>A: 横坐标是号段，纵坐标是状态对应的数量。</p>
      <h4>Q: 什么是号段？</h4>
      <p>A: 这张图里的working day number</p>
      <img
        alt='day-explain'
        src='https://www.am22tech.com/wp-content/uploads/2018/12/uscis-receipt-number-status-i797-notice-truvisa.jpg'
      />
      <h4>Q: 你是谁？</h4>
      <p>A: 我今年抽中了h1b, 在等approve</p>
      <h4>Q: 数据来源？</h4>
      <p>A: 枚举号段下所有可能的case number并爬取USCIS, 保存成文件</p>
      <h4>Q: 没有我的号段的数据？</h4>
      <p>A: 可能需要地里大家一起来爬并更新，稍后放出步骤</p>
      <h4>Q: 为什么是文件？为什么不用数据库？</h4>
      <p>A: 贫穷</p>
      <h4>Q: 这个很有用，可以请你喝杯咖啡吗？</h4>
      <p>A: 感谢！</p>
      <img
        src={WeChatDonation}
        alt='wechat_donation'
        style={{ width: "400px", height: "560px" }}
      />
    </div>
  );

  const formTypeSelector = (
    <FormControl fullWidth={true} component='fieldset'>
      <FormLabel component='legend'>Form Type</FormLabel>
      <RadioGroup
        aria-label='form'
        name='form'
        value={selectedForm}
        onChange={(e) => setSelectedForm(e.target.value)}
        row={true}
      >
        {formTypes
          .toArray()
          .sort()
          .map((f, ind) => (
            <FormControlLabel
              key={ind}
              value={f}
              control={<Radio />}
              label={f}
            />
          ))}
      </RadioGroup>
    </FormControl>
  );

  const centerSelector = (
    <FormControl fullWidth={true} component='fieldset'>
      <FormLabel component='legend'>Center</FormLabel>
      <RadioGroup
        aria-label='form'
        name='form'
        value={selectedCenter}
        onChange={(e) => setSelectedCenter(e.target.value)}
      >
        {centerNames
          .toArray()
          .sort()
          .map((f, ind) => (
            <FormControlLabel
              key={ind}
              value={f}
              control={<Radio />}
              label={f}
            />
          ))}
      </RadioGroup>
    </FormControl>
  );

  return (
    <div>
      {introduction}
      {updateDayPicker}
      {chart}
      {updateDayPicker}
      {barChart}
      {formTypeSelector}
      {centerSelector}
      {QA}
    </div>
  );
}

export default App;
