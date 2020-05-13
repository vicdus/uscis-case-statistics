import React from "react";
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

  const existStatus = new Set<string>();

  const dataset = entires
    .filter((e) => e.form === "I-129")
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

  return <div>{chart}</div>;
}

export default App;
