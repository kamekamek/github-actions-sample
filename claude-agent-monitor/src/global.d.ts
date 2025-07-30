/**
 * Global type definitions
 */

declare module 'cli-table3' {
  interface TableOptions {
    head?: any[];
    colWidths?: number[];
    style?: {
      head?: any[];
      border?: any[];
      compact?: boolean;
      'padding-left'?: number;
      'padding-right'?: number;
    };
    chars?: Record<string, string>;
  }

  class Table {
    constructor(options?: TableOptions);
    push(...rows: (string | number | { content: string; hAlign?: string })[][]): void;
    toString(): string;
  }

  export = Table;
}

declare module 'boxen' {
  interface Options {
    padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
    margin?: number | { top?: number; bottom?: number; left?: number; right?: number };
    borderStyle?: string;
    borderColor?: string;
    backgroundColor?: string;
    title?: string;
    titleAlignment?: string;
  }

  function boxen(text: string, options?: Options): string;
  export = boxen;
}

declare module 'asciichart' {
  function plot(data: number[], options?: any): string;
  export { plot };
}

declare module 'blessed' {
  export const screen: any;
  export const box: any;
  export const list: any;
  export const table: any;
}