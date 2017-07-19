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
    private timeoutValue: number;

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
        this.hammer.on("pan", event => this.onPanMove(event));
        this.options.tabContainer.showTab(this.activePan);
        this.showTab(this.activePan);
    }

    showTab(showTabPane: TabPan) {
        this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden);
        this.activePan = this.options.tabContainer._active;
        showTabPane.visibilityIndex = this.visibleTabs.indexOf(showTabPane);
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - showTabPane.visibilityIndex;
            const transform = `translate3d(${diff * 100}%, 0px, 0px)`;
            tabPan.domNode.style.transform = transform;
        });
    }

    private onPanMove(event: HammerInput) {
        const ratioMoved = (event.deltaX / this.container.offsetWidth) * 100 ; // no-of-pages-moved or %age moved
        if (event.isFirst) { // its not working here. the code here should be in panonstart event
            this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden); // visible tabs;
            this.activePan = this.options.tabContainer._active;
            this.activePan.visibilityIndex = this.visibleTabs.indexOf(this.activePan);
        }

        this.container.classList.add("animate");
        // DJK: to many translate3ds modify to use %age of tabcontent width eg:
        // tabContent width for all tabs = noOfTabs * 100%.
        // each unit tabWidth = 100%/noOfTabs (the result is a %age);
        // there after move the tabContent with translate3d(). instead of applying
        // it to every tab like you did below
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - this.activePan.visibilityIndex;
            const transform = `translate3d(${(diff * 100) + ratioMoved}%, 0px, 0px)`;
            tabPan.domNode.style.transform = transform;
        });

        if (event.isFinal) { // should be used in panonend or panoncancel event
            const movedPercent = Math.abs(event.deltaX / this.container.offsetWidth) * 100;
            let finalSteps = Math.abs(movedPercent) > this.threshold ? 1 : 0;
            finalSteps *= event.deltaX < 0 ? 1 : -1; // finalSteps = event.deltaX<0?finalSteps:finalSteps*-1
            let finalVisibilityIndex = finalSteps + this.activePan.visibilityIndex;
            finalVisibilityIndex = finalVisibilityIndex > (this.visibleTabs.length - 1)
                ? this.visibleTabs.length - 1
                : finalVisibilityIndex < 0 ? 0 : finalVisibilityIndex;
            // this.container.classList.add("animate");
            clearTimeout( this.timeoutValue );
            this.timeoutValue = setTimeout( () => {
                this.options.tabContainer.showTab(this.visibleTabs[finalVisibilityIndex]);
                this.container.classList.remove("animate");
            }, 400 );
        }

    }

    /**
     * Unbinds all events and input events and makes the manager unusable.
     * It does NOT unbind any domEvent listeners.
     */
    destroy() {
        this.hammer.destroy();
    }
}
