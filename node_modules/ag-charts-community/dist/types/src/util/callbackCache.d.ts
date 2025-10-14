import { type AnyFn, type RequireOptional } from 'ag-charts-core';
type Caller = {
    context?: unknown;
} | undefined;
export type CallbackParamRules<P> = RequireOptional<Omit<P, 'context'>>;
export declare function callWithContext<F extends AnyFn>(callers: Caller | Caller[], fn: F, ...params: Parameters<F>): ReturnType<F>;
export declare class CallbackCache {
    private cache;
    call<F extends AnyFn>(callers: Caller | Caller[], fn: F, ...params: Parameters<F>): ReturnType<F> | undefined;
    private invoke;
    invalidateCache(): void;
}
export {};
