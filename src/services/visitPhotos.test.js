import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { drawVisitPhotoStamp, formatAddressForStamp } from "./visitPhotos.js";

test("photo addresses use actual place names without inventing street numbers or a country", () => {
  assert.equal(formatAddressForStamp({}), "");
  assert.equal(formatAddressForStamp({ road: "Agha Shahi Avenue", suburb: "G-9/4", city: "Islamabad" }), "Agha Shahi Avenue, G-9/4, Islamabad");
});

test("address, GPS and attribution stay visible without overlap at phone camera resolutions", () => {
  for (const [width, height] of [[640, 480], [1600, 900], [900, 1600], [1920, 1080]]) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    const drawn = [];
    const fillText = context.fillText.bind(context);
    context.fillText = (text, x, y) => {
      const fontSize = Number(context.font.match(/([\d.]+)px/)[1]);
      drawn.push({ text, y, bottom: y + fontSize });
      assert.ok(x + context.measureText(text).width < width, `text must fit the ${width}px photo: ${text}`);
      fillText(text, x, y);
    };
    drawVisitPhotoStamp(canvas, context, {
      dateText: "Tuesday, 10 November 2026", timeText: "10:30 AM",
      locationText: "Agha Shahi (9th) Avenue, G-9/4, Islamabad, Islamabad Capital Territory, Pakistan\nGPS: 33.68440, 73.04790"
    });
    assert.ok(drawn.every((line) => line.y >= 0 && line.bottom < height));
    for (let index = 1; index < drawn.length; index++) assert.ok(drawn[index].y >= drawn[index - 1].bottom, "stamp lines must not overlap");
    assert.ok(drawn.findIndex((line) => line.text.startsWith("Agha")) < drawn.findIndex((line) => line.text.startsWith("GPS:")));
  }
});
