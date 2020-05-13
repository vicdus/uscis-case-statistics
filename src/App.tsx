import ColorHash from "color-hash";
import Immutable from "immutable";
import nullthrows from "nullthrows";
import React, { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";

import data from "./data.json";

function getColor(s: string): string {
  return (
    Immutable.Map.of(
      "Case Was Received",
      "#999900",
      "Case Was Approved",
      "#00FF00"
    ).get(s) ?? new ColorHash().hex(s)
  );
}

function App() {
  const [selectedForm, setSelectedForm] = useState<string>("I-129");
  const [selectedCenter, setSelectedCenter] = useState<string>("WAC");

  const entires = Immutable.List(
    Object.entries(data).map(([key, count]) => {
      const [center, year, day, code, form, status, updateDay] = key.split("|");
      return {
        center,
        year,
        day,
        code,
        form,
        status,
        updateDay,
        count,
      };
    })
  );

  const selectedEntriesAllDate = entires.filter(
    (e) => e.form === selectedForm && e.center === selectedCenter
  );

  const latestUpdateDay = selectedEntriesAllDate
    .map((e) => Number.parseInt(e.updateDay))
    .max();

  const selectedEntries = selectedEntriesAllDate.filter(
    (e) => e.updateDay === latestUpdateDay?.toString()
  );

  const formTypes = entires.map((e) => e.form).toSet();
  const centerNames = entires.map((e) => e.center).toSet();
  const existStatus = selectedEntries.map((e) => e.status).toSet();

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

  const chart = (
    <LineChart width={1440} height={810} data={dataset}>
      <CartesianGrid strokeDasharray='3 3' />
      <XAxis dataKey='day' />
      <YAxis />
      <Tooltip
        offset={100}
        itemSorter={(a) => -a.payload[nullthrows(a.dataKey?.toString())]}
      />
      <Legend />
      {existStatus.toArray().map((s, ind) => (
        <Line key={ind} type='linear' dataKey={s} stroke={getColor(s)} />
      ))}
    </LineChart>
  );

  const introduction = (
    <div>
      <h1>USCIS case progress tracker</h1>
      <h2>
        Current Form: {selectedForm}, location: {selectedCenter}, Last Update
        for this form and location:{" "}
        {new Date(1970, 0, latestUpdateDay).toDateString()}
      </h2>
      <h3>Help needed for UI and clawer</h3>
      <p>GitHub project: https://github.com/vicdus/uscis-case-statistics/</p>
    </div>
  );

  const QA = (
    <div>
      <h3>Q and A</h3>
      <h4>Q: 怎么用？</h4>
      <p>A: 横坐标是号段，纵坐标是状态对应的数量。</p>
      <h4>Q: 你是谁？</h4>
      <p>A: 我今年抽中了h1b, 在等approve</p>
      <h4>Q: 数据来源？</h4>
      <p>A: 枚举号段下所有可能的case number并爬取USCIS, 保存成文件</p>
      <h4>Q: 没有我的号段的数据？</h4>
      <p>A: 可能需要地里大家一起来爬并更新，稍后放出步骤</p>
      <h4>Q: 为什么是文件？为什么不用数据库？</h4>
      <p>A: 穷、懒</p>
    </div>
  );

  return (
    <div>
      {introduction}
      {chart}
      <FormControl fullWidth={true} component='fieldset'>
        <FormLabel component='legend'>Form Type</FormLabel>
        <RadioGroup
          aria-label='form'
          name='form'
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
        >
          {formTypes.toArray().map((f, ind) => (
            <FormControlLabel
              key={ind}
              value={f}
              control={<Radio />}
              label={f}
            />
          ))}
        </RadioGroup>
      </FormControl>
      <FormControl fullWidth={true} component='fieldset'>
        <FormLabel component='legend'>Center</FormLabel>
        <RadioGroup
          aria-label='form'
          name='form'
          value={selectedCenter}
          onChange={(e) => setSelectedCenter(e.target.value)}
        >
          {centerNames.toArray().map((f, ind) => (
            <FormControlLabel
              key={ind}
              value={f}
              control={<Radio />}
              label={f}
            />
          ))}
        </RadioGroup>
      </FormControl>
      {QA}
    </div>
  );
}

export default App;
