import * as Hammer from "hammerjs";
import * as domStyle from "dojo/dom-style";
import { TabContainer, TabPan } from "./TabSwipe";

export interface SwipeOptions {
    tabContainer: TabContainer;
    contentContainer: HTMLElement;
    effect: "moveIn" | "moveOver";
}

export class HammerSwipe {
    private container: HTMLElement;
    private options: SwipeOptions;
    private tabPanes: TabPan[];
    private visibleTabs: TabPan[];
    private activePan: TabPan;

    public panes: HTMLElement[];
    private containerSize: number;
    private currentIndex: number;
    private hammer: HammerManager;
    private threshold: number;
    private resizeTimer: number | null;
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
        this.hammer = new Hammer.Manager(this.container);
        this.hammer.add(new Hammer.Pan({ threshold: 10 }));
        this.hammer.on("panstart", event => this.onPanStart(event));
        this.hammer.on("panmove", event => this.onPanMove(event));
        this.hammer.on("panend pancancel", event => this.onPanEnd(event));
        this.hammer.on("swipeup swipedown", event => this.onPan(event)); // dummy useless
        this.options.tabContainer.showTab(this.activePan);
        this.showTab(this.activePan);
        // this.show(this.currentIndex);
    }
    /**
     * Trottheled resize, setting calulating container size.
     * resize should also be called when rotating the screen.
     * But wait for the animation to finish, with a timeout.
     */
     resize() {
        const resizeTimeout = 10000; // wait for animation to finish
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
            logger.debug("HammerCarousel.resize");
            this.containerSize = this.container.offsetWidth;
            this.show(this.currentIndex); // reselect to set proper sizing panels.
        }, resizeTimeout);
    }

    showTab(seeTabPan: TabPan) {
        this.visibleTabs = this.tabPanes.filter(tabPan => !tabPan._hidden);
        this.visibleTabs.forEach((tabPan, index) => {
            if (tabPan.index === seeTabPan.index) {
                seeTabPan.visibilityIndex = index;
                tabPan.visibilityIndex = index;
                return;
            }
        });
        this.visibleTabs.forEach((tabPan, index) => {
            const diff = index - seeTabPan.visibilityIndex;
            const transform = `translate3d(${diff * 100}%, 0, 0)`;
            domStyle.set(tabPan.domNode, { transform });
        });
        this.options.tabContainer.showTab(seeTabPan);
    }
    /**
     * show
     * @param {integer} showIndex - index to show next
     * @param {float} currentPercent - current swiping position
     * @param {boolean} animate - animate transition
     */
    private show(showIndex: number, currentPercent = 0, animate = false) {

        const index = Math.max(0, Math.min(showIndex, this.panes.length - 1)); // limit the index, to first last.
        const percent = currentPercent || 0; // default value for mercentage
        this.setAnimate(animate);
        for (let paneIndex = 0; paneIndex < this.panes.length; paneIndex++) {
            if (this.options.effect === "moveIn") {
                this.applyEffectMoveIn(index, paneIndex, percent);
            } else if (this.options.effect === "moveOver") {
                this.applyEffectMoveOver(index, paneIndex, percent);
            } else {
                logger.error(" no implementation method found for effect :" + this.options.effect);
            }
        }
        this.currentIndex = index;
    }

    /**
     * show
     * @param {domNode} node - node to show next
     * @param {boolean} animate - animate transition
     */
    showNode(node: HTMLElement, animate: boolean) {
        for (let paneIndex = 0; paneIndex < this.panes.length; paneIndex++) {
            if (this.panes[paneIndex] === node) {
                this.show(paneIndex, 0, animate);
                return;
            }
        }
        logger.debug("HammerCarousel.showNode: could not node show");
    }

    /**
     * to set the animation class for css transition effect.
     * @param {boolean} animate - animation should be set.
     */
    private setAnimate(animate: boolean) {
        // TODO use internat state...?
        const className = this.container.className;
        if (animate && className.indexOf("animate") === -1) {
            this.container.classList.add("animate");
        } else if (!animate && className.indexOf("animate") !== -1) {
            this.container.classList.remove("animate");
        }
    }
    /**
     * Move panes in and out by translating position
     * @param {type} showIndex - active index
     * @param {type} paneIndex - index of pane to apply effect.
     * @param {type} percent - current position
     */
    private applyEffectMoveIn(showIndex: number, paneIndex: number, percent: number) {
        let translate = null;
        const hundredPercent = 100;
        const pos = ((this.containerSize / hundredPercent) *
            (((paneIndex - showIndex) * hundredPercent) + percent));
        translate = "translate3d(" + `${pos}%` + ", 0, 0)";
        domStyle.set(this.panes[paneIndex] as HTMLElement, { transform: translate });
    }
    /**
     * Move panes in and zooms next one out and apply appacity
     * @param {type} showIndex - active index
     * @param {type} paneIndex - index of pane to apply effect.
     * @param {type} percent - current position
     */
    private applyEffectMoveOver(showIndex: number, paneIndex: number, percent: number) {
        const pane = this.panes[paneIndex] as HTMLElement;
        let translate = null;
        const hundredPercent = 100;
        const baseSize = 70; // percentage
        const pos = (this.containerSize / hundredPercent) * (((paneIndex - showIndex) * hundredPercent) + percent);
        const scale = percent > 0
            ? 1 - (((hundredPercent - baseSize) / hundredPercent) * Math.abs(percent / hundredPercent))
            : (baseSize / hundredPercent) +
                (((hundredPercent - baseSize) / hundredPercent) * Math.abs(percent / hundredPercent));
        const scalePaneIndex = percent <= 0 ? showIndex + 1 : showIndex;
        const display = "block";
        let opacity = 1;

        if ((paneIndex === showIndex && percent <= 0) || (paneIndex < showIndex && percent >= 0)) {
            translate = "translate3d(" + pos + "px, 0, 0)";
        } else if (paneIndex === scalePaneIndex) {
            translate = "scale(" + scale + ", " + scale + ")";
            opacity = percent > 0 ? 1 - (percent / hundredPercent) : Math.abs(percent / hundredPercent);
        }
        if (translate) {
            domStyle.set(pane, {
                display,
                mozTransform: translate,
                opacity: `${opacity}`,
                transform: translate,
                webkitTransform: translate
            });
        }
    }

    private onPanStart(event: HammerInput) {
    //    this.visibleTabs = this.tabPanes.filter(tabPan => tabPan._hidden).sort(tabPan => tabPan.index);
    //    this.visibleTabs.forEach((tabPan, index) => {
    //         if (tabPan.index === this.activePan.index) {
    //             this.activePan.visibilityIndex = index;
    //             return;
    //         }
    //    });

    }

    private onPanMove(event: HammerInput) {
        const ratioMoved = event.deltaX / this.container.offsetWidth; // no-of-pages-moved or %age moved

        if (event.type === "panmove") {
           /* const visibleIndex = (Math.round(ratioMoved) >= this.visibleTabs.length)
            ? this.visibleTabs.length - 1
            : Math.round(ratioMoved) < 0
                ? 0
                : Math.round(ratioMoved);
            this.visibleTabs[this.activePan.displayIndex + 1].domNode.style.transform = */
            this.container.style.transform = `transform3d(${-1 * ratioMoved * 100}%,0%,0%);`;
        }

        // this.requestTick(event);
    }

    private onPan(event: HammerInput) {
        this.requestTick(event);
    }

    private requestTick(event: HammerInput) {
        console.log("tick");
        if (!this.ticking || event.type === "panend" || event.type === "pancancel") {
            console.log("tick on");
            this.ticking = true;
            requestAnimationFrame(this.update.bind(this, event));
        }
    }

    update(event: HammerInput) {
        const numberInPercent = 100;
        const delta = event.deltaX;
        let percent = (numberInPercent / this.containerSize) * delta;
        let animate = false;

        percent = percent > numberInPercent ? numberInPercent : percent;
        if (event.type === "panend" || event.type === "pancancel") {
            this.hammer.stop(false);
            if (Math.abs(percent) > this.threshold && event.type === "panend") {
                this.currentIndex += (percent < 0) ? 1 : -1;
                // limit the index, to first last.
                this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.panes.length - 1));
            }
            percent = 0;
            animate = true;
        }
        this.show(this.currentIndex, percent, animate);
        this.ticking = false;
    }

    private onPanEnd(event: HammerInput) {
        // const ratioMoved = Math.abs(event.deltaX) / this.container.offsetWidth;
        const numberInPercent = 100;
        const delta = event.deltaX;
        let percent = (numberInPercent / this.containerSize) * delta;
        let animate = false;

        percent = percent > numberInPercent ? numberInPercent : percent;
        if (event.type === "panend" || event.type === "pancancel") {
            this.hammer.stop(false);
            if (Math.abs(percent) > this.threshold && event.type === "panend") {
                this.currentIndex += (percent < 0) ? 1 : -1;
                // limit the index, to first last.
                this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.panes.length - 1));
                const tabPan = this.tabPanes.filter(tabPan => tabPan.index === this.currentIndex)[0];
                this.options.tabContainer.showTab(tabPan);
                // this.tabPanes.filter(tabPan => tabPan.index === this.currentIndex)[0].show();
            }
            percent = 0;
            animate = true;
        }
        // this.show(this.currentIndex, percent, animate);
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
