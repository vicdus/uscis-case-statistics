import React from "react";
import data from "./data.json";

function App() {
  console.log(data);

  const entires = Object.entries(data).map(([key, count]) => {
    const [center, year, day, code, form, status, timestamp] = key.split("|");
    return { center, year, day, code, form, status, timestamp, count };
  });

  return (
    <div>
      {entires.map((e) => (
        <div>{JSON.stringify(e)}</div>
      ))}
    </div>
  );
}

export default App;
