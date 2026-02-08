import React, { useState } from "react";
import {
  EntitySchema,
  IndexSchema,
  RelationSchema,
} from "fusefx-modeldescription";
// import InputField from '../../guifad/_Atoms/InputField'
import DropdownSelect from "ushell-common-components/dist/cjs/_Atoms/DropdownSelect";

const IndexForm: React.FC<{
  entitySchema: EntitySchema;
  index: IndexSchema;
  onChange: () => void;
}> = ({ entitySchema, index, onChange }) => {
  const [currentIndex, setCurrentIndex] = useState(index);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="border-b text-lg border-bg5 dark:border-bg5dark">
        Index Fields
      </h2>
      {index.memberFieldNames.map((fieldName, i) => (
        <div className="p-2 bg-content dark:bg-contentDark" key={i}>
          {fieldName}
        </div>
      ))}
      <DropdownSelect
        initialOption={null}
        options={entitySchema.fields
          .filter((f) => !index.memberFieldNames.includes(f.name))
          .map((f) => {
            return { label: f.name, value: f.name };
          })}
        onOptionSet={(o: any) => {
          if (!o) return;
          const newIndex = { ...currentIndex };
          newIndex.memberFieldNames.push(o.value);
          setCurrentIndex(newIndex);
          onChange();
        }}
      ></DropdownSelect>
    </div>
  );
};

export default IndexForm;
