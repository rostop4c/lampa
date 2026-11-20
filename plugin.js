(function () {
    'use strict';

    // ================================================================
    // Плагин: Kinopoisk CX
    // Добавляет кнопку «Кинопоиск» в карточку фильма/сериала (full),
    // формирует ссылку на зеркало kinopoisk.cx, поддерживает ручной
    // ввод ID или названия (Lampa.Input.edit с фолбэком на Select).
    // ================================================================

    var PLUGIN_NAME = 'kinopoisk_cx';
    var PLUGIN_TITLE = 'Kinopoisk CX';
    var BTN_CLASS = 'kp-plugin-btn';
    var CONTAINER_SELECTOR = '.full-start-new__buttons';
    var FALLBACK_DELAY_MS = 500;   // повторный поиск контейнера, если ещё не отрендерился
    var FALLBACK_MAX_TRIES = 3;    // максимум повторов на один рендер карточки

    // ---------------------------------------------------------------
    // Вспомогательные функции (ES5)
    // ---------------------------------------------------------------

    // ES5-совместимая проверка «только цифры» (без String()/префиксов ES6)
    function isNumeric(value) {
        var s;
        if (value === null || value === undefined) return false;
        s = '' + value;
        return /^\d+$/.test(s);
    }

    // ---------------------------------------------------------------
    // Формирование ссылки на Кинопоиск (зеркало .cx) по ID и типу
    // id — числовой ID Кинопоиска
    // type — 'movie' или 'tv'
    // ---------------------------------------------------------------
    function buildKinopoiskUrlFromId(id, type) {
        var path;
        var url;
        if (!id) return '';

        path = (type === 'tv' ? 'series' : 'film') + '/' + id + '/';
        url = 'https://www.kinopoisk.ru/' + path;

        // Подмена домена .ru на .cx (зеркало)
        url = url.replace('.ru/', '.cx/');

        return url;
    }

    // ---------------------------------------------------------------
    // Формирование ссылки из объекта карточки (full)
    // Проверяет movie.kinopoisk_id, затем movie.id
    // ---------------------------------------------------------------
    function buildKinopoiskUrlFromMovie(movie) {
        var id;
        var type;
        if (!movie) return '';

        id = movie.kinopoisk_id || movie.id || 0;
        if (!id) return '';

        type = movie.type || 'movie';

        return buildKinopoiskUrlFromId(id, type);
    }

    // ---------------------------------------------------------------
    // Формирование поисковой ссылки по названию
    // query — текстовый запрос
    // ---------------------------------------------------------------
    function buildSearchUrl(query) {
        if (!query) return '';
        return 'https://www.kinopoisk.cx/index.php?kp_query=' + encodeURIComponent(query);
    }

    // ---------------------------------------------------------------
    // Временное поведение: вывод итогового URL (MVP)
    // Позже здесь будет реальное открытие страницы в среде Lampa
    // ---------------------------------------------------------------
    function openKinopoiskPage(url) {
        if (!url) {
            Lampa.Noty.show('Не удалось сформировать ссылку на Кинопоиск');
            return;
        }

        Lampa.Noty.show(url);
        console.log('[KP Plugin] URL:', url);
    }

    // ---------------------------------------------------------------
    // Обработка строки ручного ввода: цифры -> ссылка на фильм/сериал,
    // текст -> поисковая ссылка
    // ---------------------------------------------------------------
    function handleManualInput(text) {
        var value;
        if (text === null || text === undefined) return;

        // Безопасно приводим к строке: коллбэки Lampa могут передать не строку
        value = ('' + text).replace(/^\s+|\s+$/g, '');
        if (!value) return;

        if (isNumeric(value)) {
            // Только цифры — предполагаем ID Кинопоиска, уточняем тип
            askTypeForId(value);
        } else {
            openKinopoiskPage(buildSearchUrl(value));
        }
    }

    // ---------------------------------------------------------------
    // Выбор типа для числового ID: фильм или сериал
    // ---------------------------------------------------------------
    function askTypeForId(id) {
        Lampa.Select.show({
            title: 'Что открыть по ID ' + id + '?',
            items: [
                { title: 'Фильм', value: 'movie' },
                { title: 'Сериал', value: 'tv' }
            ],
            onBack: function () {},
            onSelect: function (item) {
                openKinopoiskPage(buildKinopoiskUrlFromId(id, item.value));
            }
        });
    }

    // ---------------------------------------------------------------
    // Ручной ввод ID или названия.
    // Основной путь — Lampa.Input.edit (проверка на доступность),
    // фолбэк — Lampa.Select.show с типовыми вариантами.
    // ---------------------------------------------------------------
    function showSearchDialog() {
        // Глобальная Lampa доступна и как свойство window, и напрямую;
        // проверяем оба варианта, чтобы не зависеть от области видимости
        var lampa = (typeof Lampa !== 'undefined' && Lampa) ? Lampa : window.Lampa;

        if (lampa && lampa.Input && typeof lampa.Input.edit === 'function') {
            try {
                lampa.Input.edit({
                    title: 'ID или название Кинопоиска',
                    value: '',
                    free: true,
                    onChange: function (value) {
                        // Промежуточное значение — ничего не делаем
                    },
                    onComplete: function (value) {
                        handleManualInput(value);
                    }
                });
                return;
            } catch (err) {
                console.log('[KP Plugin] Lampa.Input.edit вызвался с ошибкой:', err);
            }
        }

        // Фолбэк: выбор из подготовленных вариантов
        Lampa.Select.show({
            title: 'Ввод ID или названия',
            items: [
                { title: 'Открыть пример: фильм по ID', value: 'demo_film' },
                { title: 'Открыть пример: поиск по названию', value: 'demo_search' },
                { title: 'Отмена', value: 'cancel' }
            ],
            onBack: function () {},
            onSelect: function (item) {
                if (item.value === 'demo_film') {
                    openKinopoiskPage(buildKinopoiskUrlFromId('1331649', 'movie'));
                } else if (item.value === 'demo_search') {
                    openKinopoiskPage(buildSearchUrl('Медленные лошади'));
                }
            }
        });
        Lampa.Noty.show('Ручной ввод недоступен: Lampa.Input.edit не найден');
    }

    // ---------------------------------------------------------------
    // Создание кнопки плагина через jQuery (подход как в online_mod.js),
    // без зависимости от шаблона button_default
    // ---------------------------------------------------------------
    function createButton(getUrl) {
        var html;
        var btn;
        var busy = false;

        html = '<div class="full-start__button selector ' + BTN_CLASS + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="2" y="4" width="20" height="16" rx="2"/>' +
            '<line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>' +
            '<line x1="2" y1="12" x2="22" y2="12"/>' +
            '</svg>' +
            '<span>Кинопоиск</span>' +
            '</div>';

        btn = $(html);

        // Нажатие с пульта (D-Pad) и мышью; guard против двойного срабатывания
        var onEnter = function () {
            if (busy) return;
            busy = true;
            setTimeout(function () { busy = false; }, 800);

            var url = getUrl();
            if (url) {
                openKinopoiskPage(url);
            } else {
                showSearchDialog();
            }
        };

        btn.on('hover:enter', onEnter);
        btn.on('click', onEnter);

        return btn;
    }

    // ---------------------------------------------------------------
    // Вставка кнопки в контейнер кнопок карточки full.
    // Дубли проверяются по DOM (.kp-plugin-btn внутри контейнера),
    // поэтому повторное открытие карточки не блокируется.
    // tries — счётчик fallback-повторов, если контейнер ещё не готов
    // ---------------------------------------------------------------
    function addButtonToCard(object, tries) {
        var movie;
        var activityRender;
        var container;
        var btn;

        if (!object || !object.movie) return;

        movie = object.movie;

        try {
            activityRender = object.activity && object.activity.render ? object.activity.render() : null;
            if (!activityRender || !activityRender.find) return;

            container = activityRender.find(CONTAINER_SELECTOR);
        } catch (err) {
            container = null;
        }

        if (!container || container.length === 0) {
            // Контейнер ещё не отрендерился — короткий fallback-повтор
            if (tries < FALLBACK_MAX_TRIES) {
                setTimeout(function () {
                    addButtonToCard(object, tries + 1);
                }, FALLBACK_DELAY_MS);
            }
            return;
        }

        // Защита от дублей в текущем рендере карточки
        if (container.find('.' + BTN_CLASS).length > 0) return;

        btn = createButton(function () {
            // Актуальные данные карточки на момент нажатия;
            // если ID нет — getUrl вернёт '' и откроется диалог ввода
            return buildKinopoiskUrlFromMovie(movie);
        });

        container.append(btn);
    }

    // ---------------------------------------------------------------
    // Обработчик события 'full' (подпись подтверждена refs/online_mod.js)
    // ---------------------------------------------------------------
    function onFullCardEvent(e) {
        if (!e || !e.object) return;

        if (e.type === 'complite' || e.type === 'show') {
            addButtonToCard(e.object, 0);
        }
    }

    // ---------------------------------------------------------------
    // Инициализация плагина
    // ---------------------------------------------------------------
    function initPlugin() {
        // Регистрация источника плагина
        if (!Lampa.Api) Lampa.Api = {};
        if (!Lampa.Api.sources) Lampa.Api.sources = {};

        Lampa.Api.sources[PLUGIN_NAME] = {
            name: PLUGIN_NAME,
            title: PLUGIN_TITLE
        };

        // Подписка на готовность приложения
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                onAppReady();
            }
        });

        // Если приложение уже готово — вызываем сразу
        if (window.appready) {
            onAppReady();
        }
    }

    function onAppReady() {
        Lampa.Listener.follow('full', onFullCardEvent);
        Lampa.Noty.show('Плагин ' + PLUGIN_TITLE + ' загружен');
    }

    // ---------------------------------------------------------------
    // Точка входа
    // ---------------------------------------------------------------
    initPlugin();

})();
