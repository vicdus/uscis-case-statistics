import ColorHash from "color-hash";
import Immutable from "immutable";
import JSON5 from "json5";
import nullthrows from "nullthrows";
import React, { useEffect, useState, useMemo } from "react";
import * as lodash from "lodash";

// @ts-ignore
import { Comments, FacebookProvider } from "react-facebook";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ContentRenderer,
  Tooltip,
  XAxis,
  YAxis,
  TooltipProps,
} from "recharts";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormLabel from "@material-ui/core/FormLabel";
import Grid from "@material-ui/core/Grid";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Slider from "@material-ui/core/Slider";

import WeChatDonation from "./donation_wechat.jpg";
import WechatGroupQR from "./wechat_group_qr.jpg";
import WechatQR from "./wechat_qr.jpg";

const JSON5_URL =
  "https://raw.githubusercontent.com/vicdus/uscis-case-statistics/master/src/data.json5";
const JSON5_485_URL =
  "https://raw.githubusercontent.com/vicdus/uscis-case-statistics/master/src/data485.json5";

const statusMap = new Map([
  ["Case Was Approved And My Decision Was Emailed", "Case Was Approved"],
  ["Case Was Received and A Receipt Notice Was Emailed", "Case Was Received"],
  [
    "Request for Initial Evidence Was Sent",
    "Request for Additional Evidence Was Sent",
  ],
  [
    "Case Was Transferred And A New Office Has Jurisdiction",
    "Case Transferred And New Office Has Jurisdiction",
  ],
]);

function getColor(s: string): string {
  return (
    Immutable.Map([
      ["Case Was Received", "#999900"],
      ["Case Was Approved", "#00FF00"],
      ["Request for Additional Evidence Was Sent", "#FF0000"],
    ]).get(s) ?? new ColorHash().hex(s)
  );
}

const App: React.FC<{}> = () => {
  const selectedForm =
    new URL(window.location.href).searchParams.get("form") ?? "I-129";
  const selectedCenter =
    new URL(window.location.href).searchParams.get("center") ?? "WAC";
  const [selectedUpdateDay, setSelectedUpdateDay] = useState<string | null>(
    null
  );
  const [caseData, setCaseData] = useState<Object>({});


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
      setCaseData(JSON5.parse(await (await fetch(selectedForm === "I-485" ? JSON5_485_URL : JSON5_URL)).text()));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(() => {
    return Immutable.List(
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
    )
      .groupBy(
        (v) =>
          v.center +
          v.year +
          v.day +
          v.code +
          v.form +
          (statusMap.get(v.status) ?? v.status) +
          v.updateDay
      )
      .map((v) => v.toList().toArray())
      .map((v) => {
        return {
          center: v[0].center,
          year: v[0].year,
          day: v[0].day,
          code: v[0].code,
          form: v[0].form,
          status: statusMap.get(v[0].status) ?? v[0].status,
          updateDay: v[0].updateDay,
          count: lodash.sumBy(v, (v) => v.count) as number,
        };
      })
      .toList();
  }, [caseData]);

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

  const previousDayCount = useMemo(
    () =>
      selectedEntriesAllDate
        .filter(
          (v) =>
            v.updateDay ===
            availableUpdateDays.get(availableUpdateDays.size - 2)?.toString()
        )
        .groupBy((v) => v.day)
        .map((v) =>
          Immutable.Map(
            // @ts-ignore
            v.map((x) => [x.status.toString(), x.count]).toArray()
          )
        ),
    [availableUpdateDays, selectedEntriesAllDate]
  );

  const todayCount = useMemo(
    () =>
      selectedEntriesAllDate
        .filter(
          (v) =>
            v.updateDay ===
            availableUpdateDays.get(availableUpdateDays.size - 1)?.toString()
        )
        .groupBy((v) => v.day)
        .map((v) =>
          Immutable.Map(
            // @ts-ignore
            v.map((x) => [x.status.toString(), x.count]).toArray()
          )
        ),
    [availableUpdateDays, selectedEntriesAllDate]
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

  const maxBarHeight = useMemo(
    () =>
      todayCount.valueSeq().map(v => lodash.sum(v.valueSeq().toArray())).max(),
    [todayCount]
  );

  const barChart = useMemo(() => {
    const CustomTooltip: ContentRenderer<TooltipProps> = ({
      payload,
      label,
    }) => {
      const todayTotal =
        todayCount
          .get(label as string)
          ?.reduce((a, b) => a + (b as number), 0) ?? 1;
      const prevdayTotal =
        previousDayCount
          .get(label as string)
          ?.reduce((a, b) => a + (b as number), 0) ?? 1;

      return (
        <div style={{ backgroundColor: "#F0F8FF" }}>
          <p>{`${label}`}</p>
          {(payload ?? []).map((p) => {
            const prevDay = (previousDayCount
              .get(label as string)
              ?.get(p.dataKey as string) ?? 0) as number;
            return (
              <p style={{ color: p.fill, marginBottom: "3px" }}>{`${p.dataKey
                }: ${p.value} of ${todayTotal} (${(
                  (100 * (p.value as number)) /
                  todayTotal
                ).toFixed(
                  2
                )}%), Previous day: ${prevDay} of ${prevdayTotal},  (${(
                  (100 * prevDay) /
                  prevdayTotal
                ).toFixed(2)}%)`}</p>
            );
          })}
        </div>
      );
    };

    return (
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
          domain={[0, maxBarHeight ?? 1]}
        />
        <YAxis
          type="category"
          dataKey="day"
          width={150}
          tickFormatter={day => selectedForm === "I-485" ? selectedCenter + "219" + day.toString().padStart(3, "0") + "XXXX" : selectedCenter + "21" + day.toString().padStart(3, "0") + "5XXXX"}
          domain={[(exisitDays.min() ?? 0) - 1, (exisitDays.max() ?? 1) + 1]}
          tick={{ fontSize: "x-small" }}
          interval={0}
          allowDecimals={true}
          ticks={exisitDays.toArray()}
        />
        <Tooltip
          offset={100}
          content={CustomTooltip}
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
    );
  }, [datasetWithBackfill, maxBarHeight, exisitDays, existStatus, todayCount, previousDayCount, selectedCenter, selectedForm]);

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
      <h4>Q: 一般什么时候更新数据？</h4>
      <p>
        A:
        通常美西第二天凌晨更新前一个工作日的数据，取决于uscis是否抽风以及我晚上是否喝大了忘记跑更新脚本（手动狗头
      </p>
      <h4>Q: 为什么是文件？为什么不用数据库？</h4>
      <p>A: 贫穷, github deploy静态网页不要钱</p>
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
      {updateDayPicker}
      {barChart}
      {updateDayPicker}
      {QA}
      {facebookCommentPlugin}
    </div>
  );
};

export default App;
