import * as Hammer from "hammerjs";
import { TabContainer, TabPane } from "./TabSwipe";

export interface SwipeOptions {
    tabContainerContent: HTMLElement;
    tabContainer: TabContainer;
    lazyLoad: boolean;
}

export class SwipeHandler {
    private tabContainerContent: HTMLElement;
    private tabContainer: TabContainer;
    private lazyLoad?: boolean;
    private tabPanes: TabPane[];
    private visibleTabs: TabPane[];
    private activePane: TabPane;

    private hammer: HammerManager;
    private threshold: number;
    private isSwiping = false;
    private panStartPosition = 0;
    private containerWidth: number;
    private isLazyLoaded: boolean;

    constructor(options: SwipeOptions) {
        this.threshold = 20;
        this.tabContainerContent = options.tabContainerContent;
        this.tabContainer = options.tabContainer;
        this.lazyLoad = options.lazyLoad;
        this.tabPanes = this.tabContainer.getChildren();
        this.activePane = this.tabContainer._active;
        this.containerWidth = this.tabContainerContent.offsetWidth;

        this.hammerSetup();
    }

    setTabPanePosition(tab: TabPane) {
        if (!this.isSwiping) {
            this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden);
            this.activePane = this.tabContainer._active;
            tab.visibilityIndex = this.visibleTabs.indexOf(tab);
            this.visibleTabs.forEach((tabPane, index) => {
                const position = (index - this.activePane.visibilityIndex) * 100;
                tabPane.domNode.style.transform = `translate3d(${position}%, 0, 0)`;
                if (this.lazyLoad && !tabPane._parsed) {
                    tabPane.domNode.classList.add("widget-tab-swipe-lazy-pane");
                } else {
                    tabPane.domNode.classList.remove("widget-tab-swipe-lazy-pane");
                }
            });
            this.containerWidth = this.tabContainerContent.offsetWidth;
        }
    }

    destroy() {
        this.hammer.destroy();
    }

    private hammerSetup() {
        this.hammer = new Hammer.Manager(this.tabContainerContent);
        this.hammer.add(new Hammer.Pan({ threshold: 10, direction: Hammer.DIRECTION_HORIZONTAL }));
        this.hammer.on("panstart", event => this.onPanStart(event));
        this.hammer.on("panmove", event => this.onPanMove(event));
        this.hammer.on("panend", event => this.onPanEnd(event));

        this.loadPanes();
    }

    private loadPanes() {
        const activePane = this.tabContainer._active;
        if (!this.lazyLoad) {
            this.tabPanes.forEach(tabPane => this.showTab(tabPane, true));
        } else {
            this.tabPanes.forEach(tabPane => this.setTabPanePosition(tabPane));
        }
        this.showTab(activePane, true);
    }

    private showTab(activePane: TabPane, updatePosition = false) {
        this.tabContainer.showTab(activePane);
        if (updatePosition) {
            this.setTabPanePosition(activePane);
        }
    }

    private onPanStart(event: HammerInput) {
        // Cancel mouse events
        if (event.pointerType === "mouse") return;
        this.activePane.visibilityIndex = this.visibleTabs.indexOf(this.activePane);
        this.panStartPosition = event.deltaX;
        this.isSwiping = true;
    }

    private onPanMove(event: HammerInput) {
        if (this.isSwiping && this.authorizeSwipe(event)) {
            this.lazyLoadTabPane(event);
            this.tabContainerContent.classList.remove("animate");
            const position = this.getPercentageMoved(event);
            this.tabContainerContent.style.transform = `translate3d(${position}%, 0, 0)`;
        } else {
            this.isSwiping = false;
        }
    }

    private onPanEnd(event: HammerInput) {
        if (this.isSwiping) {
            this.isSwiping = false;
            this.isLazyLoaded = false;
            const percentageMoved = this.getPercentageMoved(event);
            if (Math.abs(percentageMoved) > this.threshold) {
                const newActiveIndex = this.activePane.visibilityIndex + this.getDirection(event);
                this.tabContainer.showTab(this.visibleTabs[ newActiveIndex ]);
            }
            this.tabContainerContent.classList.add("animate");
            this.tabContainerContent.style.transform = `translate3d(0, 0, 0)`;
        }
    }

    private lazyLoadTabPane(event: HammerInput) {
        if (this.lazyLoad && this.isSwiping && !this.isLazyLoaded) {
            const nextTab = this.tabPanes[this.activePane.visibilityIndex + this.getDirection(event)];
            nextTab.domNode.classList.remove("widget-tab-swipe-lazy-pane");
            this.showTab(nextTab);
            this.showTab(this.activePane);
            this.isLazyLoaded = true;
        }
    }

    private authorizeSwipe(event: HammerInput): boolean {
        return (this.getDirection(event) > 0 && this.activePane.visibilityIndex < this.visibleTabs.length - 1)
            || (this.getDirection(event) < 0 && this.activePane.visibilityIndex !== 0);
    }

    private getPercentageMoved(event: HammerInput): number {
        return (100 / this.containerWidth) * (event.deltaX - this.panStartPosition);
    }

    private getDirection(event: HammerInput): number {
        return (event.deltaX - this.panStartPosition) > 0 ? -1 : 1;
    }
}
