import type { EnumProperty, Property, SetProperty } from "./ResourceTypes";
import { CollectionTypes, getNewValue, PrimitiveTypes } from "./ResourceTypes";

describe("getNewValue", () => {
  it("should return an object with zero values for each supplied property", () => {
    // an array containing one of each property type
    const properties: Property[] = [
      {
        name: "StringProperty",
        type: PrimitiveTypes.String,
        qualifiedName: "StringProperty",
      },
      {
        name: "NumberProperty",
        type: PrimitiveTypes.Number,
        qualifiedName: "NumberProperty",
      },
      {
        name: "BooleanProperty",
        type: PrimitiveTypes.Boolean,
        qualifiedName: "BooleanProperty",
      },
      {
        name: "ResourceProperty",
        type: PrimitiveTypes.Resource,
        qualifiedName: "ResourceProperty",
      },
      {
        name: "MapProperty",
        type: CollectionTypes.Map,
        qualifiedName: "MapProperty",
      },
      {
        name: "ListProperty",
        type: CollectionTypes.List,
        qualifiedName: "ListProperty",
      },
      {
        name: "SetProperty",
        type: CollectionTypes.Set,
        qualifiedName: "SetProperty",
        allowedValues: ["a", "b"],
      } as SetProperty,
      {
        name: "EnumProperty",
        type: PrimitiveTypes.Enum,
        qualifiedName: "EnumProperty",
        allowedValues: ["a", "b"],
      } as EnumProperty,
    ];
    const newValue = getNewValue(properties);
    expect(newValue).toEqual({
      EnumProperty: "",
      StringProperty: "",
      ResourceProperty: "",
      NumberProperty: 0,
      BooleanProperty: false,
      MapProperty: [],
      ListProperty: [],
      SetProperty: [],
    });
  });
});
