const React = (window as any).React;
export default React as any as typeof import("react");
export const useState = React.useState.bind(React) as any as typeof import("react").useState;
export const useEffect = React.useEffect.bind(React) as any as typeof import("react").useEffect;
export const useMemo = React.useMemo.bind(React) as any as typeof import("react").useMemo;
export const useRef = React.useRef.bind(React) as any as typeof import("react").useRef;
export const useCallback = React.useCallback.bind(React) as any as typeof import("react").useCallback;
export const createElement = React.createElement.bind(React) as any as typeof import("react").createElement;
export const Fragment = React.Fragment as any as typeof import("react").Fragment;

export const jsx = React.createElement.bind(React) as any as typeof import("react/jsx-runtime").jsx;
export const jsxs = React.createElement.bind(React) as any as typeof import("react/jsx-runtime").jsxs;
export type {
  ReactNode,
  PointerEvent as ReactPointerEvent,
} from "react";
