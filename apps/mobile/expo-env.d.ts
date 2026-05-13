/// <reference types="expo/types" />

declare const process: {
  env: Record<string, string | undefined>;
};

declare module '*.mp4' {
  const value: number;
  export default value;
}
