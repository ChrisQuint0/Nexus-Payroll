import type { BeanCollection, IExpansionService, NamedBean, RowGroupExpansionState, RowGroupOpenedEvent } from 'ag-grid-community';
import { BaseExpansionService } from './baseExpansionService';
export declare class ClientSideExpansionService extends BaseExpansionService implements NamedBean, IExpansionService<RowGroupExpansionState> {
    beanName: "expansionSvc";
    private rowModel;
    private events;
    private dispatchExpandedDebounced;
    wireBeans(beans: BeanCollection): void;
    setExpansionState(state: RowGroupExpansionState): void;
    getExpansionState(): RowGroupExpansionState;
    expandAll(expand: boolean): void;
    onGroupExpandedOrCollapsed(): void;
    protected dispatchExpandedEvent(event: RowGroupOpenedEvent, forceSync?: boolean): void;
    private debounce;
}
