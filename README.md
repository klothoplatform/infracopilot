# infracopilot

## Example curls


### Create a new architecture

curl -X POST  http://127.0.0.1:3000/architecture -H "Content-Type: application/json" -d '{"name": "arch", "owner": "jordan", "engine_version": "1.0"}'

### Modify an architecture (Send constraints)

curl -X POST "http://127.0.0.1:3000/architecture/$ARCHITECTURE_ID/run?state=$LATEST_STATE" -H "Content-Type: application/json" -d '{"constraints": [{"scope": "application", "operator": "add", "node": "aws:rest_api::api_gateway_01"}]}'

### Get an architecture's current state
curl http://127.0.0.1:3000/architecture/$ARCHITECTURE_ID