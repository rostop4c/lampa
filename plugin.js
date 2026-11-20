(function () {
    'use strict';

    // ================================================================
    // Плагин: Kinopoisk CX (MVP)
    // Назначение: добавляет кнопку в карточку фильма/сериала (full),
    // формирует ссылку на Кинопоиск с заменой домена .ru -> .cx,
    // поддерживает ручной ввод ID или названия.
    // ================================================================

    var PLUGIN_NAME = 'kinopoisk_cx';
    var PLUGIN_TITLE = 'Kinopoisk CX';

    // Список ID карточек, в которые уже добавлена кнопка (защита от дублей)
    var addedButtonMovieIds = [];

    // ---------------------------------------------------------------
    // Вспомогательные функции (ES5)
    // ---------------------------------------------------------------

    function startsWith(str, searchString) {
        return str.lastIndexOf(searchString, 0) === 0;
    }

    function endsWith(str, searchString) {
        var start = str.length - searchString.length;
        if (start < 0) return false;
        return str.indexOf(searchString, start) === start;
    }

    function isNumeric(str) {
        var i;
        if (typeof str !== 'string') return false;
        if (str.length === 0) return false;
        for (i = 0; i < str.length; i++) {
            if (str.charAt(i) < '0' || str.charAt(i) > '9') return false;
        }
        return true;
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
    // Формирование ссылки на Кинопоиск из объекта карточки (full)
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
        var url;
        if (!query) return '';

        url = 'https://www.kinopoisk.cx/index.php?kp_query=' + encodeURIComponent(query);
        return url;
    }

    // ---------------------------------------------------------------
    // Временное поведение: вывод итогового URL (MVP)
    // Später здесь будет реальное открытие страницы/окна просмотра
    // ---------------------------------------------------------------
    function openKinopoiskPage(url) {
        if (!url) {
            Lampa.Noty.show('Не удалось сформировать ссылку на Кинопоиск');
            return;
        }

        Lampa.Noty.show(url);
        console.log('[KP Plugin] URL:', url);

        // TODO: Реализовать реальное открытие страницы в среде Lampa.
        // Пример возможного подхода (нужно уточнить API Lampa):
        // Lampa.Activity.push({
        //     url: url,
        //     title: 'Kinopoisk CX',
        //     component: 'webview'
        // });
    }

    // ---------------------------------------------------------------
    // Ручной ввод ID Кинопоиска или названия
    // Использует только Lampa.Select.show (реально presenti в refs/).
    // ВНИМАНИЕ: Lampa.Input.edit НЕ найден в refs/, поэтому полноценный
    // диалог ввода текста пока не реализован. Логика формирования URL
    // готова — остаётся только получить строку от пользователя.
    // ---------------------------------------------------------------
    function showSearchDialog() {
        Lampa.Select.show({
            title: 'Ввод ID или названия',
            items: [
                { title: 'Ввести ID Кинопоиска (цифры)', value: 'id' },
                { title: 'Ввести название', value: 'title' },
                { title: 'Отмена', value: 'cancel' }
            ],
            onBack: function () {},
            onSelect: function (item) {
                if (item.value === 'cancel') {
                    return;
                }
                if (item.value === 'id') {
                    // Заглушка: в refs/ нет Lampa.Input.edit для ввода текста.
                    // Реальный ввод ID требует компонента ввода, которого нет в примерах.
                    Lampa.Noty.show('Текстовый ввод ID требует Lampa.Input.edit (не найден в refs/)');
                    Lampa.Noty.show('Пример URL: https://www.kinopoisk.cx/film/1331649/');
                } else if (item.value === 'title') {
                    Lampa.Noty.show('Текстовый ввод названия требует Lampa.Input.edit (не найден в refs/)');
                    Lampa.Noty.show('Пример URL: https://www.kinopoisk.cx/index.php?kp_query=Медленные+лошади');
                }
            }
        });
    }
                }
            }
        });
    }

    // ---------------------------------------------------------------
    // Создание кнопки плагина (DOM-элемент через Lampa.Template)
    // ---------------------------------------------------------------
    function createButton(url) {
        var btn;
        if (!url) return null;

        // Используем шаблон кнопки Lampa.
        // ВНИМАНИЕ: шаблон 'button_default' не найден в refs/.
        // Если он отсутствует в целевой версии Lampa, кнопка не отобразится.
        btn = Lampa.Template.get('button_default', {
            title: 'Kinopoisk CX',
            icon: 'film'
        }, true);

        if (!btn) return null;

        // Обработчик нажатия пульта (D-Pad) — используется в refs/ (online_mod.js)
        btn.on('hover:enter', function () {
            openKinopoiskPage(url);
        });

        // Также подписываемся на click (стандартное событие, если поддерживается обёрткой Lampa)
        btn.on('click', function () {
            openKinopoiskPage(url);
        });

        return btn;
    }

    // ---------------------------------------------------------------
    // Вставка кнопки в контейнер кнопок полной карточки (full)
    // object — объект карточки из события Lampa.Listener.follow('full', ...)
    // ---------------------------------------------------------------
    function addButtonToCard(object) {
        var movie;
        var url;
        var btn;
        var container;
        var activityRender;
        var i;
        var alreadyAdded;

        if (!object) return;

        movie = object.movie || {};
        if (!movie.id) return;

        // Защита от дублей: если кнопка уже добавлена для этого фильма — не добавляем повторно
        alreadyAdded = false;
        for (i = 0; i < addedButtonMovieIds.length; i++) {
            if (addedButtonMovieIds[i] === movie.id) {
                alreadyAdded = true;
                break;
            }
        }
        if (alreadyAdded) return;

        url = buildKinopoiskUrlFromMovie(movie);
        if (!url) return;

        btn = createButton(url);
        if (!btn) return;

        // Поиск контейнера кнопок карточки full.
        // В refs/ нет готового примера селектора для full-карточки.
        // Пробуем стандартные варианты, используемые в Lampa:
        //   e.object.activity.render().find('.full-start-new__buttons')
        //   или .full__actions
        try {
            activityRender = object.activity && object.activity.render ? object.activity.render() : null;
            if (activityRender && activityRender.find) {
                container = activityRender.find('.full-start-new__buttons');
                if (!container || container.length === 0) {
                    container = activityRender.find('.full__actions');
                }
                if (!container || container.length === 0) {
                    container = activityRender.find('.full-buttons');
                }
            }
        } catch (err) {
            container = null;
        }

        if (container && container.append) {
            container.append(btn);
            addedButtonMovieIds.push(movie.id);
        } else {
            // Если контейнер не найден — кнопка не вставлена, сохраняем ID чтобы не пытаться повторно
            addedButtonMovieIds.push(movie.id);
            Lampa.Noty.show('Контейнер кнопок full не найден. Кнопка не добавлена.');
        }
    }

    // ---------------------------------------------------------------
    // Обработчик открытия карточки full
    // ---------------------------------------------------------------
    function onFullCardShow(e) {
        if (!e) return;
        if (e.type === 'show' && e.object) {
            addButtonToCard(e.object);
        }
    }

    // ---------------------------------------------------------------
    // Инициализация плагина
    // ---------------------------------------------------------------
    function initPlugin() {
        // Регистрация источника/плагина (пример из kp_source.js)
        if (!Lampa.Api) Lampa.Api = {};
        if (!Lampa.Api.sources) Lampa.Api.sources = {};

        Lampa.Api.sources[PLUGIN_NAME] = {
            name: PLUGIN_NAME,
            title: PLUGIN_TITLE
        };

        // Подписка на событие готовности приложения (пример из kp_source.js)
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
        // Подписка на открытие карточки full.
        // ВНИМАНИЕ: событие 'full' не найдено в refs/. Это стандартное имя события Lampa,
        // но его точная сигнатура (e.type, e.object) может отличаться в целевой версии.
        Lampa.Listener.follow('full', onFullCardShow);

        Lampa.Noty.show('Плагин Kinopoisk CX загружен (MVP)');
    }

    // ---------------------------------------------------------------
    // Точка входа
    // ---------------------------------------------------------------
    initPlugin();

})();

