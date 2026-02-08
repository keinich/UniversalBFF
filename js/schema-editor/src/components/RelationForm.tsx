import React, { useState } from "react";
import { RelationSchema } from "fusefx-modeldescription";
// import InputField from "ushell-common-components/dist/cjs/components/guifad/_Atoms/InputField";

const RelationForm: React.FC<{
  relation: RelationSchema;
  onChange: () => void;
}> = ({ relation, onChange }) => {
  const [currentRel, setCurrentRel] = useState(relation);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="border-b text-lg border-bg5 dark:border-bg5dark">
        Relation
      </h2>
      <div className="">
        <label className="block mb-2 text-xs font-medium">
          Foreign Entity Name
        </label>
        <input
          readOnly
          className="cursor-default text-sm rounded-md bg-bg2 dark:bg-bg2dark block w-full p-1 outline-none"
          type="text"
          value={relation.foreignEntityName}
          onChange={(e) => {
            relation.foreignEntityName = e.target.value;
          }}
        ></input>
      </div>
      <div className="">
        <label className="block mb-2 text-xs font-medium">
          Primary Entity Name
        </label>
        <input
          readOnly
          className="cursor-default text-sm rounded-md bg-bg2 dark:bg-bg2dark block w-full p-1 outline-none"
          type="text"
          value={relation.primaryEntityName}
          onChange={(e) => {
            relation.primaryEntityName = e.target.value;
          }}
        ></input>
      </div>
      <div className="">
        <label className="block mb-2 text-xs font-medium">
          Foreign Key Property
        </label>
        <input
          readOnly
          className="cursor-default text-sm rounded-md bg-bg2 dark:bg-bg2dark block w-full p-1 outline-none"
          type="text"
          value={relation.foreignKeyIndexName}
          onChange={(e) => {
            relation.foreignKeyIndexName = e.target.value;
          }}
        ></input>
      </div>
      <div className="flex">
        <input
          className="cursor-default rounded-md mr-2 bg-bg2 dark:bg-bg2dark block p-1 outline-none"
          type="checkbox"
          checked={relation.foreignEntityIsMultiple}
          onChange={(e) => {
            relation.foreignEntityIsMultiple = e.target.checked;
            onChange();
            setCurrentRel({ ...relation });
          }}
        ></input>
        <label className="block text-md font-medium">Multiple</label>
      </div>
      <div className="flex">
        <input
          className="cursor-default rounded-md mr-2 bg-bg2 dark:bg-bg2dark block p-1 outline-none"
          type="checkbox"
          checked={relation.isLookupRelation}
          onChange={(e) => {
            relation.isLookupRelation = e.target.checked;
            onChange();
            setCurrentRel({ ...relation });
          }}
        ></input>
        <label className="block text-md font-medium">Lookup</label>
      </div>
    </div>
  );
};

export default RelationForm;
