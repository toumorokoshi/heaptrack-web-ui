# Justfile for heaptrack-web-ui

lint:
    npm run lint

fix:
    npm run lint -- --fix
    npx prettier --write .

test:
    npm run test

build:
    npm run build

install:
    npm install
