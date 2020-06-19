.PHONY: all lint publish

all: lint

lint:
	npm run lint

publish: lint
	npm publish
