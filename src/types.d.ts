declare module 'mammoth/mammoth.browser' {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}
declare module '*?url' {
  const url: string;
  export default url;
}
