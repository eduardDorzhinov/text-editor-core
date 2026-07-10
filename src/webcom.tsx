import { createWebcom } from "@/vendor/shared";

import { TextCreator } from "./index";
import { WEBCOM_NAME } from "./webcom-constants";

createWebcom<typeof TextCreator>({
  name: WEBCOM_NAME,
  Component: TextCreator,
  scopeId: `${WEBCOM_NAME}-scope`,
  attributes: [
    {
      name: "fieldUid",
      prop: "fieldUid",
      type: "string",
    },
    {
      name: "objUid",
      prop: "objUid",
      type: "string",
    },
    {
      name: "localUsed",
      prop: "localUsed",
      type: "boolean",
    },
  ],
});
