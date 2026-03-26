# Justfile for heaptrack-web-ui

dev:
    npm run dev

lint:
    npm run lint
    npx prettier --check .

fix:
    npm run lint -- --fix
    npx prettier --write .

test:
    npm run test

build:
    npm run build

install:
    npm install
