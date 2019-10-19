.PHONY: all build clean

all: build

build: clean
	npm run build

clean:
	rm -rf dist
