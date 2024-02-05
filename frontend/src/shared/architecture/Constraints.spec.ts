import type { ResourceType } from "../resources/ResourceTypes";
import { CollectionTypes } from "../resources/ResourceTypes";
import {
  generateConstraintMetadataFromFormState,
  removeEmptyKeys,
  setNestedValue,
} from "./Constraints";

describe("removeEmptyKeys", () => {
  it("should remove empty keys from objects", () => {
    const input = {
      key1: "value1",
      key2: "",
      key3: {
        key31: "value31",
        key32: "",
      },
      key4: ["value41", ""],
    };

    const expectedOutput = {
      key1: "value1",
      key3: {
        key31: "value31",
      },
      key4: ["value41", ""],
    };

    expect(removeEmptyKeys(input)).toEqual(expectedOutput);
  });

  it("should not remove empty keys from top-level single-key objects", () => {
    const input = {
      key1: "",
    };

    const expectedOutput = {
      key1: "",
    };

    expect(removeEmptyKeys(input)).toEqual(expectedOutput);
  });

  it("should remove empty keys from nested single-key objects", () => {
    const input = {
      key1: {
        key11: "",
      },
    };

    const expectedOutput = {
      key1: {},
    };

    expect(removeEmptyKeys(input)).toEqual(expectedOutput);
  });
});

describe("generateConstraintMetadataFromFormState", () => {
  const mockResourceType: ResourceType = {
    provider: "testProvider",
    type: "testType",
    displayName: "testDisplayName",
    views: new Map(),
    properties: [
      {
        name: "testProperty",
        qualifiedName: "testQualifiedName",
        type: CollectionTypes.Map,
      },
    ],
  };

  const mockState = {
    "testKey#testProperty": {
      key: "testKey",
      value: "testValue",
    },
  };

  const mockResourceMetadata = {
    testProperty: {
      testKey: "testOldValue",
    },
  };

  it("should generate primitive map constraint metadata correctly", () => {
    const result = generateConstraintMetadataFromFormState(
      mockResourceMetadata,
      mockState,
      mockResourceType,
    );

    expect(result).toEqual({
      testProperty: {
        testKey: "testValue",
      },
    });
  });

  it("should handle non-existent property in resource metadata", () => {
    const result = generateConstraintMetadataFromFormState(
      {},
      mockState,
      mockResourceType,
    );

    expect(result).toEqual({
      testProperty: {
        key: "testKey",
        value: "testValue",
      },
    });
  });

  it("should handle non-existent property in state", () => {
    const result = generateConstraintMetadataFromFormState(
      mockResourceMetadata,
      {},
      mockResourceType,
    );

    expect(result).toEqual({});
  });

  it("should handle non-existent property in resource type", () => {
    const result = generateConstraintMetadataFromFormState(
      mockResourceMetadata,
      mockState,
      {
        properties: [],
        ...mockResourceType,
      },
    );

    expect(result).toEqual({
      testProperty: {
        testKey: "testValue",
      },
    });
  });
});

describe("setNestedValue", () => {
  it("should set a nested value in an object", () => {
    const obj = {};
    setNestedValue(obj, "prop1.prop2.prop3", "value");
    expect(obj).toEqual({ prop1: { prop2: { prop3: "value" } } });
  });

  it("should set a nested value in an array", () => {
    const obj = {};
    setNestedValue(obj, "prop1.prop2[0].prop3", "value");
    expect(obj).toEqual({ prop1: { prop2: [{ prop3: "value" }] } });
  });

  it("should not overwrite existing values", () => {
    const obj = { prop1: { prop2: [{ prop3: "old value" }] } };
    setNestedValue(obj, "prop1.prop2[0].prop4", "new value");
    expect(obj).toEqual({
      prop1: { prop2: [{ prop3: "old value", prop4: "new value" }] },
    });
  });

  it("path starts with array index", () => {
    const obj: any[] = [];
    setNestedValue(obj, "[0].prop1", "value");
    expect(obj).toEqual([{ prop1: "value" }]);
  });
});
