FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    libpq-dev \
    libicu-dev \
    unzip \
    git \
    && docker-php-ext-install pdo_pgsql intl opcache \
    && pecl install pcov \
    && docker-php-ext-enable pcov \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
