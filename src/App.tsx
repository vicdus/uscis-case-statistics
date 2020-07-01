import ColorHash from "color-hash";
import Immutable from "immutable";
import JSON5 from "json5";
import nullthrows from "nullthrows";
import React, { useEffect, useState, useMemo } from "react";
// @ts-ignore
import { Comments, FacebookProvider } from "react-facebook";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ContentRenderer,
  Line,
  LineChart,
  Pie,
  PieChart,
  PieLabelRenderProps,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Grid from "@material-ui/core/Grid";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Slider from "@material-ui/core/Slider";
import Button from "@material-ui/core/Button";

import WeChatDonation from "./donation_wechat.jpg";
import WechatGroupQR from "./wechat_group_qr.jpg";
import WechatQR from "./wechat_qr.jpg";
import { TextField } from "@material-ui/core";

const JSON5_URL =
  "https://raw.githubusercontent.com/vicdus/uscis-case-statistics/master/src/data.json5";

function getColor(s: string): string {
  return (
    Immutable.Map([
      ["Case Was Received", "#999900"],
      ["Case Was Approved", "#00FF00"],
      ["Request for Additional Evidence Was Sent", "#FF0000"],
    ]).get(s) ?? new ColorHash().hex(s)
  );
}

function App() {
  const selectedForm =
    new URL(window.location.href).searchParams.get("form") ?? "I-129";
  const selectedCenter =
    new URL(window.location.href).searchParams.get("center") ?? "WAC";
  const workday = Number.parseInt(
    new URL(window.location.href).searchParams.get("workday") ?? "0"
  );

  const [selectedUpdateDay, setSelectedUpdateDay] = useState<string | null>(
    null
  );
  const [caseData, setCaseData] = useState<Object>({});
  const [activeStatus, setActiveStatus] = useState<number>(0);
  const [caseID, setCaseID] = useState<string>("");

  const setSearchParam = (key: string, value: string) => {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    searchParams.set(key, value);
    url.search = searchParams.toString();
    window.location.href = url.toString();
  };

  const url = new URL(window.location.href);

  useEffect(() => {
    (async () => {
      if (!url.searchParams.get("form")) {
        setSearchParam("form", "I-129");
      }
      if (!url.searchParams.get("center")) {
        setSearchParam("center", "WAC");
      }
      setCaseData(JSON5.parse(await (await fetch(JSON5_URL)).text()));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(
    () =>
      Immutable.List(
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
      ),
    [caseData]
  );

  const selectedEntriesAllDate = useMemo(
    () =>
      entries.filter(
        (e) => e.form === selectedForm && e.center === selectedCenter
      ),
    [entries, selectedForm, selectedCenter]
  );

  const availableUpdateDays = useMemo(
    () =>
      selectedEntriesAllDate
        .map((e) => Number.parseInt(e.updateDay))
        .toSet()
        .toList()
        .sort(),
    [selectedEntriesAllDate]
  );

  const countValueForAllDays = useMemo(
    () =>
      selectedEntriesAllDate
        .map((e) => e.count)
        .toSet()
        .toList()
        .sort(),
    [selectedEntriesAllDate]
  );

  const latestUpdateDay = useMemo(
    () => selectedEntriesAllDate.map((e) => Number.parseInt(e.updateDay)).max(),
    [selectedEntriesAllDate]
  );

  const selectedEntries = useMemo(
    () =>
      selectedEntriesAllDate.filter(
        (e) =>
          e.updateDay === (selectedUpdateDay ?? latestUpdateDay)?.toString()
      ),
    [selectedEntriesAllDate, selectedUpdateDay, latestUpdateDay]
  );

  const formTypes = useMemo(() => entries.map((e) => e.form).toSet(), [
    entries,
  ]);
  const centerNames = useMemo(() => entries.map((e) => e.center).toSet(), [
    entries,
  ]);

  const statusCount = useMemo(
    () => selectedEntriesAllDate.countBy((x) => x.status),
    [selectedEntriesAllDate]
  );
  const existStatus = useMemo(
    () =>
      selectedEntriesAllDate
        .map((e) => e.status)
        .toSet()
        .toList()
        .sortBy((s) => -(statusCount.get(s) ?? 0)),
    [selectedEntriesAllDate, statusCount]
  );

  const exisitDays = useMemo(
    () =>
      selectedEntriesAllDate
        .map((e) => Number.parseInt(e.day))
        .toSet()
        .toList()
        .sort(),
    [selectedEntriesAllDate]
  );

  const dataset = useMemo(
    () =>
      selectedEntries
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
        .toArray(),
    [selectedEntries]
  );

  const datasetWithBackfill = useMemo(
    () =>
      exisitDays
        .map(
          (day) =>
            dataset.find((v) => v.day === day.toString()) ?? {
              day: day.toString(),
            }
        )
        .toArray(),
    [exisitDays, dataset]
  );

  const caseIDInput = (
    <div>
      <div style={{ width: "600px", display: "inline", float: "left" }}>
        <TextField
          id="standard-basic"
          label="也可输入你的Case ID来查询你的号段下所有status的比例, 例如 WAC2017150172"
          fullWidth={true}
          onChange={(v) => setCaseID(v.target.value)}
        />
      </div>
      <div style={{ width: "100px", display: "inline", float: "left" }}>
        <Button
          variant="contained"
          color="primary"
          disabled={!Boolean(caseID.match(/^\w{3}\d{5}5\d{4}$/))}
          onClick={() => setSearchParam("workday", caseID.substr(5, 3))}
        >
          {(() =>
            caseID.match(/^\w{3}\d{5}5\d{4}$/)
              ? "查询号段" + caseID.substr(5, 3)
              : "Case ID invalid")()}
        </Button>
      </div>
    </div>
  );

  const renderActiveShape: ContentRenderer<PieLabelRenderProps> = (props) => {
    const RADIAN = Math.PI / 180;
    const {
      cx,
      cy,
      name,
      midAngle,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
    } = props;
    const sin = Math.sin(-RADIAN * (midAngle as number));
    const cos = Math.cos(-RADIAN * (midAngle as number));
    const sx = (cx as number) + ((outerRadius as number) + 10) * cos;
    const sy = (cy as number) + ((outerRadius as number) + 10) * sin;
    const mx = (cx as number) + ((outerRadius as number) + 30) * cos;
    const my = (cy as number) + ((outerRadius as number) + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? "start" : "end";

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx as number}
          cy={cy as number}
          innerRadius={innerRadius as number}
          outerRadius={outerRadius as number}
          startAngle={startAngle as number}
          endAngle={endAngle as number}
          fill={fill}
        />
        <Sector
          cx={cx as number}
          cy={cy as number}
          startAngle={startAngle as number}
          endAngle={endAngle as number}
          innerRadius={(outerRadius as number) + 6}
          outerRadius={(outerRadius as number) + 10}
          fill={fill}
        />
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={fill}
          fill="none"
        />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          textAnchor={textAnchor}
          fill="#333"
        >{`${name}`}</text>
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          dy={18}
          textAnchor={textAnchor}
          fill="#999"
        >
          {`${value} cases, ${((percent as number) * 100).toFixed(2)}%`}
        </text>
      </g>
    );
  };

  const pieChart = useMemo(() => {
    if (!workday) {
      return null;
    }
    const pieData = Object.entries(
      datasetWithBackfill.find((e) => e.day === workday.toString()) ?? {}
    )
      .map(([key, val]) => ({ name: key, value: Number.parseInt(val) }))
      .filter((v) => v.name !== "day")
      .sort((v) => v.value);

    return (
      <div style={{ display: "block" }}>
        <PieChart width={800} height={800}>
          <Pie
            activeIndex={activeStatus}
            activeShape={renderActiveShape}
            dataKey="value"
            isAnimationActive={false}
            data={pieData}
            cx={400}
            cy={400}
            outerRadius={200}
            innerRadius={165}
            onMouseEnter={(data, index) => setActiveStatus(index)}
            fill="#8884d8"
          >
            {pieData.map((entry, index) => (
              <Cell fill={getColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip offset={100} />
        </PieChart>
        <h2>以上饼图：号段{selectedCenter + "20" + workday + "5XXXX"}</h2>
      </div>
    );
  }, [activeStatus, datasetWithBackfill, caseID, workday]);

  const chart = useMemo(
    () => (
      <LineChart width={1440} height={810} data={datasetWithBackfill}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis
          type="number"
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
            type="linear"
            isAnimationActive={false}
            dataKey={s}
            stroke={getColor(s)}
          />
        ))}
      </LineChart>
    ),
    [datasetWithBackfill, existStatus, countValueForAllDays]
  );
  const barChart = useMemo(
    () => (
      <BarChart
        height={1440}
        width={810}
        data={datasetWithBackfill}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="day"
          domain={[0, countValueForAllDays.max() ?? 1]}
        />
        <YAxis
          type="category"
          dataKey="day"
          domain={[(exisitDays.min() ?? 0) - 1, (exisitDays.max() ?? 1) + 1]}
          tick={true}
          interval={0}
          allowDecimals={true}
          ticks={exisitDays.toArray()}
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
            stackId="a"
            fill={getColor(s)}
          />
        ))}
      </BarChart>
    ),
    [datasetWithBackfill, countValueForAllDays, exisitDays, existStatus]
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
            ? new Date(
                86400000 * latestUpdateDay + 3600 * 1000 * 7
              ).toDateString()
            : "Not Exist currently"}
        </strong>
      </p>
      <h3>Help needed for UI and clawer</h3>
      <p>
        GitHub project:
        <a
          href="https://github.com/vicdus/uscis-case-statistics/"
          target="_blank"
          rel="noopener noreferrer"
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
        aria-labelledby="discrete-slider"
        valueLabelDisplay="off"
        step={null}
        marks={availableUpdateDays
          .map((e) => ({
            value: e,
            label:
              1 +
              new Date(86400000 * e + 3600 * 1000 * 7).getMonth() +
              "/" +
              new Date(86400000 * e + 3600 * 1000 * 7).getDate(),
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
        alt="day-explain"
        src="https://www.am22tech.com/wp-content/uploads/2018/12/uscis-receipt-number-status-i797-notice-truvisa.jpg"
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
        alt="wechat_donation"
        style={{ width: "400px", height: "560px" }}
      />

      <h4>Q: 我想和你聊一聊？</h4>
      <p>A: 加我微信吧！</p>
      <img
        src={WechatQR}
        alt="wechat"
        style={{ width: "400px", height: "560px" }}
      />
      <h4>Q: 还有别的问题想讨论？</h4>
      <p>
        A: 微信群和
        <a
          href="https://www.1point3acres.com/bbs/forum.php?mod=viewthread&tid=636011"
          target="_blank"
          rel="noopener noreferrer"
        >
          一亩三分地的帖子
        </a>
        ，请帮我加点大米：）
      </p>
      <img
        src={WechatGroupQR}
        alt="wechat_group"
        style={{ width: "400px", height: "560px" }}
      />
    </div>
  );

  const facebookCommentPlugin = (
    <FacebookProvider appId="185533902045623">
      <Comments href="https://vicdus.github.io/uscis-case-statistics/" />
    </FacebookProvider>
  );

  const formTypeSelector = (
    <FormControl fullWidth={true} component="fieldset">
      <FormLabel component="legend">Form Type</FormLabel>
      <RadioGroup
        aria-label="form"
        name="form"
        value={selectedForm}
        onChange={(e) => setSearchParam("form", e.target.value)}
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
    <FormControl fullWidth={true} component="fieldset">
      <FormLabel component="legend">Center</FormLabel>
      <RadioGroup
        aria-label="form"
        name="form"
        value={selectedCenter}
        onChange={(e) => setSearchParam("center", e.target.value)}
        row={true}
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
      {formTypeSelector}
      {centerSelector}
      {caseIDInput}
      {pieChart}
      {updateDayPicker}
      {barChart}
      {chart}
      {updateDayPicker}
      {QA}
      {facebookCommentPlugin}
    </div>
  );
}

export default App;
