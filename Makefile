.PHONY: test install clean

# Install test dependencies
install:
	npm install

# Run the test suite
test:
	npx --yes node --test tests/test_chargen.mjs

# Remove node_modules and package-lock.json
clean:
	rm -rf node_modules package-lock.json
