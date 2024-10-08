PHONY: run test test-frontend test-backend test-coverage black black-check install-frontend build-frontend start clean post-compile

ifdef KLOTHO_CONFIG_FILE
KLOTHO_CONFIG_FILE := $(KLOTHO_CONFIG_FILE)
else
KLOTHO_CONFIG_FILE := klothoconfig/dev.yaml
endif

engineCliPath := $(shell command -v engine)
ifdef engineCliPath
export ENGINE_PATH ?= $(engineCliPath)
else
endif

iacCliPath := $(shell command -v iac)
ifdef iacCliPath
export IAC_PATH ?= $(iacCliPath)
else
endif

export KEEP_TEMP ?= True
export CAPTURE_ENGINE_FAILURES ?= True
export ENGINE_PROFILING ?= True

# Backend commands

run:
	@echo "ENGINE_PATH: $(ENGINE_PATH)"
	@echo "IAC_PATH: $(IAC_PATH)"
	PYTHONPATH=. \
	AUTH0_DOMAIN="klotho-dev.us.auth0.com" \
	AUTH0_AUDIENCE="A0sIE3wvh8LpG8mtJEjWPnBqZgBs5cNM" \
	FGA_API_HOST="localhost:8080" \
	FGA_API_SCHEME="http" \
	FGA_STORE_NAME="test-store" \
	pipenv run gunicorn -k uvicorn.workers.UvicornWorker -b 0.0.0.0:3000 --log-level debug src.main:app 


test-backend:
	PYTHONPATH=. pipenv run python -m unittest discover -s tests

test-coverage:
	PYTHONPATH=. pipenv run coverage run --source=src -m unittest discover
	PYTHONPATH=. pipenv run coverage report -m --fail-under 68 --skip-empty --omit "*/injection.py"

black:
	pipenv run black .

black-check:
	pipenv run black --check .

# Frontend commands

install-frontend: frontend/node_modules

frontend/node_modules: frontend/package.json
	npm --prefix frontend install

build-frontend: frontend/node_modules
	npm --prefix frontend run build

build-frontend-dev:
	npm --prefix frontend run build:dev

build-frontend-prod:
	npm --prefix frontend run build:prod

test-frontend:
	npm --prefix frontend run test:unit

start:
	npm --prefix frontend run start && kill $$!

clean:
	npm --prefix frontend run clean

post-compile:
	mv ./compiled/web-ui/frontend/build/* ./compiled/web-ui && rm -rf ./compiled/web-ui/frontend; \
	cp -v -a custom_iac/. compiled/iac;


test: test-frontend test-backend
