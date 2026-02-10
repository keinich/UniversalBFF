// react
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./tailwind.css";
import "./App.css";

import { BrowserRouter } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "react-query";

// App
import "./App.css";
import SchemaEditor from "./components/SchemaEditor";
import { SchemaRoot } from "fusefx-modeldescription";

const queryClient = new QueryClient();
function App() {
  const [sr, setSr] = React.useState<SchemaRoot | null>(null);
  const webview = (window as any).chrome?.webview;
  if (webview) {
    webview.addEventListener("message", (event: any) => {
      console.log("Received message from host:", event.data);
      const schema = JSON.parse(event.data);
      console.log("Parsed schema:", schema);
      // Handle the schema data
      setSr(schema);
    });
  }
  return (
    <div className="h-screen w-full flex flex-col border-4 border-red-400 dark1">
      <SchemaEditor
        onChangeSchema={(s) => {
          const webview = (window as any).chrome?.webview;
          if (webview) {
            webview.postMessage(
              JSON.stringify({
                action: "save",
                dataJson: JSON.stringify(s),
              }),
            );
          }
        }}
        onChangeSchemaName={() => {}}
        schema={sr}
        schemaName="Test"
      ></SchemaEditor>
    </div>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  // <React.StrictMode>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
  // </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

//  export default App;
