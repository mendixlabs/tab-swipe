import * as dojoDeclare from "dojo/_base/declare";
import * as WidgetBase from "mxui/widget/_WidgetBase";
import * as aspect from "dojo/aspect";
import * as domConstruct from "dojo/dom-construct";
import * as domStyle from "dojo/dom-style";
import * as domClass from "dojo/dom-class";
import * as domGeom from "dojo/dom-geometry";
import * as registry from "dijit/registry";

import "./ui/TabSwipe.css";

import { HammerSwipe as HammerCarousel } from "./HammerCarousel";

interface TabContainer extends HTMLElement{
    declaredClass: "mxui.widget.TabContainer";
    showTab: (tab: TabPan) => void;
    onShowTab: (callback: () => void ) => void;
    onHideTab: (callback: () => void ) => void;
    connectedWidget: string;
    domNode: HTMLElement;
    validator: null;
    _active: TabPan;
    _tabList: HTMLElement;
    _tabPanes: TabPan[];
    _tabContent: TabContent;
    _clickHandler: null;
}

interface TabContent extends HTMLElement {
    declaredClass: "mxui.widget.TabContent";
}

interface TabPan extends HTMLElement {
    _hidden: boolean;
    showTab: (tab: TabPan) => void;
    show: () => void;
    hideTab: () => void;
    index: number;
    domNode: HTMLElement;
}


interface MarginBox {
    l: number;
    t: number;
    w: number;
    h: number;
}

// tslint:disable : max-classes-per-file
class TabSwipe extends WidgetBase {
    private targetName: string;
    private swipeClass: string;
    private selectionClass: string;
    private targetWidgetType: string;
    private currentIndex: number;
    // internal ver
    private targetWidget: TabContainer;
    private targetNode: HTMLElement;
    private carousel: HammerCarousel;
    private targetFound: boolean;
    private indexMappingT2C: any[];
    private indexMappingC2T: any[];
    private tabNavStyle: "tabs" | "indicators";
    private animationStyle: "moveIn" | "moveOver";
    private activeTabHeight: number;

    postCreate() {
        const tt = this.getChildren();
        logger.debug(this.id + ".constructor", tt);
        this.swipeClass = "swipe-tab";
        this.selectionClass = ".mx-tabcontainer-content";
        this.targetWidgetType = "mxui.widget.TabContainer";
        this.activeTabHeight = 0;
        this.currentIndex = 0;
        this.indexMappingT2C = [];
        this.indexMappingC2T = [];
        this.targetNode = this.findTargetNode(this.targetName);
        this.targetWidget = this.targetNode ? registry.byNode(this.targetNode) : null;

        this.targetFound = this.checkCompatibility(this.targetWidget);

        return true;
    }

