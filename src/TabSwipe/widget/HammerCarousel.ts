import * as Hammer from "hammerjs";
import * as domStyle from "dojo/dom-style";

export class HammerSwipe {
    private container: HTMLElement;
    private direction: number;
    public panes: HTMLElement[];
    private containerSize: number;
    private currentIndex: number;
    private hammer: HammerManager;
    private threshold: number;
    public effect: "moveIn" | "moveOver";
    private resizeTimeout: number; // 10000; // wait for animation to finish.
    private resizeTimer: number | null;
    private ticking: boolean;


    /**
     * Carousel
     * @param {node} container - dom node to apply to
     * @param {Hammer.Direction} direction - direction of movement.
     * @param {string} [panes] - optional css selector for children.
     * @constructor
     */
    constructor(container: HTMLElement) {
        this.direction = Hammer.DIRECTION_HORIZONTAL;
        this.threshold = 20;
        this.resizeTimeout = 10000;
        this.currentIndex = 0;
        this.effect = "moveIn";
        this.ticking = false;
        this.container = container;
        this.panes = [].slice.call(this.container.children);

        this.containerSize = this.container.offsetWidth;
        this.hammer = new Hammer.Manager(this.container);
        this.hammer.add(new Hammer.Pan({ direction: this.direction, threshold: 10 }));
        this.hammer.on("panstart panmove panend pancancel", event => this.onPan(event));
        this.show(this.currentIndex);
    }
    /**
     * Trottheled resize, setting calulating container size.
     * resize should also be called when rotating the screen.
     * But wait for the animation to finish, with a timeout.
     */
     resize() {
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.resizeTimer = setTimeout(() => {
            logger.debug("HammerCarousel.resize");
            this.containerSize = this.container.offsetWidth;
            this.show(this.currentIndex); // reselect to set proper sizing panels.
        }, this.resizeTimeout);
    }
    /**
     * returns the property based on the direction
     * @param {type} direction - direction of the motion
     * @param {type} hProp - horizontal prop
     * @param {type} vProp - vertical prop
     * @returns {unresolved} - prop
     */
    /* private dirProp(direction: number, hProp: string | number, vProp: string | number) {
        // tslint:disable-next-line no-bitwise
        return (direction & Hammer.DIRECTION_HORIZONTAL) ? hProp : vProp;
    } */
    /**
     * show
     * @param {integer} showIndex - index to show next
     * @param {float} currentPercent - current swiping position
     * @param {boolean} animate - animate transition
     */
    private show(showIndex: number, currentPercent = 0, animate = false) {
        /* logger.debug("HammerCarousel.show Index", showIndex, "percent", percent, "animate",
            animate, "current Index", this.currentIndex);
        */
        const index = Math.max(0, Math.min(showIndex, this.panes.length - 1)); // limit the index, to first last.
        const percent = currentPercent || 0; // default value for mercentage
        this.setAnimate(animate);
        for (let paneIndex = 0; paneIndex < this.panes.length; paneIndex++) {
            if (this.effect === "moveIn") {
                this.applyEffectMoveIn(index, paneIndex, percent);
            } else if (this.effect === "moveOver") {
                this.applyEffectMoveOver(index, paneIndex, percent);
            } else {
                logger.error(" no implementation method found for effect :" + this.effect);
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
/*
    private move(node: HTMLElement, place: string) {
        this.setAnimate(false);
        var translate = null,
            placeIndex = place === "left" ? -1 : 1,
            pos = this.containerSize * placeIndex;
        if (this.direction & Hammer.DIRECTION_HORIZONTAL) { // eslint-disable-line no-bitwise
            translate = "translate3d(" + pos + "px, 0, 0)";
        } else { // vertical
            translate = "translate3d(0, " + pos + "px, 0)";
        }
        node.style.transform = translate;
        node.style.mozTransform = translate;
        node.style.webkitTransform = translate;
    }*/
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
        const pos = (this.containerSize / hundredPercent) *
            (((paneIndex - showIndex) * hundredPercent) + percent);
        translate = "translate3d(" + pos + "px, 0, 0)"; // the direction is already horizontal
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

        logger.debug("showIndex", showIndex, "paneIndex", paneIndex,
            "scalePaneIndex", scalePaneIndex, "percent", percent);
        if ((paneIndex === showIndex && percent <= 0) ||
                (paneIndex < showIndex && percent >= 0)) {
            // display = "block"; // TODO probably bad for rendering.
            translate = "translate3d(" + pos + "px, 0, 0)";
        } else if (paneIndex === scalePaneIndex) { // TODO should only scale next, not all,shouldhide them.
            // display = "block"; // TODO probably bad for rendering.
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
    /**
     * handle Hammer pan event
     * @param {Object} ev - event object
     */
    private onPan(ev: HammerInput) {
        this.requestTick(ev);
    }

    private requestTick(ev: HammerInput) {
        console.log("tick");
        if (!this.ticking || ev.type === "panend" || ev.type === "pancancel") {
            console.log("tick on");
            this.ticking = true;
            requestAnimationFrame(this.update.bind(this, ev));
        }
    }
    update(ev: HammerInput) {
        // console.log(".onPan", ev);
        const numberInPercent = 100;
        const delta = ev.deltaX;
        let percent = (numberInPercent / this.containerSize) * delta;
        let animate = false;
        let changed = false;

        percent = percent > numberInPercent ? numberInPercent : percent;
        if (ev.type === "panend" || ev.type === "pancancel") {
            this.hammer.stop(false);
            if (Math.abs(percent) > this.threshold && ev.type === "panend") {
                this.currentIndex += (percent < 0) ? 1 : -1;
                // limit the index, to first last.
                this.currentIndex = Math.max(0, Math.min(this.currentIndex, this.panes.length - 1));
                this.onChange(this.currentIndex, this.panes[this.currentIndex] );
            }
            percent = 0;
            animate = true;
        }
        this.show(this.currentIndex, percent, animate);
        if (changed) {
            this.afterChange(this.currentIndex);
        }
        this.ticking = false;
    }

    onChange(currentIndex: number, node: HTMLElement) {
        logger.warn("HammerCarousel.onChange not implemented " + currentIndex, node);
        // interface, should be implemented
        // could be better.
    }

    afterChange(currentIndex: number) {
        logger.warn("HammerCarousel.afterChange not implemented " + currentIndex);
        // interface, should be implemented
        // could be better.
    }

    /**
     * Unbinds all events and input events and makes the manager unusable.
     * It does NOT unbind any domEvent listeners.
     */
    destroy() {
        this.hammer.destroy();
    }
}
