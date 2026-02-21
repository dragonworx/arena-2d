import { describe, expect, test } from "bun:test";
import { ScrollContainer } from "../src/elements/ScrollContainer";
import { Element } from "../src/core/Element";
import { DirtyFlags } from "../src/core/DirtyFlags";

describe("ScrollContainer", () => {
    test("initial state", () => {
        const sc = new ScrollContainer();
        expect(sc.scrollX).toBe(0);
        expect(sc.scrollY).toBe(0);
        expect(sc.clipContent).toBe(true);
    });

    test("content bounds calculation", () => {
        const sc = new ScrollContainer();
        sc.width = 100;
        sc.height = 100;
        
        const child = new Element("child");
        child.x = 200;
        child.y = 300;
        child.width = 50;
        child.height = 50;
        sc.addChild(child);
        
        sc.update(16);
        
        expect(sc.contentBounds.width).toBe(250);
        expect(sc.contentBounds.height).toBe(350);
    });

    test("scroll clamping", () => {
        const sc = new ScrollContainer();
        sc.width = 100;
        sc.height = 100;
        
        const child = new Element("child");
        child.width = 500;
        child.height = 500;
        sc.addChild(child);
        
        sc.update(16);
        
        sc.scrollX = 1000;
        expect(sc.scrollX).toBe(400);
        
        sc.scrollY = -100;
        expect(sc.scrollY).toBe(0);
    });

    test("scrolled world matrix for children", () => {
        const sc = new ScrollContainer();
        sc.x = 10;
        sc.y = 20;
        sc.width = 100;
        sc.height = 100;
        
        const child = new Element("child");
        child.x = 50;
        child.y = 50;
        child.width = 500;
        child.height = 500;
        sc.addChild(child);
        
        sc.update(16);
        expect(child.worldMatrix[4]).toBe(60);
        
        sc.scrollX = 20;
        sc.update(16);
        expect(child.worldMatrix[4]).toBe(40);
    });

    test("hitTest with scroll", () => {
        const sc = new ScrollContainer("scroller");
        sc.x = 100;
        sc.y = 100;
        sc.width = 100;
        sc.height = 100;
        
        const child = new Element("child-hit");
        child.x = 50;
        child.y = 50;
        child.width = 10;
        child.height = 10;
        
        const spacer = new Element("spacer");
        spacer.x = 500;
        spacer.y = 500;
        spacer.width = 10;
        spacer.height = 10;
        
        sc.addChild(spacer);
        sc.addChild(child);
        
        sc.update(16);
        
        // Unscrolled: child at (150, 150)
        expect(sc.hitTest(155, 155)).toBe(child);
        
        sc.scrollX = 50; 
        sc.update(16);
        
        // Scrolled: child at (100, 150). Point (155, 155) is in container background.
        expect(sc.hitTest(155, 155)).toBe(sc); 
        expect(sc.hitTest(105, 155)).toBe(child);
        
        // Point outside container
        expect(sc.hitTest(0, 0)).toBeNull();
    });

    test("inertia", () => {
        const sc = new ScrollContainer();
        sc.width = 100;
        sc.height = 100;
        const child = new Element("child");
        child.width = 1000;
        child.height = 1000;
        sc.addChild(child);
        sc.update(16);

        (sc as any)._velocityX = -10;
        sc.update(16);
        
        expect(sc.scrollX).toBeGreaterThan(0);
        const firstScroll = sc.scrollX;
        
        sc.update(16);
        expect(sc.scrollX).toBeGreaterThan(firstScroll);
        
        for(let i=0; i<100; i++) sc.update(16);
        const finalScroll = sc.scrollX;
        sc.update(16);
        expect(sc.scrollX).toBeCloseTo(finalScroll, 1);
    });
});
