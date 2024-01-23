#!/bin/sh

aws secretsmanager get-secret-value --secret-id $FGA_CLIENT_ID --query SecretString --output text | tr -d '\n' > fga_client_id.key
aws secretsmanager get-secret-value --secret-id $FGA_SECRET --query SecretString --output text | tr -d '\n' > fga_secret.key
aws secretsmanager get-secret-value --secret-id $AUTH0_CLIENT_ID --query SecretString --output text | tr -d '\n' > auth0_client_id.key
aws secretsmanager get-secret-value --secret-id $AUTH0_SECRET --query SecretString --output text | tr -d '\n' > auth0_client_secret.key

exec uvicorn src.main:app --host '0.0.0.0' --port=80 --workers=8
