import { useEffect } from "react";

export const useIsScrollable = (flag: boolean) => {
  useEffect(() => {
    try {
      document.body.style.overflow = flag ?
        "hidden" :
        "";
      const root = document.getElementById("root");
      if (root) {
        root.style.overflow = flag ?
          "hidden" :
          "auto";
      }
    } catch (e) {
      console.error(e);
    }
    return () => {
      try {
        document.body.style.overflow = "";
        const root = document.getElementById("root");
        if (root) {
          root.style.overflow = "auto";
        }
      } catch (e) {
        console.error(e);
      }
    };
  }, [ flag ]);
};
