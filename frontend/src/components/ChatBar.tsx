import { memo, useContext, useState } from "react";
import { Button, TextField, Container, Stack, Divider } from "@mui/material";
import { Node, NodeId } from "../shared/resource-graph/Node";
import { ResourceGraphContext } from "../shared/resource-graph/ResourceGraph";

export default memo(() => {
  const [input, setInput] = useState("");
  let submitDisabled = true;
  // return a styled text box with a send button
  if (input.length > 0) {
    submitDisabled = false;
  }
  const { graph, setGraph } = useContext(ResourceGraphContext);

  const onSubmit = () => {
    graph.Nodes.push(
      new Node(NodeId.fromString("aws:lambda_function/lambda_03"), {})
    );
    setGraph(graph);
  };

  return (
    <>
      <Container>
        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem />}
          spacing={2}
        >
          <TextField
            placeholder="Enter your prompt here"
            fullWidth={true}
            variant="outlined"
            autoFocus={true}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
          />
          <Button
            variant="contained"
            disabled={submitDisabled}
            onClick={() => onSubmit()}
          >
            Submit
          </Button>
        </Stack>
      </Container>
    </>
  );
});
