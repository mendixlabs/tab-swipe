import * as Hammer from "hammerjs";
import { TabContainer, TabPane } from "./TabSwipe";

export interface SwipeOptions {
    tabContainerContent: HTMLElement;
    tabContainer: TabContainer;
}

export class SwipeHandler {
    private tabContainerContent: HTMLElement;
    private tabContainer: TabContainer;
    private tabPanes: TabPane[];
    private visibleTabs: TabPane[];
    private activePane: TabPane;

    private hammer: HammerManager;
    private threshold: number;
    private thresholdCompensation: number;
    private containerWidth: number;

    constructor(options: SwipeOptions) {
        this.threshold = 20;
        this.tabContainerContent = options.tabContainerContent;
        this.tabContainer = options.tabContainer;
        this.tabPanes = this.tabContainer.getChildren();
        this.activePane = this.tabContainer._active;
        this.containerWidth = this.tabContainerContent.offsetWidth;

        this.hammerSetup();
    }

    updateTabPosition(tab: TabPane) {
        this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden);
        this.activePane = this.tabContainer._active;
        tab.visibilityIndex = this.visibleTabs.indexOf(tab);
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - this.activePane.visibilityIndex;
            tabPan.domNode.style.transform = `translate3d(${diff * 100}%, 0, 0)`;
        });
        this.containerWidth = this.tabContainerContent.offsetWidth;
    }

    setActivePane() {
        this.activePane = this.tabContainer._active;
    }

    private hammerSetup() {
        this.hammer = new Hammer.Manager(this.tabContainerContent);
        this.hammer.add(new Hammer.Pan({ threshold: 10, direction: Hammer.DIRECTION_HORIZONTAL }));
        this.hammer.on("panstart", event => this.onPanStart(event));
        this.hammer.on("panmove", event => this.onPanMove(event));
        this.hammer.on("panend", event => this.onPanEnd(event));

        this.tabContainer.showTab(this.activePane);
        this.updateTabPosition(this.activePane);
    }

    private onPanStart(event: HammerInput) {
        // if (event.pointerType === "mouse") return;
        this.activePane.visibilityIndex = this.visibleTabs.indexOf(this.activePane);
        this.thresholdCompensation = event.deltaX;
    }

    private onPanMove(event: HammerInput) {
        // if (event.pointerType === "mouse") return; TODO: Activate for web swipe support
        this.tabContainerContent.classList.remove("animate");
        this.tabContainerContent.style.transform = `translate3d(${this.getPercentageMoved(event)}%, 0, 0)`;
    }

    private onPanEnd(event: HammerInput) {
        // if (event.pointerType === "mouse") return;
        const percentageMoved = this.getPercentageMoved(event);
        if (Math.abs(percentageMoved) > this.threshold) {
            const newActiveIndex = percentageMoved < 0
                ? this.activePane.visibilityIndex + 1
                : this.activePane.visibilityIndex - 1;
            this.tabContainer.showTab(this.visibleTabs[newActiveIndex]);
        }
        this.tabContainerContent.classList.add("animate");
        this.tabContainerContent.style.transform = `translate3d(0, 0, 0)`;
    }

    private getPercentageMoved(event: HammerInput): number {
        return (100 / this.containerWidth) * (event.deltaX - this.thresholdCompensation);
    }

    destroy() {
        this.hammer.destroy();
    }
}
