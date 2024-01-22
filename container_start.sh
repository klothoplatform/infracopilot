#!/bin/sh

aws secretsmanager get-secret-value --secret-id $FGA_CLIENT_ID --query SecretString --output text | tr -d '\n' > fga_client_id.key
aws secretsmanager get-secret-value --secret-id $FGA_MODEL_ID --query SecretString --output text | tr -d '\n' > fga_model_id.key
aws secretsmanager get-secret-value --secret-id $FGA_SECRET --query SecretString --output text | tr -d '\n' > fga_secret.key
aws secretsmanager get-secret-value --secret-id $FGA_STORE_ID --query SecretString --output text | tr -d '\n' > fga_store_id.key

exec uvicorn src.main:app --host '0.0.0.0' --port=80 --workers=8
