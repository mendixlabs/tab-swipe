import * as dojoDeclare from "dojo/_base/declare";
import * as WidgetBase from "mxui/widget/_WidgetBase";
import * as aspect from "dojo/aspect";
import * as domConstruct from "dojo/dom-construct";
import * as domClass from "dojo/dom-class";
import * as registry from "dijit/registry";

import "./ui/TabSwipe.css";

import { HammerSwipe as HammerCarousel, SwipeOptions } from "./HammerCarousel";

export interface TabContainer extends mxui.widget._WidgetBase {
    declaredClass: "mxui.widget.TabContainer";
    showTab: (tab: TabPan) => void;
    focusIndex: number;
    onShowTab: (callback: () => void ) => void;
    onHideTab: (callback: () => void ) => void;
    connectedTabSwipe: string;
    validator: null;
    _active: TabPan;
    _tabList: HTMLElement;
    _tabPanes: TabPan[];
    _tabContent: TabContent;
    _clickHandler: null;
}

export interface TabContent extends HTMLElement {
    declaredClass: "mxui.widget.TabContent";
}

export interface TabPan extends mxui.widget._WidgetBase {
    container: TabContainer;
    _hidden: boolean;
    showTab: (tab: TabPan) => void;
    show: () => void;
    hideTab: () => void;
    index: number;
    visibilityIndex: number;
}

interface TabOptions {
    swipeClass: string;
    selectionClass: string;
    targetWidgetType: string;
    activeTabHeight: number;
}

// tslint:disable : max-classes-per-file
class TabSwipe extends WidgetBase {
    private settings: TabOptions;
    private targetName: string;
    private targetWidget: TabContainer;
    private targetNode: HTMLElement;
    private carousel: HammerCarousel;
    private tabNavStyle: "tabs" | "indicators";
    private animationStyle: "moveIn" | "moveOver";

    postCreate() {
        this.settings = {
            activeTabHeight: 0,
            selectionClass: ".mx-tabcontainer-content",
            swipeClass: "swipe-tab",
            targetWidgetType: "mxui.widget.TabContainer"
        };
        this.targetNode = this.findTargetNode(this.targetName);
        this.targetWidget = this.targetNode ? registry.byNode(this.targetNode) : null;
        if (this.checkCompatibility(this.targetWidget)) {
            this.targetWidget.connectedTabSwipe = this.id;
            domClass.add(this.targetWidget.domNode, this.settings.swipeClass);
        }
        console.log("========== POSTCREATE==========");
        this.targetWidget.getChildren().forEach( (child: TabPan) => {
            if (child.index === 0) console.log("========");
            console.log(`child ${child.index} width: ${child.domNode.offsetWidth}, height: ${child.domNode.offsetHeight} `);
        });
    }

    /**
     * called when context is changed or initialized.
     * Though we are not interested in the context object it self, Tab could be updated on it.
     * @param {type} obj - object in context
     * @param {type} callback - callback when update is completed
     * @returns {undefined}
     */
    update(contextObject: mendix.lib.MxObject, callback: () => void) {
        if (this.targetWidget) {
            domClass.add(this.targetNode, this.settings.swipeClass);
            this.hammerTime();
            this._setupEvents();
        }
        callback();
    }

    /**
     * change te tab container button, transform in to carousel indicators.
     */
    setTabNavStyle() {
        domClass.remove(this.targetNode, "use-indicators");
        if (this.tabNavStyle === "indicators") {
            domClass.add(this.targetNode, "use-indicators");
            const navNode = this.targetWidget._tabList;
            domClass.remove(navNode, [ "nav", "nav-tabs", "mx-tabcontainer-tabs" ]);
            domClass.add(navNode, "carousel-indicators");
        }
    }

    /**
     * connect target widget events
     */
    _setupEvents() {
        // connect to tab clicking
        this.own(aspect.after(this.targetWidget, "showTab", (deferred: any, args: any) => {
            const tab = args[0] as TabPan;
            this.carousel.showTab(tab);
        }));

        this.own(aspect.after(this.targetWidget, "onShowTab", (deferred: any, args: any) => {
            this.carousel.showTab(args[0] as TabPan);
        }));

        this.own(aspect.after(this.targetWidget, "onHideTab", (deferred: any, args: any) => {
            const tab = args[0];
            if (this.targetWidget._active) {
                logger.debug(this.id + "_TabContainer.onHideTab:", tab.index,
                    "active", this.targetWidget._active.index);
                this.carousel.showTab(this.targetWidget._active);
            }
        }));
    }

    uninitialize() {
        if (this.carousel) {
            this.carousel.destroy();
        }
        return true;
    }

    hammerTime() {
        const swipeOptions: SwipeOptions = {
            contentContainer: this.targetWidget.domNode.querySelector(this.settings.selectionClass) as HTMLElement,
            effect: this.animationStyle,
            tabContainer: this.targetWidget
        };
        this.carousel = new HammerCarousel(swipeOptions);
    }

    private checkCompatibility(widget: TabContainer) {
        if (!widget) {
            this.showError(`" is unable to find target with name ${this.targetName}`);
            return false;
        }
        if (widget.declaredClass !== this.settings.targetWidgetType) {
            this.showError(`target widget ${this.targetName} is not of type " + ${this.settings.targetWidgetType}`);
            return false;
        }

        if (!widget._tabList || !widget._tabContent || !widget.showTab || !widget.onShowTab || !widget.onHideTab) {
            this.showError(`Target widget ${this.targetName} is not compatible with this widget.`);
            return false;
        }
        if (widget.connectedTabSwipe) {
            this.showError(`TabContainer '${this.targetName}' is already connected to tabSwipeWidget '` +
                `${widget.connectedTabSwipe}. It can only be connected with one widget.`);
            return false;
        }
        return true;
    }

    private findTargetNode(name: string): HTMLElement {
        let queryNode = this.domNode.parentNode as Element;
        let foundNode: HTMLElement | null = null;
        while (!foundNode) {
            foundNode = queryNode.querySelector(".mx-name-" + name) as HTMLElement;
            if (window.document.isEqualNode(queryNode)) { break; }
            queryNode = queryNode.parentNode as HTMLElement;
        }

        return foundNode;
    }

    private showError(message: string, codeException = false) {
        // Place the message inside the tabContainer, only when it is rendered, else the message is removed.
        const node = this.targetNode && this.targetNode.hasChildNodes() ? this.targetNode : this.domNode;
        const type = codeException ? "TabSwipe code exception:" : "Tab swipe configuration error:";
        domConstruct.place(`<div class='alert alert-danger'>${type}<br>- ${message}</div>`, node, "first");
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
