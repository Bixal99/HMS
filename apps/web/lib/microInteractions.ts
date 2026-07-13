import { animate } from "animejs";

export const bellShake = (el: HTMLElement) =>
  animate(el, {
    rotate: [0, -12, 12, -8, 8, 0],
    duration: 400,
    ease: "inOutSine",
  });

export const buttonPress = (el: HTMLElement) =>
  animate(el, {
    scale: [1, 0.96, 1],
    duration: 180,
    ease: "outQuad",
  });
