import { describe, expect, mock, test } from "bun:test";
import { AnimationRegistry } from "../src/animation/AnimationRegistry";
import { Animator } from "../src/animation/Animator";
import {
  BooleanChannel,
  NumberChannel,
  StringChannel,
} from "../src/animation/Channel";
import { Clip } from "../src/animation/Clip";
import { ColorChannel } from "../src/animation/ColorChannel";
import { Easing } from "../src/animation/Easing";
import { Timeline } from "../src/animation/Timeline";
import { ElementAdapter } from "../src/animation/adapter/ElementAdapter";
import { Element } from "../src/core/Element";

describe("Animation System", () => {
  describe("Timeline", () => {
    test("advances time for children", () => {
      const timeline = new Timeline();
      const child = { update: mock() };
      timeline.add(child);

      timeline.update(0.1);
      expect(timeline.time).toBe(0.1);
      expect(child.update).toHaveBeenCalledWith(0.1);
    });

    test("scales time", () => {
      const timeline = new Timeline();
      const child = { update: mock() };
      timeline.add(child);
      timeline.timeScale = 0.5;

      timeline.update(1.0);
      expect(timeline.time).toBe(0.5);
      expect(child.update).toHaveBeenCalledWith(0.5);
    });

    test("pausing stops updates", () => {
      const timeline = new Timeline();
      const child = { update: mock() };
      timeline.add(child);
      timeline.paused = true;

      timeline.update(1.0);
      expect(timeline.time).toBe(0);
      expect(child.update).not.toHaveBeenCalled();
    });
  });

  describe("Channels", () => {
    test("NumberChannel interpolates linearly", () => {
      const channel = new NumberChannel();
      channel.addKeyframe(0, 0);
      channel.addKeyframe(1, 100);

      expect(channel.evaluate(0)).toBe(0);
      expect(channel.evaluate(0.5)).toBe(50);
      expect(channel.evaluate(1)).toBe(100);
    });

    test("BooleanChannel holds value until keyframe", () => {
      const channel = new BooleanChannel();
      channel.addKeyframe(0, false);
      channel.addKeyframe(1, true);

      expect(channel.evaluate(0)).toBe(false);
      expect(channel.evaluate(0.9)).toBe(false);
      // Wait, our implementation says t < 1 ? v1 : v2.
      // So at 0.999 it is false, at 1.0 it is true.
      expect(channel.evaluate(1)).toBe(true);
    });

    test("applies easing", () => {
      const channel = new NumberChannel();
      channel.addKeyframe(0, 0);
      channel.addKeyframe(1, 100, Easing.QuadIn); // ease on the target frame

      // QuadIn(0.5) = 0.25 -> 25
      expect(channel.evaluate(0.5)).toBe(25);
    });
  });

  describe("Animator", () => {
    test("plays clip and updates target", () => {
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      const xChannel = new NumberChannel();
      xChannel.addKeyframe(0, 0);
      xChannel.addKeyframe(1, 100);
      clip.addChannel("x", xChannel);

      const animator = new Animator(clip, adapter);
      animator.play();

      animator.update(0.5);
      expect(el.x).toBe(50);

      animator.update(0.5);
      expect(el.x).toBe(100);
    });

    test("looping", () => {
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      // Duration 1s
      clip.addChannel("x", new NumberChannel());
      const channel = clip.channels.get("x") as NumberChannel;
      channel.addKeyframe(0, 0);
      channel.addKeyframe(1, 100);

      const animator = new Animator(clip, adapter, { loop: true });
      animator.play();

      animator.update(1.5); // Should be at 0.5s in second loop
      expect(animator.time).toBeCloseTo(0.5);
      // We haven't called _apply yet (it's called inside update).
      // Since we updated by 1.5s, update() logic:
      // time += 1.5 -> 1.5
      // if time >= duration (1.5 >= 1) -> loop -> time = 0.5
      // apply(0.5) -> x = 50
      expect(el.x).toBe(50);
    });

    test("yoyo", () => {
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      // Duration 1s
      clip.addChannel("x", new NumberChannel());
      const channel = clip.channels.get("x") as NumberChannel;
      channel.addKeyframe(0, 0);
      channel.addKeyframe(1, 100);

      const animator = new Animator(clip, adapter, { loop: true, yoyo: true });
      animator.play();

      // Forward 1s -> at end(100)
      animator.update(1.0);
      expect(el.x).toBe(100);

      // Another 0.5s -> should be going backwards from 1.0 to 0.5
      animator.update(0.5);
      expect(animator.time).toBe(0.5);
      expect(el.x).toBe(50);
    });

    test("callbacks", () => {
      const onComplete = mock();
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      clip.addChannel("x", new NumberChannel()); // dummy
      const ch = clip.channels.get("x") as NumberChannel;
      ch.addKeyframe(0, 0);
      ch.addKeyframe(1, 10);

      const animator = new Animator(clip, adapter, { onComplete });
      animator.play();
      animator.update(1.0); // exact finish

      expect(onComplete).toHaveBeenCalled();
      expect(animator.isPlaying).toBe(false);
    });

  });

  describe("Task 1-4 Features", () => {
    test("Task 1: Auto-Detach on Completion", () => {
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      clip.addChannel("x", new NumberChannel());
      const ch = clip.channels.get("x") as NumberChannel;
      ch.addKeyframe(0, 0);
      ch.addKeyframe(1, 100);

      const timeline = new Timeline();
      const animator = new Animator(clip, adapter);
      animator.attachTo(timeline);
      animator.play();

      // Run to completion
      timeline.update(1.1);

      expect(animator.isPlaying).toBe(false);
      // Verify detached - we can't check private _timeline, but we can check timeline children
      // We need to access private _children or check if update is called.
      // Let's spy on update
      const updateSpy = mock((dt: number) => {
        /* no-op */
      });
      // @ts-ignore
      animator.update = updateSpy;

      timeline.update(0.1);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    test("Task 2: Cancel (Freeze in Place)", () => {
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      const ch = new NumberChannel();
      ch.addKeyframe(0, 0);
      ch.addKeyframe(1, 100);
      clip.addChannel("x", ch);

      const animator = new Animator(clip, adapter);
      animator.play();
      animator.update(0.5);
      expect(el.x).toBe(50);

      animator.cancel();
      expect(animator.isPlaying).toBe(false);
      expect(animator.paused).toBe(false);

      // Should not update value anymore
      animator.update(0.5); // would be end of clip
      expect(el.x).toBe(50); // frozen
    });

    describe("Task 3: Conflict Resolution", () => {
      // We need to wire up the registry manually since we aren't using Scene here
      const registry = new AnimationRegistry();

      test("Newest cancels older on same property", () => {
        const el = new Element();
        const adapter = new ElementAdapter(el);
        const clip = new Clip("test");
        const ch = new NumberChannel();
        ch.addKeyframe(0, 0);
        ch.addKeyframe(1, 100);
        clip.addChannel("x", ch);

        const anim1 = new Animator(clip, adapter, { registry });
        const anim2 = new Animator(clip, adapter, { registry });

        anim1.play();
        expect(anim1.isPlaying).toBe(true);

        anim2.play(); // Should cancel anim1 because both use property 'x' on same adapter
        expect(anim1.isPlaying).toBe(false);
        expect(anim2.isPlaying).toBe(true);
      });

      test("Different properties do not cancel", () => {
        const el = new Element();
        const adapter = new ElementAdapter(el);

        const clipX = new Clip("x");
        const chX = new NumberChannel();
        chX.addKeyframe(0, 0);
        chX.addKeyframe(1, 100);
        clipX.addChannel("x", chX);

        const clipY = new Clip("y");
        const chY = new NumberChannel();
        chY.addKeyframe(0, 0);
        chY.addKeyframe(1, 100);
        clipY.addChannel("y", chY);

        const anim1 = new Animator(clipX, adapter, { registry });
        const anim2 = new Animator(clipY, adapter, { registry });

        anim1.play();
        anim2.play();
        expect(anim1.isPlaying).toBe(true);
        expect(anim2.isPlaying).toBe(true);
      });
    });

    test("Task 4: Delay Support", () => {
      const el = new Element();
      const adapter = new ElementAdapter(el);
      const clip = new Clip("test");
      const ch = new NumberChannel();
      ch.addKeyframe(0, 0);
      ch.addKeyframe(1, 100);
      clip.addChannel("x", ch);

      const animator = new Animator(clip, adapter, { delay: 0.5 });
      animator.play();

      // Update 0.3s -> still in delay
      animator.update(0.3);
      expect(el.x).toBe(0); // Assuming start value 0 is applied initially? 
      // Actually update() applies value at current time.
      // During delay, we do NOT apply values.
      // But we initialized el.x to 0? Element defaults x=0.
      
      // Update another 0.3s -> total 0.6s. Delay 0.5s consumed.
      // Leftover 0.1s applied to animation.
      animator.update(0.3);
      expect(animator.time).toBeCloseTo(0.1);
      expect(el.x).toBeCloseTo(10); // 10% of 100
    });
  });

  describe("Task 5-9 Features", () => {
    test("Task 8: ColorChannel Interpolation", () => {
      const ch = new ColorChannel();
      // Test hex
      expect(ch.parseColor("#ff0000")).toEqual([255, 0, 0, 1]);
      expect(ch.parseColor("#00ff0080")).toEqual([0, 255, 0, 128 / 255]);
      
      // Test rgb
      expect(ch.parseColor("rgb(0, 0, 255)")).toEqual([0, 0, 255, 1]);
      
      // Interpolation
      const red = "#ff0000";
      const blue = "#0000ff";
      // t=0.5 -> purple (127.5, 0, 127.5, 1) -> rounded (128, 0, 128, 1)
      const mid = ch["interpolate"](red, blue, 0.5);
      expect(mid).toBe("rgba(128, 0, 128, 1)");
    });

    test("Task 5: Element.animate()", () => {
        const scene = {
            animationRegistry: { register: mock(), unregister: mock() },
            timeline: new Timeline(),
        };
        const el = new Element();
        // @ts-ignore
        el.scene = scene;

        const anim = el.animate({ x: 100 }, { duration: 1 });
        expect(anim.isPlaying).toBe(true);
        expect(scene.animationRegistry.register).toHaveBeenCalled();
        
        // Update timeline
        scene.timeline.update(0.5);
        expect(el.x).toBe(50);
        
        scene.timeline.update(0.5);
        expect(el.x).toBe(100);
        expect(anim.isPlaying).toBe(false);
    });

    test("Task 9: Element.animateFrom()", () => {
        const scene = {
            animationRegistry: { register: mock(), unregister: mock() },
            timeline: new Timeline(),
        };
        const el = new Element();
        el.x = 100; // End value
        // @ts-ignore
        el.scene = scene;

        // Animate from 0 to 100
        const anim = el.animateFrom({ x: 0 }, { duration: 1 });
        
        // Should immediately be at 0
        expect(el.x).toBe(0);

        scene.timeline.update(0.5);
        expect(el.x).toBe(50);

        scene.timeline.update(0.5);
        expect(el.x).toBe(100);
    });

    test("Task 7: Promise-based completion", async () => {
        const scene = {
            animationRegistry: { register: mock(), unregister: mock() },
            timeline: new Timeline(),
        };
        const el = new Element();
        // @ts-ignore
        el.scene = scene;

        const anim = el.animate({ x: 100 }, { duration: 0.1 });
        
        // Simulate async update
        setTimeout(() => scene.timeline.update(0.1), 10);
        
        await anim; // Should resolve
        expect(el.x).toBe(100);
    });
    
    test("Task 6: Destroy cancels animations", () => {
        const scene = {
            animationRegistry: { register: mock(), unregister: mock() },
            timeline: new Timeline(),
        };
        const el = new Element();
        // @ts-ignore
        el.scene = scene;
        
        const anim = el.animate({ x: 100 }, { duration: 1 });
        expect(anim.isPlaying).toBe(true);
        
        el.destroy();
        expect(anim.isPlaying).toBe(false);
    });
  });

  describe("Extra Coverage (Task 10)", () => {
    test("StringChannel & Step Interpolation", () => {
      const ch = new StringChannel();
      ch.addKeyframe(0, "A");
      ch.addKeyframe(0.5, "B");
      ch.addKeyframe(1, "C");

      expect(ch.evaluate(0)).toBe("A");
      expect(ch.evaluate(0.2)).toBe("A"); // Step
      expect(ch.evaluate(0.5)).toBe("B");
      expect(ch.evaluate(0.9)).toBe("B");
      expect(ch.evaluate(1)).toBe("C");
    });

    test("Bulk addKeyframes", () => {
        const ch = new NumberChannel();
        ch.addKeyframes([
            { time: 0, value: 0 },
            { time: 1, value: 100 }
        ]);
        expect(ch.evaluate(0.5)).toBe(50);
    });

    test("Easing Functions", () => {
        // Linear
        expect(Easing.Linear(0.5)).toBe(0.5);
        // QuadIn
        expect(Easing.QuadIn(0.5)).toBe(0.25);
        // QuadOut
        expect(Easing.QuadOut(0.5)).toBe(0.75);
        // QuadInOut
        expect(Easing.QuadInOut(0.5)).toBe(0.5); // Symmetrical
        expect(Easing.QuadInOut(0.25)).toBe(0.125); // 2 * t * t
    });

    test("Animator Pause/Resume", () => {
        const el = new Element();
        const adapter = new ElementAdapter(el);
        const clip = new Clip("test");
        const ch = new NumberChannel();
        ch.addKeyframe(0, 0);
        ch.addKeyframe(1, 100);
        clip.addChannel("x", ch);

        const anim = new Animator(clip, adapter);
        const tl = new Timeline();
        tl.add(anim);
        anim.play();

        tl.update(0.2);
        expect(el.x).toBe(20);

        anim.pause();
        tl.update(0.2);
        expect(el.x).toBe(20); // Should not advance

        anim.resume();
        tl.update(0.2);
        expect(el.x).toBe(40); // Should advance
    });

    test("Loop Callbacks", () => {
        const onLoop = mock();
        const el = new Element();
        const adapter = new ElementAdapter(el);
        const clip = new Clip("test");
        // Empty clip duration logic might trigger instant loops if not careful, 
        // add channel to ensure duration > 0
        const ch = new NumberChannel();
        ch.addKeyframe(0, 0);
        ch.addKeyframe(1, 100);
        clip.addChannel("x", ch);

        const anim = new Animator(clip, adapter, { loop: true, onLoop });
        const tl = new Timeline();
        tl.add(anim);
        anim.play();

        // 1.5s passed (duration 1s) -> 1 loop
        tl.update(1.5);
        expect(onLoop).toHaveBeenCalledTimes(1);
    });
  });
});
