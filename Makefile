PHONY: run test test-coverage black black-check install-frontend build-frontend start clean post-compile

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
	pipenv run uvicorn src.backend_orchestrator.main:app --port=3000


test:
	PYTHONPATH=. pipenv run python -m unittest discover -s tests

test-coverage:
	PYTHONPATH=. pipenv run coverage run -m unittest discover
	PYTHONPATH=. pipenv run coverage report -m --fail-under 80 --skip-empty

black:
	pipenv run black .

black-check:
	pipenv run black --check .

# Frontend commands

install-frontend:
	npm --prefix frontend install

build-frontend:
	npm --prefix frontend run build

start:
	npm --prefix frontend run start && kill $$!

clean:
	npm --prefix frontend run clean

post-compile:
	mv ./compiled/web-ui/frontend/build/* ./compiled/web-ui && rm -rf ./compiled/web-ui/frontend; \
	cp -v -a custom_iac/. compiled/iac;
