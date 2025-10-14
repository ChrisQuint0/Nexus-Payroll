import { type AgBaseRadarSeriesOptions, type AgSeriesMarkerStyle, _ModuleSupport } from 'ag-charts-community';
import { type Point } from 'ag-charts-core';
import { type RadarNodeDatum, RadarSeriesProperties } from './radarSeriesProperties';
export interface RadarPathPoint {
    x: number;
    y: number;
    moveTo: boolean;
    radius?: number;
    startAngle?: number;
    endAngle?: number;
    arc?: boolean;
}
interface RadarSeriesNodeDataContext extends _ModuleSupport.SeriesNodeDataContext<number, RadarNodeDatum> {
    styles: _ModuleSupport.SeriesNodeStyleContext<AgSeriesMarkerStyle>;
}
declare class RadarSeriesNodeEvent<TEvent extends string = _ModuleSupport.SeriesNodeEventTypes> extends _ModuleSupport.SeriesNodeEvent<RadarNodeDatum, TEvent> {
    readonly angleKey?: string;
    readonly radiusKey?: string;
    constructor(type: TEvent, nativeEvent: Event, datum: RadarNodeDatum, series: RadarSeries);
}
export declare abstract class RadarSeries extends _ModuleSupport.PolarSeries<RadarNodeDatum, AgBaseRadarSeriesOptions, RadarSeriesProperties<AgBaseRadarSeriesOptions>, _ModuleSupport.Marker> {
    static readonly className: string;
    properties: RadarSeriesProperties<AgBaseRadarSeriesOptions<any, unknown>>;
    protected readonly NodeEvent: typeof RadarSeriesNodeEvent;
    private readonly lineGroup;
    protected lineSelection: _ModuleSupport.Selection<_ModuleSupport.Path, boolean>;
    protected resetInvalidToZero: boolean;
    contextNodeData?: RadarSeriesNodeDataContext;
    constructor(moduleCtx: _ModuleSupport.ModuleContext);
    protected nodeFactory(): _ModuleSupport.Marker;
    getSeriesDomain(direction: _ModuleSupport.ChartAxisDirection): any[];
    processData(dataController: _ModuleSupport.DataController): Promise<void>;
    protected circleCache: {
        r: number;
        cx: number;
        cy: number;
    };
    protected didCircleChange(): boolean;
    protected getAxisInnerRadius(): number;
    maybeRefreshNodeData(): void;
    createNodeData(): {
        itemId: string;
        nodeData: RadarNodeDatum[];
        labelData: RadarNodeDatum[];
        styles: Record<_ModuleSupport.HighlightState, AgSeriesMarkerStyle>;
    } | undefined;
    update({ seriesRect }: {
        seriesRect?: _ModuleSupport.BBox;
    }): void;
    protected updatePathSelections(): void;
    protected updateMarkerSelection(): void;
    protected updateHighlightSelection(): void;
    protected getMarkerFill(highlightedStyle?: _ModuleSupport.SeriesItemHighlightStyle): import("ag-charts-core").InternalAgColorType | undefined;
    protected getDatumStylerProperties(datum: any): {
        seriesId: string;
        datum: any;
        angleKey: string;
        radiusKey: string;
    };
    protected updateDatumStyles(selection: _ModuleSupport.Selection<_ModuleSupport.Marker, RadarNodeDatum>, isHighlight: boolean): void;
    protected updateMarkers(selection: _ModuleSupport.Selection<_ModuleSupport.Marker, RadarNodeDatum>, isHighlight: boolean): void;
    protected updateLabels(): void;
    makeStylerParams(_highlighted: boolean, _highlightStateEnum?: _ModuleSupport.HighlightState): never;
    getTooltipContent(datumIndex: number): _ModuleSupport.TooltipContent | undefined;
    private legendItemSymbol;
    getLegendData(legendType: _ModuleSupport.ChartLegendType): _ModuleSupport.CategoryLegendDatum[];
    protected pickNodeClosestDatum(hitPoint: Point): _ModuleSupport.SeriesNodePickMatch | undefined;
    computeLabelsBBox(): _ModuleSupport.BBox | null;
    protected getLineNode(): _ModuleSupport.Path<any> | undefined;
    protected beforePathAnimation(): void;
    protected updatePathNodes(): void;
    protected getLinePoints(): RadarPathPoint[];
    protected animateSinglePath(pathNode: _ModuleSupport.Path, points: RadarPathPoint[], ratio: number): void;
    protected animatePaths(ratio: number): void;
    animateEmptyUpdateReady(): void;
    animateWaitingUpdateReady(data: _ModuleSupport.PolarAnimationData): void;
    animateReadyResize(data: _ModuleSupport.PolarAnimationData): void;
    protected resetPaths(): void;
    getFormattedMarkerStyle(datum: RadarNodeDatum): AgSeriesMarkerStyle & {
        size: number;
    };
    protected computeFocusBounds(opts: _ModuleSupport.PickFocusInputs): _ModuleSupport.BBox | undefined;
}
export {};
