import React, { useEffect, useMemo, useState } from "react";
import { SchemaRoot } from "fusefx-modeldescription";
import { ISchemaProvider } from "../bl/ISchemaProvider";
import { SchemaInfo } from "../bl/SchemaInfo";
import { Table } from "ushell-common-components";

const SchemaManager: React.FC<{
  schemaProvider: ISchemaProvider;
  enterSchema?: (schemaName: string) => void;
  previewSchema?: (schemaName: string) => void;
}> = ({ schemaProvider, enterSchema, previewSchema }) => {
  const [schemaInfos, setSchemaInfos] = useState<SchemaInfo[] | null>(null);

  useEffect(() => {
    schemaProvider.getSchemaNames().then((sn: any) => setSchemaInfos(sn));
  }, [schemaProvider]);

  function createNewSchema() {
    const newSchema: SchemaRoot = new SchemaRoot();
    const schemaName: string = "New Schema";
    let finalSchemaName: string = schemaName;
    const schemaNames: string[] = schemaInfos!.map((sn) => sn.name);
    let i = 1;
    while (schemaNames.includes(finalSchemaName)) {
      finalSchemaName = `${schemaName} (${i})`;
      i++;
    }
    schemaProvider.saveSchema(finalSchemaName, newSchema).then(() => {
      schemaProvider.getSchemaNames().then((sn: any) => setSchemaInfos(sn));
    });
  }

  if (!schemaInfos) return <div>Loading...</div>;

  return (
    <div
      className="flex flex-col w-full h-full border-0 
        bg-bg1 dark:bg-bg1dark border-l border-bg3 dark:border-bg3dark"
    >
      <div className="flex gap-2 items-center w-full p-4 border-b border-bg3 dark:border-bg3dark my-2 py-6">
        <h1 className="font-bold text-2xl px-4">My Schemas</h1>
        <button
          className="bg-blue-300 dark:bg-blue-500 p-1 px-6 
          rounded-sm hover:bg-blue-400 text-lg font-semibold"
          onClick={() => createNewSchema()}
        >
          + New
        </button>
      </div>
      <div className="m-2 mx-4">
        <Table
          columns={[
            {
              fieldName: "name",
              fieldType: "string",
              key: "name",
              label: "Name",
              onRenderCell(cellValue: any) {
                return (
                  <div className="flex justify-between">
                    <p
                      className="hover:underline cursor-pointer"
                      onClick={() => enterSchema && enterSchema(cellValue)}
                    >
                      {cellValue}
                    </p>
                    <button className="hover:bg-bg2 dark:hover:bg-bg2dark px-2">
                      ...
                    </button>
                  </div>
                );
              },
            },
          ]}
          records={schemaInfos}
          className="border border-bg3 dark:border-bg3dark"
        ></Table>
      </div>
    </div>
  );
};

export default SchemaManager;
