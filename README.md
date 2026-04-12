# Пропуска ЖК — MVP

Репозиторий: https://github.com/Vadim-Axt/passes-for-SP  

Минимально жизнеспособная веб-система для жильцов, охраны и администратора: пропуска разных типов, статусы, журнал действий, уведомления в приложении.

**Стек:** React 18 + TypeScript (Vite), Express + TypeScript, PostgreSQL 16.

---

## Запуск с нуля (для любого, кто склонировал репозиторий)

Ниже — полный путь от пустой машины до открытого в браузере приложения. ОС: Windows или macOS/Linux (команды копирования файла различаются).

### Что должно быть установлено

| Программа | Зачем |
|-----------|--------|
| **Node.js 20+** (LTS) | [nodejs.org](https://nodejs.org/) — `node` и `npm` в PATH |
| **Git** | Клонирование репозитория |
| **Docker Desktop** | Поднять PostgreSQL одной командой (можно без него — см. раздел «Без Docker») |

Проверка версий в терминале:

```bash
node -v
npm -v
docker --version
```

Docker Desktop нужно **запустить** и дождаться статуса «running» до команды с базой.

### 1. Клонирование и переход в папку проекта

```bash
git clone https://github.com/Vadim-Axt/passes-for-SP.git
cd passes-for-SP
```

### 2. Установка зависимостей

Из **корня** репозитория (там, где лежат `package.json` и `docker-compose.yml`):

```bash
npm run install:all
npm install
```

- `install:all` ставит пакеты в `server/` и `client/`.
- `npm install` в корне — для скрипта `npm run dev` (пакет `concurrently`).

### 3. Файл окружения сервера

Нужен файл **`server/.env`**. Его **нет** в репозитории (секреты); берите шаблон:

**Windows (PowerShell или CMD):**

```bat
copy server\.env.example server\.env
```

**macOS / Linux:**

```bash
cp server/.env.example server/.env
```

По умолчанию в шаблоне указано подключение к контейнеру:

`DATABASE_URL=postgresql://passapp:passapp@localhost:5432/passapp`

При смене порта Docker (см. «Частые проблемы») отредактируйте `DATABASE_URL` в `server/.env` так же.

### 4. Запуск PostgreSQL в Docker

Из корня репозитория:

```bash
npm run db:up
```

Убедиться, что контейнер запущен:

```bash
docker compose ps
```

Должен быть сервис `db` в состоянии `running` (или `Up`).

### 5. Создание таблиц и демо-пользователей

Один раз после первого успешного `db:up` (или после очистки тома БД):

```bash
npm run migrate
npm run seed
```

Без этих шагов вход в приложение не сработает (в БД не будет пользователей).

### 6. Запуск клиента и API

```bash
npm run dev
```

Дождитесь строк вроде `API listening on http://localhost:4000` (сервер) и URL Vite (клиент).

### 7. Как проверить, что всё работает

1. Откройте в браузере **http://localhost:5173** (или порт, который показал Vite).
2. Проверка API без браузера: **http://localhost:4000/health** — ответ `{"ok":true}`.
3. Войдите, например, как жилец: **resident@demo.local** / пароль **demo123** (остальные демо-аккаунты — в таблице ниже в этом файле).

Если страница логина не открывается или запросы падают — смотрите лог **`[server]`** в терминале: при старте выполняется проверка `SELECT 1` к PostgreSQL; при ошибке выводится подсказка.

### Запуск без Docker

1. Установите PostgreSQL локально, создайте пользователя и базу (например пользователь `passapp`, пароль `passapp`, БД `passapp`).
2. В `server/.env` укажите свой `DATABASE_URL`.
3. Выполните `npm run migrate` и `npm run seed`, затем `npm run dev`.

Команды `npm run db:up` / `db:down` при этом не используются.

---

## Публикация проекта в GitHub (в первый раз)

Если код уже лежит локально, а на GitHub создан **пустой** репозиторий:

```bash
cd passes-for-SP
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/Vadim-Axt/passes-for-SP.git
git push -u origin main
```

Важно:

- Файл **`server/.env`** в коммит **не попадает** (он в `.gitignore`). Каждый разработчик создаёт его сам из `server/.env.example`.
- Если репозиторий на GitHub уже не пустой, перед первым `git push` может понадобиться `git pull origin main --rebase` (или согласовать с владельцем ветки).

Если при `git remote add origin` ошибка «remote origin already exists»:

```bash
git remote remove origin
git remote add origin https://github.com/Vadim-Axt/passes-for-SP.git
```

---

## Возможности MVP

| Роль | Что есть в MVP |
|------|------------------|
| **Жилец** | Главная с быстрыми действиями, создание всех типов пропусков (разовый человек, курьер, транспорт, постоянный), список активных и полная история, отмена заявки, приостановка/возобновление постоянного пропуска, уведомления, профиль. |
| **Охрана** | Список активных пропусков, поиск по имени/номеру/квартире/UUID, карточка пропуска, «Зафиксировать допуск» и «Отклонить». Разовые/курьер/транспорт после допуска переходят в `USED`, постоянный остаётся `ACTIVE` (фиксируется событие в журнале). |
| **Администратор** | Пользователи (создание), квартиры (создание), привязка жильца к квартире, просмотр журнала `audit_log`, создание пропуска (выбор квартиры), экран охраны для проверки. |

**Типы пропусков:** `ONE_TIME_PERSON`, `COURIER`, `VEHICLE`, `PERMANENT`.

**Статусы:** `CREATED`, `ACTIVE`, `USED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`, `SUSPENDED`.  
В MVP новая заявка сразу получает статус **`ACTIVE`**.

**Автоматика:** при запросах списков/карточки просроченные пропуска (`valid_until < now()`, статусы `ACTIVE` или `CREATED`) переводятся в **`EXPIRED`**.

**Уведомления:** только внутри приложения (таблица `notifications`).

**Журнал:** действия пишутся в `audit_log`.

## Архитектура репозитория

```
├── client/          # SPA на Vite + React + TS
├── server/          # REST API на Express + TS
├── docker-compose.yml
├── package.json     # корневые скрипты (dev, migrate, seed, db:up)
└── README.md
```

В режиме разработки Vite проксирует запросы `/api` на сервер (см. `client/vite.config.ts`).

## Демо-аккаунты

После `npm run seed` (пароль везде **`demo123`**):

| Email | Роль |
|-------|------|
| `resident@demo.local` | Жилец (квартира «Корпус 1, кв. 12») |
| `security@demo.local` | Охрана |
| `admin@demo.local` | Администратор |

## Сборка production

**Сервер:**

```bash
cd server
npm run build
npm start
```

Нужны переменные: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGIN`.

**Клиент:**

```bash
cd client
npm run build
npm run preview
```

## REST API (кратко)

Все защищённые маршруты: заголовок `Authorization: Bearer <jwt>`.

| Метод | Путь | Кто | Описание |
|-------|------|-----|----------|
| POST | `/api/auth/login` | все | Логин, JWT |
| GET | `/api/auth/me` | все | Профиль и квартиры |
| GET | `/api/passes` | жилец | Свои пропуска; `?scope=active` — активные |
| GET | `/api/passes?security=1&q=` | охрана, админ | Активные + поиск |
| GET | `/api/passes` | админ | Все пропуска |
| POST | `/api/passes` | жилец, админ | Создание |
| GET | `/api/passes/:id` | по ролям | Карточка |
| POST | `/api/passes/:id/check-in` | охрана, админ | Допуск |
| POST | `/api/passes/:id/reject` | охрана, админ | Отклонение |
| POST | `/api/passes/:id/cancel` | жилец, админ | Отмена |
| POST | `/api/passes/:id/suspend` | жилец, админ | Пауза постоянного |
| POST | `/api/passes/:id/resume` | жилец, админ | Возобновление |
| GET | `/api/notifications` | владелец | Список |
| PATCH | `/api/notifications/:id/read` | владелец | Прочитано |
| GET/POST | `/api/admin/*` | админ | Пользователи, квартиры, журнал |

## Ограничения MVP

- Нет регистрации по e-mail, пушей и внешних уведомлений.
- Нет шаблонов, чёрного списка, массовых рассылок.
- Три фиксированные роли без тонкой матрицы прав.

## Безопасность

- В production смените `JWT_SECRET` и пароли БД.
- Используйте HTTPS; ограничьте частоту запросов к `/api/auth/login`.
- Не коммитьте `server/.env`.

## Частые проблемы

- **`project name must not be empty` (Docker Compose)** — в `docker-compose.yml` задано явное имя проекта `name: passapp` (папка с кириллицей могла ломать имя). Обновите файлы из репозитория.
- **`dockerDesktopLinuxEngine` / pipe not found** — не запущен Docker Desktop; запустите и повторите `npm run db:up`.
- **`password authentication failed` / `28P01` / `auth_failed`** — подключение идёт не к контейнеру, а к другому Postgres (часто локальный на порту **5432**). Либо остановите локальный сервис PostgreSQL, либо в `docker-compose.yml` смените проброс на **`"5433:5432"`** и в `server/.env` укажите `...@localhost:5433/passapp`, затем снова `db:up`, `migrate`, `seed`.
- **`[vite] http proxy error ... ECONNRESET`** — API не слушает или упал; читайте лог **`[server]`**.
- После `db:up` обязательно **`migrate`** и **`seed`**.

## Остановка Docker

```bash
npm run db:down
```

Том `passapp_pgdata` сохраняет данные между перезапусками контейнера.

## Лицензия

Учебный/демонстрационный проект — используйте свободно в своих целях.
