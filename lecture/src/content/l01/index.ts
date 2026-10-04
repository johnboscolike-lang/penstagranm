import type { Lesson } from "../types.ts";
import { ch1 } from "./ch1.ts";
import { ch2 } from "./ch2.ts";
import { ch3 } from "./ch3.ts";
import { ch4 } from "./ch4.ts";
import { ch5 } from "./ch5.ts";
import { ch6 } from "./ch6.ts";
import { ch7 } from "./ch7.ts";
import { ch8 } from "./ch8.ts";

/** 이론 1강: 왜 기르고, 무엇을 가르치나. */
export const l01: Lesson = {
  id: "t01",
  no: 1,
  title: "왜 기르고, 무엇을 가르치나",
  chapters: [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8],
};
