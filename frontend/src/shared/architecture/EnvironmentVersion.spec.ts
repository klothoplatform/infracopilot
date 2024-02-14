import { PrimitiveTypes, type Property } from "../resources/ResourceTypes";
import { filterPromotedProperties } from "./EnvironmentVersion";

/**
 * @vitest-environment jsdom
 */
describe("filterPromotedProperties", () => {
  it("top level important doesn't filter", () => {
    const input: Property = {
      type: PrimitiveTypes.String,
      name: "A",
      qualifiedName: "A",
      important: true,
    };

    const output = filterPromotedProperties(input);
    expect(output).toEqual(input);
  });

  it("filtered subproperties", () => {
    const input: Property = {
      type: PrimitiveTypes.String,
      name: "A",
      qualifiedName: "A",
      properties: [
        {
          type: PrimitiveTypes.String,
          name: "B",
          qualifiedName: "A.B",
          important: false,
        },
        {
          type: PrimitiveTypes.String,
          name: "C",
          qualifiedName: "A.C",
          important: true,
        },
      ],
    };

    const output = filterPromotedProperties(input);
    expect(output).toEqual({
      ...input,
      properties: [
        {
          type: PrimitiveTypes.String,
          name: "C",
          qualifiedName: "A.C",
          important: true,
        },
      ],
    });
  });

  it("filtered nested subproperties", () => {
    const input: Property = {
      type: PrimitiveTypes.String,
      name: "A",
      qualifiedName: "A",
      properties: [
        {
          type: PrimitiveTypes.String,
          name: "B",
          qualifiedName: "A.B",
          important: false,
          properties: [
            {
              type: PrimitiveTypes.String,
              name: "X",
              qualifiedName: "A.B.X",
              important: true,
            },
            {
              type: PrimitiveTypes.String,
              name: "Y",
              qualifiedName: "A.B.Y",
              important: false,
            },
          ],
        },
        {
          type: PrimitiveTypes.String,
          name: "C",
          qualifiedName: "A.C",
          important: true,
        },
      ],
    };

    const output = filterPromotedProperties(input);
    expect(output).toEqual({
      ...input,
      properties: [
        {
          type: PrimitiveTypes.String,
          name: "B",
          qualifiedName: "A.B",
          important: false,
          properties: [
            {
              type: PrimitiveTypes.String,
              name: "X",
              qualifiedName: "A.B.X",
              important: true,
            },
          ],
        },
        {
          type: PrimitiveTypes.String,
          name: "C",
          qualifiedName: "A.C",
          important: true,
        },
      ],
    });
  });
});
