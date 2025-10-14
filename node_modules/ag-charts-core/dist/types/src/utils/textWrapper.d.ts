import type { OverflowStrategy, TextSegment, TextWrap } from 'ag-charts-types';
import { type ITextMeasurer, type MeasuredSegment } from './textMeasurer';
import { type FontOptions } from './textUtils';
export interface WrapOptions {
    font: FontOptions;
    maxWidth: number;
    maxHeight?: number;
    lineHeight?: number;
    textWrap?: TextWrap;
    overflow?: OverflowStrategy;
    avoidOrphans?: boolean;
}
export declare function wrapText(text: string, options: WrapOptions): string;
export declare function wrapLines(text: string, options: WrapOptions): string[];
export declare function truncateLine(text: string, measurer: ITextMeasurer, maxWidth: number, ellipsisForce?: boolean): string;
export declare function clipLines(lines: string[], measurer: ITextMeasurer, options: WrapOptions): string[];
export declare function wrapTextSegments(textSegments: TextSegment[], options: WrapOptions): MeasuredSegment[];
