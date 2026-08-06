const ReactDOM =
  (window as any).ReactDOM ??
  ((window as any).require?.("react-dom") as any);

const createRootFn = ReactDOM?.createRoot ?? ReactDOM?.default?.createRoot;
if (!createRootFn) throw new Error("四层待办: ReactDOM.createRoot unavailable");

export const createRoot: typeof import("react-dom/client").createRoot =
  createRootFn.bind(ReactDOM) as any;

export type { Root } from "react-dom/client";
