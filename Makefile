.PHONY: help test install clean

# Show available targets
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  install   Install test dependencies (jsdom)"
	@echo "  test      Run the test suite"
	@echo "  clean     Remove node_modules and package-lock.json"

# Install test dependencies
install:
	npm install

# Run the test suite
test:
	npx --yes node --test tests/test_chargen.mjs

# Remove node_modules and package-lock.json
clean:
	rm -rf node_modules package-lock.json