    /**
     * Check if a widget is the correct type and has attributes
     * @param {widget} widget - mendix widget
     * @param {String} type - classname
     * @param {String[]} attributes - list of attributes to check.
     * @returns {Boolean} correct target found
     */
    checkCompatibility(widget: TabContainer) {
        const missingAttributes: string[] = [];

        let message = "";
        if (!widget) {
            message = this.id + " is unable to find target with name " + this.targetName;
            mx.ui.error(message);
            logger.error(message);
            return false;
        }
        if (widget.declaredClass !== "mxui.widget.TabContainer") {
            message = this.id + " target widget " + this.targetName +
                    " is not of type " + this.targetWidgetType;
            mx.ui.error(message);
            logger.error(message);
            return false;
        }

        if (!widget._tabList) missingAttributes.push("TabList");
        if (!widget._tabContent) missingAttributes.push("_tabContent");
        if (!widget.showTab) missingAttributes.push("showTab");
        if (!widget.onShowTab) missingAttributes.push("onShowTab");
        if (!widget.onHideTab) missingAttributes.push("onHideTab");

        if (missingAttributes.length) {
            message = this.id + " target widget " + this.targetName +
                    " of type " + widget.declaredClass +
                    " is not compatible with this widget because it did not found the following" +
                    " attributes: " + missingAttributes.join(",");
            this.showError(message);
            return false;
        }
        if (!widget.connectedWidget) {
            // store the connecte widget, to prevent, 2 widgets connected to the same, causing conflicts.
            widget.connectedWidget = this.id;
        } else {
            message = this.id + " can not connect to " + widget.id +
                    " It can only be connected with one widget." +
                    " It is already connected to " + widget.connectedWidget;
            this.showError(message);
            return false;
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

    private showError(message: string, codeException = false) {
        // Place the message inside the list view, only when it is rendered, else the message is removed.
        const node = this.targetNode && this.targetNode.hasChildNodes() ? this.targetNode : this.domNode;
        const type = codeException ? "TabSwipe code exception:" : "Tab swipe configuration error:";
        domConstruct.place(`<div class='alert alert-danger'>${type}<br>- ${message}</div>`, node, "first");
        window.logger.error(this.id, `configuration error: ${message}`);
    }
    /**
     * called when context is changed or initialized.
     * Though we are not interested in the context object it self, Tab could be updated on it.
     * @param {type} obj - object in context
     * @param {type} callback - callback when update is completed
     * @returns {undefined}
     */
    update(contextObject: mendix.lib.MxObject, callback: () => void) {
        logger.debug(this.id + ".update");
        if (this.targetFound) {
            domClass.add(this.targetNode, this.swipeClass);
            this.getVisableTabs(); // run atleast one. if tab doe not has condition visabliliy.
            this.createTabMappings();
            this.setTabNavStyle();
            this.setTabIndexZ();
            this.hammerTime();
            const activeTab = this.targetWidget._active;
            this.loadAllTabContent();
            this._setupEvents();
            // reset active tab avtive again, loadAllTabContent deselect alls
            this.targetWidget.showTab(activeTab);
        }
        callback();
    }
    /**
     * change te tab container button, transform in to carousel indicators.
     */
    setTabNavStyle() {
        logger.debug(this.id + ".setTabNavStyle");
        if (this.tabNavStyle === "indicators") {
            domClass.add(this.targetNode, "use-indicators");
            const navNode = this.targetWidget._tabList;
            domClass.remove(navNode, [ "nav", "nav-tabs", "mx-tabcontainer-tabs" ]);
            domClass.add(navNode, "carousel-indicators");
        }
    }
    setTabIndexZ() {
        const baseZIndex = 10;
        // maybe better use css selectors not _tabPanes?
        this.targetWidget._tabPanes.forEach((tabPan, index) => tabPan.domNode.style.zIndex = `${baseZIndex - index}`);
    }
    setSize() {
        const tab = this.targetWidget._active;
        if (tab) {
            const marginBox = domGeom.getMarginBox(tab.domNode);
            const tabHeight = (marginBox as MarginBox).h;
            if (tabHeight !== this.activeTabHeight) { // only updeze height when changed.
                domStyle.set(this.targetWidget._tabContent, "height", tabHeight + "px");
                this.activeTabHeight = tabHeight;
            }
        }
    }
    /**
     * load all tabs in the backgroud, deselect all tabs.
     * connect on the showTab function to update the carousel
     */
    loadAllTabContent() {
        logger.debug(this.id + ".loadAllTabContent");
        // load all tabs to populate the carousel.
        this.targetWidget._tabPanes.forEach(tabPan => {
            tabPan.show();
            tabPan.hideTab(); // show tab make tab active, should not happen
        } );
    }

    /**
     * connect target widget events
     */
    _setupEvents() {
        logger.debug(this.id + "._setupEvents");
        // connect to tab clicking
        this.own(aspect.after(this.targetWidget, "showTab", (deferred: any, args: any) => {
            const tab = args[0];
            logger.debug(this.id + "TabContainer.showTab:", tab.index);
            this.setSize(); // not sure if it timed right
            this.carousel.showNode(tab.domNode, true); // issue hidden tab; loop visable tabs only?
        }));

        // // connect for update tab visablity
        // this.own(aspect.after(this.targetWidget, "onShowTab", (deferred, args) => {
        //     // refresh the position after new items are added.
        //     const tab = args[0];
        //     logger.debug(this.id + "_TabContainer.onShowTab:", tab.index,
        //         "active", this.targetWidget._active.index);
        //     this.carousel.panes = this.getVisableTabs();
        //     this.carousel.showNode(this.targetWidget._active.domNode, true);
        //     this.setSize();
        // }));

    // connect for update tab visablity
        this.own(aspect.after(this.targetWidget, "onHideTab", (deferred: any, args: any) => {
            const tab = args[0];
            if (this.targetWidget._active) { // in case all tabs are hidden, no one is active.
                logger.debug(this.id + "_TabContainer.onHideTab:", tab.index,
                    "active", this.targetWidget._active.index);
                this.carousel.panes = this.getVisableTabs();
                this.carousel.showNode(this.targetWidget._active.domNode, true);
                this.setSize();
            }
        }));

        // connect for update tab visablity
        this.own(aspect.after(this.targetWidget, "onHideTab", (deferred: any, args: any) => {
            var tab = args[0];
            if (this.targetWidget._active) { // in case all tabs are hidden, no one is active.
                logger.debug(this.id + "_TabContainer.onHideTab:", tab.index,
                    "active", this.targetWidget._active.index);
                this.carousel.panes = this.getVisableTabs();
                this.carousel.showNode(this.targetWidget._active.domNode, true);
                this.setSize();
            }
        }));
    }
    /**
     * list all the tabs that are visbale, only viable tabs should be handle by hte carousel
     * @returns {[node]} - list of all tabs that are not hidden.
     */
    getVisableTabs() {
        logger.debug(this.id + ".getVisableTabs");
        return this.targetWidget._tabPanes.filter((tabPan) => !tabPan._hidden);
    }
    // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated.
    // Implement to do sizing calculations. Prefer using CSS instead.
    resize() {
        logger.debug(this.id + ".resize");
        if (this.carousel) {
            this.carousel.resize();
            this.setSize();
        }
    }
    /**
     * create mapping betean index of the carousel tabs an the cell in the container.
     * Used when tabs are hidden, the carousel need to jump.
     */
    createTabMappings() {
        logger.debug(this.id + ".createTabMappings");
        let iCar = 0;
        let iTab = null;
        this.indexMappingT2C = [];
        this.indexMappingC2T = [];
        for (iTab = 0; iTab < this.targetWidget._tabPanes.length; iTab++) {
            if (!this.targetWidget._tabPanes[iTab]._hidden) {
                this.indexMappingT2C.push(iCar);
                this.indexMappingC2T[iCar] = iTab;
                iCar += 1;
            } else {
                this.indexMappingT2C.push(-1);
            }
        }
    }
    /**
     * called when the widget is destroyed.
     */
    uninitialize() {
        logger.debug(this.id + ".uninitialize");
        if (this.carousel) {
            this.carousel.destroy();
        }
        return true;
    }
    /**
     * setup hammer js function
     * connect onchange funtion for swipe changes, to update tab headers.
     */
    hammerTime() {
        logger.debug(this.id + ".hammerTime");
        this.carousel = new HammerCarousel(this.targetNode.querySelector(this.selectionClass) as HTMLElement);
        this.carousel.effect = this.animationStyle;
        this.carousel.onChange = (index, node) => {
            const tab = this.getTabByNode(node);
            if (tab) {
                logger.debug(this.id + "onChange carouselIndex" + index, "tabIndex", tab.index);
                this.targetWidget.showTab(tab);
            }
        };
    }

    private getTabByNode(node: HTMLElement) {
        logger.debug(this.id + ".getTabByNode");
        return this.targetWidget._tabPanes.filter(tabPan => tabPan.domNode === node)[0];
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
