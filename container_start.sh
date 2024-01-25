#!/bin/sh

aws secretsmanager get-secret-value --secret-id $FGA_CLIENT_ID --query SecretString --output text | tr -d '\n' > fga_client_id.key
aws secretsmanager get-secret-value --secret-id $FGA_SECRET --query SecretString --output text | tr -d '\n' > fga_secret.key
aws secretsmanager get-secret-value --secret-id $AUTH0_CLIENT_ID --query SecretString --output text | tr -d '\n' > auth0_client_id.key
aws secretsmanager get-secret-value --secret-id $AUTH0_SECRET --query SecretString --output text | tr -d '\n' > auth0_client_secret.key

exec gunicorn -w 9 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:80 src.main:app 
