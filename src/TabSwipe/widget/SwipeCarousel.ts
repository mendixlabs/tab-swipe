import * as Hammer from "hammerjs";
import { TabContainer, TabPan } from "./TabSwipe";

export interface SwipeOptions {
    tabContainer: TabContainer;
    contentContainer: HTMLElement;
    effect: "moveIn" | "moveOver";
}

export class SwipeCarousel {
    private container: HTMLElement;
    private options: SwipeOptions;
    private tabPanes: TabPan[];
    private visibleTabs: TabPan[];
    private activePan: TabPan;

    private panes: HTMLElement[];
    private containerSize: number;
    private currentIndex: number;
    private hammer: HammerManager;
    private threshold: number;
    private ticking: boolean;

    constructor(options: SwipeOptions) {
        this.options = options;
        this.threshold = 20;
        this.currentIndex = 0;
        this.ticking = false;
        this.container = options.contentContainer;
        this.panes = [].slice.call(this.container.children);
        this.tabPanes = [].slice.call(options.tabContainer.getChildren());
        this.activePan = options.tabContainer._active;

        this.containerSize = this.container.offsetWidth;
        this.hammerSetup();
    }

    hammerSetup() {
        this.hammer = new Hammer.Manager(this.container);
        this.hammer.add(new Hammer.Pan({ threshold: 10 }));
        this.hammer.on("panstart panmove", event => this.updateAnimation(event));
        this.hammer.on("panend pancancel", event => this.onPanEnd(event));
        this.options.tabContainer.showTab(this.activePan);
        this.showTab(this.activePan);
    }

    showTab(seeTabPan: TabPan) {
        this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden);
        this.visibleTabs.forEach((tabPan, index) => {
            if (tabPan.index === seeTabPan.index) {
                seeTabPan.visibilityIndex = index;
                tabPan.visibilityIndex = index;
                return; // Not useful - Doesn't work.
            }
        });
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - seeTabPan.visibilityIndex;
            const transform = `translate3d(${diff * 100}%, 0px, 0px)`;
            tabPan.domNode.style.transform = transform;
        });
    }

    private onPanMove(event: HammerInput) {
// <<<<<<< HEAD:src/TabSwipe/widget/HammerCarousel.ts
        const ratioMoved = event.deltaX / this.container.offsetWidth; // no-of-pages-moved or %age moved

        if (event.type === "panmove") {
           /* const visibleIndex = (Math.abs(Math.round(ratioMoved)) >= this.visibleTabs.length)
            ? this.visibleTabs.length - 1
            : Math.round(ratioMoved) < 0
                ? 0
                : Math.round(ratioMoved);
            this.visibleTabs[this.activePan.displayIndex + 1].domNode.style.transform = */
           // this.container.style.transform = `translate3d(${-1 * ratioMoved * 100}%, 0%, 0%);`;
            this.container.classList.add("animate");
            this.container.style.transform = `translate3d(${-1 * ratioMoved * 100}%, 0px, 0px)`;
/* =======
        const diff = this.container.offsetWidth - event.deltaX;
        if (event.type === "panmove" && !(diff % 3)) {
            this.options.contentContainer.style.transform = `translate3d(${diff}px, 0%, 0%)`;
>>>>>>> Renamed HammerCarousel to SwipeCarousel:src/TabSwipe/widget/SwipeCarousel.ts
*/
        }
    }
    private updateAnimation(event: HammerInput) {
        requestAnimationFrame(() => this.onPanMove(event));
    }

    private onPanEnd(event: HammerInput) {
        const numberInPercent = 100;
        const delta = event.deltaX;
        let percent = (numberInPercent / this.containerSize) * delta;
        let animate = false;

        percent = percent > numberInPercent ? numberInPercent : percent;
        if (event.type === "panend" || event.type === "pancancel") {
            this.hammer.stop(false);
            if (Math.abs(percent) > this.threshold && event.type === "panend") {
                const previousIndex = this.currentIndex;
                this.currentIndex += (percent < 0) ? 1 : -1;
// <<<<<<< HEAD:src/TabSwipe/widget/HammerCarousel.ts

                this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.panes.length - 1));
                const tabPane = this.visibleTabs.filter(tabPan => tabPan.index === this.currentIndex)[0];
                this.options.tabContainer.showTab(tabPane);
                this.panes[previousIndex].classList.add(previousIndex < this.currentIndex ? "prev" : "next");
/*=======
                const minValue = Math.min(this.currentIndex, this.panes.length - 1);
                this.currentIndex = Math.max(0, minValue);
                const tabPan = this.visibleTabs.filter(visibleTab => visibleTab.index === this.currentIndex)[0];
                this.options.tabContainer.showTab(tabPan);
>>>>>>> Renamed HammerCarousel to SwipeCarousel:src/TabSwipe/widget/SwipeCarousel.ts*/
            }
            percent = 0;
            animate = true;
        }
        this.ticking = false;
    }

    /**
     * Unbinds all events and input events and makes the manager unusable.
     * It does NOT unbind any domEvent listeners.
     */
    destroy() {
        this.hammer.destroy();
    }
}
