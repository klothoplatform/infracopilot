run:
	PYTHONPATH=. \
	pipenv run uvicorn src.backend_orchestrator.main:app --port=$(PORT)


test:
	PYTHONPATH=. pipenv run python -m unittest discover -s tests

black:
	pipenv run black .