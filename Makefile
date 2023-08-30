PHONY: run test test-coverage black black-check

ifdef KLOTHO_CONFIG_FILE
KLOTHO_CONFIG_FILE := $(KLOTHO_CONFIG_FILE)
else
KLOTHO_CONFIG_FILE := klothoconfig/dev.yaml
endif

# Backend commands

run:
	PYTHONPATH=. \
	pipenv run uvicorn src.backend_orchestrator.main:app --port=$(PORT)


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

build-frontend:
	npm --prefix frontend run build


install:
	cd frontend && npm install

build-frontend:
	npm --prefix frontend run build

start:
	npm --prefix frontend run start && kill $$!

clean:
	npm --prefix frontend run clean

post-compile:
	mv ./compiled/web-ui/frontend/build/* ./compiled/web-ui && rm -rf ./compiled/web-ui/frontend