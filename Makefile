## PROLOG

.PHONY: help all

CMDNAME=turbine
CMDDESC=governor client authentication engine

help: ## Print this help
	@./help.sh '$(CMDNAME)' '$(CMDDESC)'

all: lint ## Default

## FMT

.PHONY: lint publish

lint: ## Run linter
	npm run lint

## PUBLISH

publish: lint ## Publish npm package
	npm publish
