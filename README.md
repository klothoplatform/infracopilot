# infracopilot

## Developing
to run CI checks on git push:
```sh
git config --local core.hooksPath .githooks/
```

### Run service

Change the auth0 domain in `/src/auth_service/token` to our dev domain

ensure the following files/keys exist:
- fga_client_id.key
- fga_model_id.key
- fga_secret.key
- fga_store_id.key

To set these with the bitwarden CLI:
```sh
FGA_NOTE=$(bw get item "auth0 fga" | jq -r '.notes' | grep -o '^dev.*')
echo "$FGA_NOTE" | grep 'client id:' | sed 's#.*: ##' > fga_client_id.key
echo "$FGA_NOTE" | grep 'model id:' | sed 's#.*: ##' > fga_model_id.key
echo "$FGA_NOTE" | grep 'secret:' | sed 's#.*: ##' > fga_secret.key
echo "$FGA_NOTE" | grep 'store id:' | sed 's#.*: ##' > fga_store_id.key
unset FGA_NOTE
```

ensure you have the minio docker container running
```sh
docker-compose up
```

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

### Debugging

#### Environment Variables
- `KEEP_TMP` - if set to `true` will keep the tmp directory after a run
- `CAPTURE_ENGINE_FAILURES` - if set to `true` will capture engine and IaC failures in the `failures` directory

## Deploying a dev stack
Architecture:
https://app.infracopilot.io/editor/12aa38c5-6b88-4e6a-b9c8-35c9186e6516

1. `npm --prefix deploy install`
2. `cd deploy && pulumi up`
  - Grab the `ifcp_binary_storage_BucketName`, `ifcp_static_site_BucketName`
  - Note: service won't work yet, since the secrets don't exist
3. `make build-frontend` (optionally with -dev or -prod)
4. `cd fontend/build && aws s3 sync . s3://{ifcp_static_site_BucketName}`
5. `aws secretsmanager put-secret-value --secret-id {} --secret-string {}`
  - Upload the 4 secrets according to the environment running: `ifcp-fga-client-id`, `ifcp-fga-model-id`, `ifcp-fga-secret`, `ifcp-fga-store-id`
6. `cd binaries && aws s3 sync . s3://{ifcp_binary_storage_BucketName}`
7. `cd deploy && pulumi up`
  - This is mostly just to restart the task. It's probably failing and restarting so it might not be necessary.
