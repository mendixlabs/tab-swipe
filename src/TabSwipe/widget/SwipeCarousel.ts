import * as Hammer from "hammerjs";
import { TabContainer, TabPan } from "./TabSwipe";

export interface SwipeOptions {
    tabContainer: TabContainer;
    contentContainer: HTMLElement;
}

export class SwipeCarousel {
    private container: HTMLElement;
    private options: SwipeOptions;
    private tabPanes: TabPan[];
    private visibleTabs: TabPan[];
    private activePan: TabPan;

    private hammer: HammerManager;
    private threshold: number;
    private timeoutValue: number;
    private containerWidth: number;

    constructor(options: SwipeOptions) {
        this.options = options;
        this.threshold = 20;
        this.container = options.contentContainer;
        this.tabPanes = [].slice.call(options.tabContainer.getChildren());
        this.activePan = options.tabContainer._active;
        this.containerWidth = this.container.offsetWidth;

        this.hammerSetup();
    }

    hammerSetup() {
        this.hammer = new Hammer.Manager(this.container);
        this.hammer.add(new Hammer.Pan({ threshold: 10, direction: Hammer.DIRECTION_HORIZONTAL }));
        this.hammer.on("panstart", event => this.onPanStart(event));
        this.hammer.on("panmove", event => this.onPanMove(event));
        this.hammer.on("panend", event => this.onPanEnd(event));

        this.options.tabContainer.showTab(this.activePan);
        this.showTab(this.activePan);
    }

    showTab(showTabPane: TabPan) {
        this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden);
        this.activePan = this.options.tabContainer._active;
        showTabPane.visibilityIndex = this.visibleTabs.indexOf(showTabPane);
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - showTabPane.visibilityIndex;
            const transform = `translate3d(${diff * 100}%, 0, 0)`;
            tabPan.domNode.style.transform = transform;
        });
        this.containerWidth = this.container.offsetWidth;
    }

    private onPanMove(event: HammerInput) {
        if (event.pointerType === "mouse") return;
        const percentageMoved = (event.deltaX / this.containerWidth) * 100 ; // no-of-pages-moved or %age moved

        this.container.classList.add("animate");
        // DJK: too many translate3ds modify to use %age of tabcontent width eg:
        // tabContent width for all tabs = noOfTabs * 100%.
        // each unit tabWidth = 100%/noOfTabs (the result is a %age);
        // there after move the tabContent with translate3d(). instead of applying
        // it to every tab like you did below
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - this.activePan.visibilityIndex;
            const transform = `translate3d(${(diff * 100) + percentageMoved}%, 0, 0)`;
            tabPan.domNode.style.transform = transform;
        });
    }

    private onPanStart(event: HammerInput) {
        if (event.pointerType === "mouse") return;
        this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden); // visible tabs;
        this.activePan = this.options.tabContainer._active;
        this.activePan.visibilityIndex = this.visibleTabs.indexOf(this.activePan);
    }

    private onPanEnd(event: HammerInput) {
        if (event.pointerType === "mouse") return;
        const movedPercentage = Math.abs(event.deltaX / this.containerWidth) * 100;
        if (Math.abs(movedPercentage) > this.threshold) {
            const movedRatio = movedPercentage / 100;
            let movedSteps = Math.max(1, Math.floor(movedRatio));
            movedSteps *= event.deltaX < 0 ? 1 : -1;

            let finalVisibilityIndex = movedSteps + this.activePan.visibilityIndex;
            finalVisibilityIndex = Math.max(0, Math.min(finalVisibilityIndex, this.visibleTabs.length - 1));

            clearTimeout(this.timeoutValue);
            this.timeoutValue = setTimeout(() => {
                this.options.tabContainer.showTab(this.visibleTabs[finalVisibilityIndex]);
                this.container.classList.remove("animate");
            }, 400);
        } else {
            this.options.tabContainer.showTab(this.activePan);
        }
    }

    destroy() {
        this.hammer.destroy();
    }
}
