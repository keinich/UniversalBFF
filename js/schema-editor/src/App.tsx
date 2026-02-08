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
const sr: SchemaRoot = new SchemaRoot();
function App() {
  return (
    <div className="h-screen w-full flex flex-col border-4 border-red-400 dark">
      <SchemaEditor
        onChangeSchema={() => {}}
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
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals

//  export default App;
