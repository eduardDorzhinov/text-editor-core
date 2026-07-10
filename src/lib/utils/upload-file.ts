import {
  fetcher,
  getUploadUrl,
} from "@/vendor/api";
import { IS_DEV_MODE } from "@/vendor/shared";

const DEV_OBJID = "36k5UTjJF0F0nV9klKYQLLQjVsY";
const DEV_FIELD = "introductory_material";
const DEV_TPL = "360yphlQVMdEjftSRS3z4z1tvqG";

interface UploadGuiResponse {
  metrics: object,
  status: {
    description: string,
    status: number,
  },
}

export const uploadFile = async ({
  file,
  objUid,
  field,
  tpl,
}: {
  file: File,
  objUid?: string,
  field?: string,
  tpl: string,
}) => {
  try {
    const formData = new FormData();

    formData.append("uploadfile", file);

    const res = await fetcher<UploadGuiResponse>({
      url: "/tools/file/load",
      params: {
        // TODO move to env for dev mode
        objuid: IS_DEV_MODE && !objUid ?
          DEV_OBJID :
          objUid!,
        field: IS_DEV_MODE && !field ?
          DEV_FIELD :
          field!,
        tpl: IS_DEV_MODE && !tpl ?
          DEV_TPL :
          tpl!,
      },
      method: "POST",
      body: formData,
    });

    if (res.status.status !== 200 || !res.status.description) {
      throw Error("Upload file error");
    }

    return res.status.description;
  } catch (e) {
    console.error("Upload file error. ", e);
  }
};

export const getPathWithUpload = (path: string) => {
  if (path.startsWith("/")) return getUploadUrl(path);
  return path;
};


export const getUploadConstantsError = (objUid?: string, fieldUid?: string) => {
  if (IS_DEV_MODE) return;
  if (!objUid) return "Нет аттрибута \"objUid\". Обратитесь в поддержку";
  if (!fieldUid) return "Нет аттрибута \"fieldUid\". Обратитесь в поддержку";
  if (!window?.TextCreator?.upload_tpl) return "Нет параметра \"upload_tpl\". Обратитесь в поддержку";
};
