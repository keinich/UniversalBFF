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

// Helper to recursively lowercase only the first letter of all object keys
function keysToLowerCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(keysToLowerCase);
  } else if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.length > 0 ? k[0].toLowerCase() + k.slice(1) : k,
        keysToLowerCase(v),
      ]),
    );
  }
  return obj;
}

const queryClient = new QueryClient();
function App() {
  const [sr, setSr] = React.useState<SchemaRoot | null>(null);
  const webview = (window as any).chrome?.webview;
  if (webview) {
    webview.addEventListener("message", (event: any) => {
      console.log("Received message from host:", event.data);
      let schema = JSON.parse(event.data);
      schema = keysToLowerCase(schema);
      console.log("Parsed schema (lowercase):", schema);
      // Handle the schema data
      setSr(schema);
    });
  }
  return (
    <div className="h-screen w-full flex flex-col border-0 border-red-400 dark1">
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
