.PHONY: up down build composer-install migrate seed backup test test-unit test-integration test-e2e test-e2e-visible analyse fresh

BACKUP_DATE := $(shell date +%y-%m-%d)
BACKUP_DIR := backups
BACKUP_FILE := $(BACKUP_DIR)/backup-$(BACKUP_DATE).sql

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

composer-install:
	docker compose exec app composer install

migrate:
	docker compose exec app php bin/console doctrine:migrations:migrate --no-interaction

seed:
	docker compose exec -e APP_ENV=dev app php bin/console doctrine:fixtures:load --no-interaction

backup:
	@mkdir -p $(BACKUP_DIR)
	docker compose exec -T db sh -c 'PGPASSWORD="$$POSTGRES_PASSWORD" pg_dump -U "$$POSTGRES_USER" "$$POSTGRES_DB"' > $(BACKUP_FILE)
	@echo "Backup written to $(BACKUP_FILE)"

test:
	docker compose exec app php vendor/bin/phpunit
	npm test

test-unit:
	docker compose exec app php vendor/bin/phpunit --testsuite Unit

test-integration:
	docker compose exec app php vendor/bin/phpunit --testsuite Integration

test-e2e:
	npm run test:e2e

test-e2e-visible:
	npm run test:e2e:visible

analyse:
	docker compose exec app php vendor/bin/phpstan analyse --level=6 src/

coverage:
	docker compose exec app php vendor/bin/phpunit --coverage-text --no-progress
	npx vitest run --coverage

fresh: down
	docker compose up -d --build
	docker compose exec app composer install
	docker compose exec app php bin/console doctrine:migrations:migrate --no-interaction
	@echo "Done. Run 'make seed' to load default data."
