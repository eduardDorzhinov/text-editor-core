import {
  useCallback,
  useMemo,
  useState,
} from "react";

import { getUploadConstantsError, uploadFile } from "@/lib/utils/upload-file";
import { useMainContext } from "@/model/providers/MainContext";
import { getUploadUrl } from "@/vendor/api";
import { Loader } from "@/vendor/ui-kit";

import st from "./use-upload-file.module.scss";

export const useUploadFile = () => {
  const { objUid, fieldUid } = useMainContext();
  const [ isLoading, setIsLoading ] = useState(false);
  const [ error, setError ] = useState("");
  const [ localFile, setLocalFile ] = useState<File | null>(null);

  const uploadRequest = useCallback(async () => {
    try {
      setError("");

      if (!localFile) {
        setError("Не загружен файл");
        return;
      }

      const error = getUploadConstantsError(objUid, fieldUid);

      if (error) {
        setError(error);
        return;
      }

      setIsLoading(true);
      const uploadSrc = await uploadFile({
        file: localFile,
        objUid: objUid,
        field: fieldUid,
        tpl: window?.TextCreator?.upload_tpl,
      });

      if (!uploadSrc) {
        setError("Проблема загрузки файла. Попробуйте еще раз");
        return;
      }

      return getUploadUrl(`/${uploadSrc}`);
    } catch (e) {
      console.error("Upload file callback error. ", e);
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, [
    fieldUid,
    localFile,
    objUid,
  ]);


  return useMemo(() => {
    return (
      {
        isLoading,
        loader: isLoading ?
          (
            <div className={st.loader_wrap}>
              <Loader />
            </div>
          ) :
          null,
        error: error ?
          <div className={st.error}>{error}</div> :
          null,
        setError,
        setLocalFile,
        localFile,
        uploadRequest,
      }
    );
  }, [
    error,
    setError,
    isLoading,
    setLocalFile,
    localFile,
    uploadRequest,
  ]);
};
