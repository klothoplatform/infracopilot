# infracopilot

## Developing
to run CI checks on git push:
```sh
git config --local core.hooksPath .githooks/
```

### Run service

```sh
PORT=3000 ENGINE_PATH=/Path/to/klotho/engine/binary IAC_CLI_PATH=/Path/to/klotho/iac/binary  make run
```

### Run Unit tests

```sh
make test
```

### Run formatting

```sh
make black
```

### Example curls

#### Create a new architecture
```sh
curl -X POST  http://127.0.0.1:3000/architecture -H "Content-Type: application/json" -d '{"name": "arch", "owner": "jordan", "engine_version": "1.0"}'
```

The id of the new architecture is returned below and used in subsequent requests

> {"id":"bb1331b4-e475-49e1-98b8-727aea52ce06"}

#### Modify an architecture (Send constraints)
```sh
curl -X POST "http://127.0.0.1:3000/architecture/$ARCHITECTURE_ID/run?state=$LATEST_STATE" -H "Content-Type: application/json" -d '{"constraints": [{"scope": "application", "operator": "add", "node": "aws:rest_api::api_gateway_01"}]}'
```

#### Get an architecture's current state
```sh
curl http://127.0.0.1:3000/architecture/$ARCHITECTURE_ID
```

#### Export a current architectures iac

```sh
curl "http://127.0.0.1:3000/architecture/$ARCHITECTURE_ID/iac?state=$LATEST_STATE"
```

