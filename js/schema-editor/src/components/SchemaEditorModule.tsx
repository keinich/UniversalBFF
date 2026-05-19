import React, { useState } from "react";
import SchemaEditor from "./SchemaEditor";
import UShellModuleWrapper from "./UshellModuleWrapper";
import {
  IDataSource,
  IDataSourceManagerWidget,
  IWidget,
} from "ushell-modulebase";
import { SchemaRoot } from "fusefx-modeldescription/lib/schemaRoot";

const SchemaEditorModuleWrapper: React.FC<{ inputData: IWidget }> = ({
  inputData,
}) => {
  console.log("inputData", inputData);

  const dataSourceManager: IDataSourceManagerWidget = inputData.widgetHost;
  const dataSourceEndpointUrl: IDataSource | null =
    dataSourceManager.tryGetDataSource("XXXEntry");

  console.log("dataSourceManager", dataSourceManager);
  console.log("dataSourceEndpointUrl", dataSourceEndpointUrl);

  const [schemaName, setSchemaName] = useState<string>("Test");

  if (!dataSourceEndpointUrl) return <div>No DataSource</div>;
  const sr: SchemaRoot = new SchemaRoot();
  return (
    <UShellModuleWrapper inputData={inputData}>
      <SchemaEditor
        onChangeSchema={() => {}}
        onChangeSchemaName={(name) => setSchemaName(name)}
        schema={sr}
        schemaName={schemaName}
      ></SchemaEditor>
    </UShellModuleWrapper>
  );
};

export default SchemaEditorModuleWrapper;
