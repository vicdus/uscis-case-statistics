import React, { useState } from "react";
import data from "./data.json";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
} from "recharts";
import ColorHash from "color-hash";
import nullthrows from "nullthrows";
import Immutable from "immutable";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";

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
      const [center, year, day, code, form, status, timestamp] = key.split("|");
      return {
        center,
        year,
        day,
        code,
        form,
        status,
        timestamp,
        count,
      };
    })
  );

  const formTypes = entires.map((e) => e.form).toSet();
  const centerNames = entires.map((e) => e.center).toSet();

  const existStatus = new Set<string>();

  const dataset = entires
    .filter((e) => e.form === selectedForm && e.center === selectedCenter)
    .groupBy((e) => e.day)
    .map((e, day) => {
      const temp = new Map<string, number>();
      e.forEach((x) => {
        existStatus.add(x.status);
        temp.set(x.status, x.count + (temp.get(x.status) ?? 0));
      });
      return { day: day, ...Object.fromEntries(temp) };
    })
    .toList()
    .sort((a, b) => Number.parseInt(a.day) - Number.parseInt(b.day))
    .toArray();

  const chart = (
    <LineChart
      width={1440}
      height={810}
      data={dataset}
      margin={{
        top: 5,
        right: 30,
        left: 20,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray='3 3' />
      <XAxis dataKey='day' />
      <YAxis />
      <Tooltip
        offset={100}
        itemSorter={(a) => -a.payload[nullthrows(a.dataKey?.toString())]}
      />
      <Legend />
      {Immutable.Set(existStatus)
        .toArray()
        .map((s) => (
          <Line type='linear' dataKey={s} stroke={getColor(s)} />
        ))}
    </LineChart>
  );

  return (
    <div>
      {chart}
      <FormControl fullWidth={true} component='fieldset'>
        <FormLabel component='legend'>Form Type</FormLabel>
        <RadioGroup
          aria-label='form'
          name='form'
          value={selectedForm}
          onChange={(e) => setSelectedForm(e.target.value)}
        >
          {formTypes.toArray().map((f) => (
            <FormControlLabel value={f} control={<Radio />} label={f} />
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
          {centerNames.toArray().map((f) => (
            <FormControlLabel value={f} control={<Radio />} label={f} />
          ))}
        </RadioGroup>
      </FormControl>
    </div>
  );
}

export default App;
