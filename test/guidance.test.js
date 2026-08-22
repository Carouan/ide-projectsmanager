import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  STAGE_GUIDANCE_FIELD_KEYS,
  asGuidanceList,
  getStageGuidanceKeys,
  getUserGuideUrl,
} from "../src/constants/guidance.js";
import { STAGE_DEFINITIONS } from "../src/constants/stages.js";

const dictionaries = {
  fr: JSON.parse(
    readFileSync(new URL("../src/i18n/fr.json", import.meta.url), "utf8")
  ),
  en: JSON.parse(
    readFileSync(new URL("../src/i18n/en.json", import.meta.url), "utf8")
  ),
};

test("every project stage has complete French and English guidance", () => {
  for (const definition of STAGE_DEFINITIONS) {
    const keys = getStageGuidanceKeys(definition.key);

    for (const dictionary of Object.values(dictionaries)) {
      assert.ok(dictionary[keys.why], `${keys.why} is missing`);
      assert.equal(
        asGuidanceList(dictionary[keys.questions]).length,
        3,
        `${keys.questions} must contain three questions`
      );
      assert.ok(dictionary[keys.example], `${keys.example} is missing`);
    }
  }
});

test("field guidance is complete in both supported languages", () => {
  for (const fieldKey of STAGE_GUIDANCE_FIELD_KEYS) {
    for (const dictionary of Object.values(dictionaries)) {
      assert.ok(dictionary[`guidance.fields.${fieldKey}.label`]);
      assert.ok(dictionary[`guidance.fields.${fieldKey}.description`]);
    }
  }
});

test("the first-project guide stays concise and available offline in both languages", () => {
  for (const dictionary of Object.values(dictionaries)) {
    assert.ok(dictionary["guidance.project.intro"]);
    assert.equal(asGuidanceList(dictionary["guidance.project.steps"]).length, 4);
    assert.ok(dictionary["guidance.project.ideaCapture"]);
  }
});

test("guide URLs select the matching durable repository document", () => {
  assert.match(getUserGuideUrl("fr"), /docs\/user-guide\.md$/);
  assert.match(getUserGuideUrl("en"), /docs\/user-guide\.en\.md$/);
  assert.equal(getUserGuideUrl("unknown"), getUserGuideUrl("fr"));
});

test("guidance lists reject invalid translated values safely", () => {
  assert.deepEqual(asGuidanceList(null), []);
  assert.deepEqual(asGuidanceList("not a list"), []);
  assert.deepEqual(asGuidanceList(["one", "", "two"]), ["one", "two"]);
});
