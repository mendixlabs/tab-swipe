import * as dojoDeclare from "dojo/_base/declare";
import * as WidgetBase from "mxui/widget/_WidgetBase";
import * as aspect from "dojo/aspect";
import * as domConstruct from "dojo/dom-construct";
import * as registry from "dijit/registry";

import { SwipeHandler } from "./SwipeHandler";
import "./ui/TabSwipe.scss";

export interface TabContainer extends mxui.widget._WidgetBase {
    declaredClass: "mxui.widget.TabContainer";
    showTab: (tab: TabPane) => void;
    focusIndex: number;
    onShowTab: (callback: () => void ) => void;
    onHideTab: (callback: () => void ) => void;
    tabSwipeId: string;
    validator: null;
    _active: TabPane;
    _tabList: HTMLElement;
    _tabPanes: TabPane[];
    _tabContent: TabContent;
    _clickHandler: null;
}

export interface TabContent extends HTMLElement {
    declaredClass: "mxui.widget.TabContent";
}

export interface TabPane extends mxui.widget._WidgetBase {
    _hidden: boolean;
    _parsed: boolean;
    _visible: boolean;
    container: TabContainer;
    showTab: (tab: TabPane) => void;
    show: () => void;
    hideTab: () => void;
    index: number;
    visibilityIndex: number;
}

class TabSwipe extends WidgetBase {
    targetName: string;
    tabStyle: "tabs"| "indicators";
    lazyLoad: boolean;

    private targetWidget?: TabContainer;
    private targetNode: HTMLElement;
    private swipeHandler: SwipeHandler;
    private tabContentClass: string;
    private swipeClass: string;
    private targetWidgetType: string;

    postCreate() {
        this.tabContentClass = ".mx-tabcontainer-content";
        this.swipeClass = "widget-tab-swipe";
        this.targetWidgetType = "mxui.widget.TabContainer";
        this.targetNode = this.findTargetNode(this.targetName);
        this.targetWidget = this.targetNode ? registry.byNode(this.targetNode) : null;

        if (!this.targetWidget) {
            this.showError(`Tab swipe configuration error: unable to find a target with the name ${this.targetName}`);
        } else if (this.checkCompatibility(this.targetWidget)) {
            this.targetWidget.tabSwipeId = this.id;
            this.targetNode.classList.add(this.swipeClass);
        }
    }

    update(_contextObject: mendix.lib.MxObject, callback?: () => void) {
        if (this.targetWidget) {
            this.applyIndicatorStyles(this.targetWidget);
            this.initializeSwipe(this.targetWidget);
            this.setupEvents(this.targetWidget);
        }

        if (callback) {
            callback();
        }
    }

    uninitialize(): boolean {
        if (this.swipeHandler) {
            this.swipeHandler.destroy();
        }

        return true;
    }

    private findTargetNode(name: string): HTMLElement {
        let queryNode = this.domNode.parentNode as Element;
        let targetNode: HTMLElement | null = null;
        while (!targetNode) {
            targetNode = queryNode.querySelector(".mx-name-" + name) as HTMLElement;
            if (window.document.isEqualNode(queryNode)) { break; }
            queryNode = queryNode.parentNode as HTMLElement;
        }

        return targetNode;
    }

    private checkCompatibility(widget?: TabContainer): boolean {
        let errorMessage = "";
        if (!widget) {
            errorMessage = `" unable to find a target tab with the name ${this.targetName}`;
        } else if (widget.declaredClass !== this.targetWidgetType) {
            errorMessage = `target widget ${this.targetName} is not of the type " + ${this.targetWidgetType}`;
        } else if (!widget._tabList || !widget._tabContent || !widget.showTab || !widget.onShowTab || !widget.onHideTab) { // tslint:disable-line max-line-length
            errorMessage = "The widget is not compatible with this mendix version.";
        } else if (widget.tabSwipeId) {
            errorMessage = `TabContainer '${this.targetName}' is already connected to the widget '` +
                `${widget.tabSwipeId}. It can only be connected with one widget.`;
        }

        if (errorMessage) {
            this.showError(`Tab swipe configuration error: ${errorMessage}`);
        }

        return !errorMessage;
    }

    private initializeSwipe(targetWidget: TabContainer) {
        if (this.swipeHandler) {
            this.swipeHandler.destroy();
        }
        this.swipeHandler = new SwipeHandler({
            tabContainer: targetWidget,
            tabContainerContent: targetWidget.domNode.querySelector(this.tabContentClass) as HTMLElement,
            lazyLoad: this.lazyLoad
        });
    }

    private applyIndicatorStyles(targetWidget: TabContainer) {
        if (this.tabStyle === "indicators") {
            this.targetNode.classList.add("carousel");
            targetWidget._tabList.classList.remove("nav", "nav-tabs", "mx-tabcontainer-tabs");
            targetWidget._tabList.classList.add("carousel-indicators");
        }
    }

    private setupEvents(targetWidget: TabContainer) {
        this.own(aspect.after(targetWidget, "showTab", (_deferred: any, args: any) => {
            this.swipeHandler.setTabPanePosition(args[0] as TabPane);
        }));

        this.own(aspect.after(targetWidget, "onShowTab", (_deferred: any, args: any) => {
            this.swipeHandler.setTabPanePosition(args[0] as TabPane);
        }));

        this.own(aspect.after(targetWidget, "onHideTab", () => {
            if (targetWidget._active) {
                this.swipeHandler.setTabPanePosition(targetWidget._active);
            }
        }));
    }

    private showError(message: string) {
        const node = this.targetNode && this.targetNode.hasChildNodes() ? this.targetNode : this.domNode;
        domConstruct.place(`<div class='alert alert-danger'>${message}</div>`, node, "first");
        window.logger.error(this.id, `configuration error: ${message}`);
    }
}

// Declare widget prototype the Dojo way
// Thanks to https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/dojo/README.md
// tslint:disable : only-arrow-functions
dojoDeclare("TabSwipe.widget.TabSwipe", [ WidgetBase ], function(Source: any) {
    const result: any = {};
    for (const property in Source.prototype) {
        if (property !== "constructor" && Source.prototype.hasOwnProperty(property)) {
            result[property] = Source.prototype[property];
        }
    }
    return result;
}(TabSwipe));
