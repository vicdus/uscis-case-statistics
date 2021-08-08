import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import Comments from "./Comments"

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

ReactDOM.render(
  <React.StrictMode>
    <Comments />
  </React.StrictMode>,
  document.getElementById("comments")
);
