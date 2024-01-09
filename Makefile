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
export IAC_CLI_PATH ?= $(iacCliPath)
else
endif

# Backend commands

run:
	rm -f /tmp/engine && rm -f /tmp/iac && \
	PYTHONPATH=. \
	KEEP_TMP="True" \
	AUTH0_DOMAIN="klotho-dev.us.auth0.com" \
	AUTH0_AUDIENCE="A0sIE3wvh8LpG8mtJEjWPnBqZgBs5cNM" \
	pipenv run uvicorn src.main:app --port=3000


test-backend:
	PYTHONPATH=. pipenv run python -m unittest discover -s tests

test-coverage:
	PYTHONPATH=. pipenv run coverage run --source=src -m unittest discover
	PYTHONPATH=. pipenv run coverage report -m --fail-under 67 --skip-empty

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
	npm --prefix frontend run build-dev

build-frontend-prod:
	npm --prefix frontend run build-prod

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
