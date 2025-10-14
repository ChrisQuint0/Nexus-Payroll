import { type AgSeriesMarkerStyle, _ModuleSupport } from 'ag-charts-community';
import type { Point } from 'ag-charts-core';
import { type RangeAreaMarkerDatum } from './rangeAreaProperties';
export interface RangeAreaLabelDatum extends Readonly<Point> {
    datumIndex: number;
    text: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    datum: any;
    itemId?: string;
    series: _ModuleSupport.CartesianSeriesNodeDatum['series'];
    style?: AgSeriesMarkerStyle;
}
interface RangeAreaFillPathDatum {
    readonly spans: _ModuleSupport.LinePathSpan[];
    readonly phantomSpans: _ModuleSupport.LinePathSpan[];
    readonly itemId: string;
}
interface RangeAreaStrokePathDatum {
    readonly spans: _ModuleSupport.LinePathSpan[];
    readonly itemId: string;
}
export interface RangeAreaContext extends _ModuleSupport.CartesianSeriesNodeDataContext<RangeAreaMarkerDatum, RangeAreaLabelDatum> {
    fillData: RangeAreaFillPathDatum;
    highStrokeData: RangeAreaStrokePathDatum;
    lowStrokeData: RangeAreaStrokePathDatum;
    styles: _ModuleSupport.SeriesNodeStyleContext<AgSeriesMarkerStyle>;
}
export declare function prepareRangeAreaPathAnimation(newData: RangeAreaContext, oldData: RangeAreaContext, diff: _ModuleSupport.ProcessedOutputDiff | undefined): {
    status: _ModuleSupport.NodeUpdateState;
    fill: {
        status: _ModuleSupport.NodeUpdateState;
        path: {
            addPhaseFn: (ratio: number, path: _ModuleSupport.Path<any>) => void;
            updatePhaseFn: (ratio: number, path: _ModuleSupport.Path<any>) => void;
            removePhaseFn: (ratio: number, path: _ModuleSupport.Path<any>) => void;
        };
        pathProperties: _ModuleSupport.FromToFns<_ModuleSupport.Path<any>, any, unknown>;
    };
    stroke: {
        status: _ModuleSupport.NodeUpdateState;
        path: {
            addPhaseFn: (ratio: number, path: _ModuleSupport.Path<any>) => void;
            updatePhaseFn: (ratio: number, path: _ModuleSupport.Path<any>) => void;
            removePhaseFn: (ratio: number, path: _ModuleSupport.Path<any>) => void;
        };
        pathProperties: _ModuleSupport.FromToFns<_ModuleSupport.Path<any>, any, unknown>;
    };
    hasMotion: boolean;
} | undefined;
export {};
