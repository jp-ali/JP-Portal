import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "@napi-rs/canvas";
import { drawVisitPhotoStamp, formatAddressForStamp, formatVisitPhotoTimestamp } from "./visitPhotos.js";

test("photo addresses use actual place names without inventing street numbers or a country", () => {
  assert.equal(formatAddressForStamp({}), "");
  assert.equal(formatAddressForStamp({ road: "Agha Shahi Avenue", suburb: "G-9/4", city: "Islamabad" }), "Street #Agha Shahi Avenue, Block G-9/4,\nIslamabad");
  assert.equal(formatAddressForStamp({ house_number: "284", road: "Haider Road", suburb: "Islampura", city: "Lahore", state_district: "Lahore District", state: "Punjab", country: "Pakistan" }), "House #284, Street #Haider Road, Block Islampura,\nLahore, Lahore District, Punjab, Pakistan");
  assert.equal(formatAddressForStamp({ road: "Street #1", suburb: "Block A", state_district: "Lahore" }), "Street #1, Block A,\nLahore District");
});

test("date and time follow the supplied photo format in Pakistan time", () => {
  assert.deepEqual(formatVisitPhotoTimestamp(new Date("2026-11-05T17:42:00Z")), { dateText: "Thursday, 05/11/2026", timeText: "10:42 PM" });
});

test("the reference photo format shows the complete address without clipping at phone camera resolutions", () => {
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
      ...formatVisitPhotoTimestamp(new Date("2026-11-05T17:42:00Z")),
      locationText: "House #284, Street #Haider Road, Block Islampura, Lahore, Lahore District, Punjab, Pakistan"
    });
    assert.ok(drawn.every((line) => line.y >= 0 && line.bottom < height));
    for (let index = 1; index < drawn.length; index++) assert.ok(drawn[index].y >= drawn[index - 1].bottom, "stamp lines must not overlap");
    assert.equal(drawn[0].text, "Day & Date: Thursday, 05/11/2026");
    assert.equal(drawn[1].text, "Time: 10:42 PM");
    assert.equal(drawn[2].text, "Current Location:");
    assert.ok(drawn.map((line) => line.text).join(" ").includes("Lahore District, Punjab, Pakistan"));
  }
});
