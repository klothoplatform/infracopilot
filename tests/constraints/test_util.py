import aiounittest
from src.constraints.constraint import ConstraintOperator, ConstraintScope
from src.topology.edge import Edge
from src.topology.resource import ResourceID
from src.constraints.util import parse_constraints


class TestConstraint(aiounittest.AsyncTestCase):
    async def test_parse_constraints(self):
        constraints = [
            {
                "scope": "application",
                "operator": "add",
                "node": "provider1:type1:name1",
                "replacement_node": "provider2:type2:name2",
            },
            {
                "scope": "construct",
                "operator": "equals",
                "target": "provider2:type2:name2",
                "attributes": {
                    "availability": "high",
                },
            },
            {
                "scope": "edge",
                "operator": "must_exist",
                "target": { 
                    "source":"provider3:type3:name3",
                    "target": "provider4:type4:name4",
                },
            },
            {
                "scope": "resource",
                "operator": "equals",
                "target": "provider5:type5:name5",
                "property": "property1",
                "value": "value2",
            },
        ]

        parsed_constraints = parse_constraints(constraints)

        self.assertEqual(len(parsed_constraints), 4)

        self.assertEqual(parsed_constraints[0].scope, ConstraintScope.Application)
        self.assertEqual(parsed_constraints[0].operator, ConstraintOperator.Add)
        self.assertEqual(
            parsed_constraints[0].node, ResourceID.from_string("provider1:type1:name1")
        )
        self.assertEqual(
            parsed_constraints[0].replacement_node,
            ResourceID.from_string("provider2:type2:name2"),
        )

        self.assertEqual(parsed_constraints[1].scope, ConstraintScope.Construct)
        self.assertEqual(parsed_constraints[1].operator, ConstraintOperator.Equals)
        self.assertEqual(
            parsed_constraints[1].target,
            ResourceID.from_string("provider2:type2:name2"),
        )
        self.assertEqual(parsed_constraints[1].attributes, {"availability": "high"})

        self.assertEqual(parsed_constraints[2].scope, ConstraintScope.Edge)
        self.assertEqual(parsed_constraints[2].operator, ConstraintOperator.MustExist)
        self.assertEqual(
            parsed_constraints[2].target,
            Edge(
                ResourceID.from_string("provider3:type3:name3"),
                ResourceID.from_string("provider4:type4:name4"),
            ),
        )

        self.assertEqual(parsed_constraints[3].scope, ConstraintScope.Resource)
        self.assertEqual(parsed_constraints[3].operator, ConstraintOperator.Equals)
        self.assertEqual(
            parsed_constraints[3].target,
            ResourceID.from_string("provider5:type5:name5"),
        )
        self.assertEqual(parsed_constraints[3].property, "property1")
        self.assertEqual(parsed_constraints[3].value, "value2")

    async def test_parse_constraints_unknown_scope(self):
        constraints = [
            {
                "scope": "unknown",
                "operator": "add",
                "node": "node1",
                "replacement_node": "node2",
            },
        ]

        with self.assertRaises(Exception) as context:
            await parse_constraints(constraints)

        self.assertTrue("Unknown constraint scope: unknown" in str(context.exception))
