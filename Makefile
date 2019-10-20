.PHONY: all build clean publish

all: build

build: clean
	npm run build

clean:
	rm -rf dist

publish: build
	npm publish
