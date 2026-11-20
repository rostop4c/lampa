(function () {
    'use strict';

    // ================================================================
    // Плагин: Kinopoisk CX (MVP)
    // Назначение: добавляет кнопку в карточку фильма/сериала,
    // формирует ссылку на Кинопоиск с заменой домена .ru -> .cx
    // и открывает страницу в интерфейсе Lampa.
    // ================================================================

    var PLUGIN_NAME = 'kinopoisk_cx';
    var PLUGIN_TITLE = 'Kinopoisk CX';

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

    // ---------------------------------------------------------------
    // Формирование ссылки на Кинопоиск (зеркало .cx)
    // movie.type: 'movie' -> /film/<id>/, 'tv' -> /series/<id>/
    // movie.kinopoisk_id — ID на Кинопоиске
    // ---------------------------------------------------------------
    function buildKinopoiskUrl(movie) {
        var id = movie.kinopoisk_id || movie.id || 0;
        if (!id) return '';

        var type = movie.type || 'movie';
        var path = (type === 'tv' ? 'series' : 'film') + '/' + id + '/';
        var url = 'https://www.kinopoisk.ru/' + path;

        // Подмена домена .ru на .cx (зеркало)
        url = url.replace('.ru/', '.cx/');

        return url;
    }

    // ---------------------------------------------------------------
    // Открытие страницы Кинопоиска
    // На данном этапе (MVP) выводим уведомление с адресом.
    // В будущем здесь можно использовать:
    //   - Lampa.WebView или встроенный браузер (если доступен в API Lampa)
    //   - Lampa.Activity.push({url: ..., component: 'webview', ...})
    //   - Открытие внешнего плеера/браузера через Lampa.Player или системный Intent
    // ---------------------------------------------------------------
    function openKinopoiskPage(url) {
        if (!url) {
            Lampa.Noty.show('Не удалось сформировать ссылку на Кинопоиск');
            return;
        }

        Lampa.Noty.show('Открываю: ' + url);

        // TODO: Реализовать реальное открытие страницы в среде Lampa.
        // Пример возможного подхода (нужно уточнить API Lampa):
        // Lampa.Activity.push({
        //     url: url,
        //     title: 'Kinopoisk CX',
        //     component: 'webview' // или другой компонент просмотра веб-страниц
        // });
    }

    // ---------------------------------------------------------------
    // Ввод названия или ID Кинопоиска (ручной поиск)
    // ---------------------------------------------------------------
    function showSearchDialog() {
        Lampa.Select.show({
            title: 'Поиск по Кинопоиску',
            items: [
                { title: 'Ввести ID Кинопоиска', value: 'id' },
                { title: 'Ввести название', value: 'title' }
            ],
            onBack: function () {},
            onSelect: function (item) {
                if (item.value === 'id') {
                    // Заглушка: в реальном плагине здесь должен быть диалог ввода текста
                    Lampa.Noty.show('Ввод ID вручную будет реализован в следующей версии');
                } else if (item.value === 'title') {
                    Lampa.Noty.show('Поиск по названию будет реализован в следующей версии');
                }
            }
        });
    }

    // ---------------------------------------------------------------
    // Добавление кнопки в карточку фильма/сериала (full)
    // ---------------------------------------------------------------
    function addButtonToCard(object) {
        // object.movie содержит данные карточки
        var movie = object && object.movie ? object.movie : {};
        if (!movie.id) return;

        var url = buildKinopoiskUrl(movie);
        if (!url) return;

        // Создаём кнопку (элемент интерфейса)
        // Используем шаблон кнопки Lampa или создаём свой элемент
        var btn = Lampa.Template.get('button_default', {
            title: 'Kinopoisk CX',
            icon: 'film'
        }, true);

        if (!btn) return;

        // Обработчик нажатия (D-Pad / пульт)
        btn.on('hover:enter', function () {
            openKinopoiskPage(url);
        });

        // Добавляем кнопку в компонент карточки
        // В реальной интеграции нужно найти контейнер карточки (full)
        // и добавить btn в нужное место.
        // Пример (нужно уточнить селектор/компонент в конкретной версии Lampa):
        // Lampa.Component.find('.full__actions').append(btn);
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

        // Подписка на события приложения (пример из kp_source.js)
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
        // Здесь можно подписаться на открытие карточки (full)
        // и добавлять кнопку динамически.
        // Пример (нужно уточнить имя события в конкретной версии Lampa):
        // Lampa.Listener.follow('full', function (e) {
        //     if (e.type === 'show' && e.object) {
        //         addButtonToCard(e.object);
        //     }
        // });

        Lampa.Noty.show('Плагин Kinopoisk CX загружен (MVP)');
    }

    // ---------------------------------------------------------------
    // Точка входа
    // ---------------------------------------------------------------
    initPlugin();

})();

