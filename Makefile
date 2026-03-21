.PHONY: up down build composer-install migrate seed test test-unit test-integration fresh

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

test:
	docker compose exec app php vendor/bin/phpunit

test-unit:
	docker compose exec app php vendor/bin/phpunit --testsuite Unit

test-integration:
	docker compose exec app php vendor/bin/phpunit --testsuite Integration

fresh: down
	docker compose up -d --build
	docker compose exec app composer install
	docker compose exec app php bin/console doctrine:migrations:migrate --no-interaction
	@echo "Done. Run 'make seed' to load default data."
