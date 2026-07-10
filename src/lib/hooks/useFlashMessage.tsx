import { ShowFlashMessage, useFlashMessageContext } from "@/model/providers/FlashMessageContext";

export function useFlashMessage(): ShowFlashMessage {
  return useFlashMessageContext();
}
