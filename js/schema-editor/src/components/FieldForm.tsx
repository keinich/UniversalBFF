import React, { useState } from "react";
import { FieldSchema } from "fusefx-modeldescription";
import DropdownSelect from "ushell-common-components/dist/cjs/_Atoms/DropdownSelect";
import { Option } from "ushell-common-components/dist/cjs/_Atoms/MultiSelect";

const FieldForm: React.FC<{ field: FieldSchema; onChange: () => void }> = ({
  field,
  onChange,
}) => {
  const [currentField, setCurrentField] = useState(field);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="border-b text-lg border-bg5 dark:border-bg5dark">
        Relation
      </h2>
      <div className="">
        <label className="block mb-2 text-xs font-medium">Name</label>
        <input
          readOnly
          className="cursor-default text-sm rounded-sm bg-bg2 dark:bg-bg2dark block w-full p-1 outline-none"
          type="text"
          value={field.name}
          onChange={(e) => {
            field.name = e.target.value;
            setCurrentField({ ...field });
            onChange();
          }}
        ></input>
      </div>
      <div className="">
        <label className="block mb-2 text-xs font-medium">Type</label>
        <div className="cursor-default text-md rounded-md bg-bg2 dark:bg-bg2dark block w-full p-0 outline-none">
          <DropdownSelect
            classNameDropdownBg=""
            classNameDropdownHoverBg=""
            options={[
              { value: "String", label: "String" },
              { value: "Date", label: "Date" },
              { value: "Int32", label: "Int32" },
              { value: "Int64", label: "Int64" },
              { value: "Boolean", label: "Boolean" },
              { value: "Decimal", label: "Decimal" },
              { value: "Guid", label: "Guid" },
            ]}
            initialOption={{ value: field.type, label: field.type }}
            onOptionSet={(o: Option | null) => {
              if (!o) return;
              field.type = o.value;
              setCurrentField({ ...field });
              onChange();
            }}
          ></DropdownSelect>
        </div>
      </div>
    </div>
  );
};

export default FieldForm;
