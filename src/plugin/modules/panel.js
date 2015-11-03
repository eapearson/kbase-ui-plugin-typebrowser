/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'bluebird',
    'kb_common_html',
    'kb_common_dom',
    'kb_common_widgetSet'
],
    function (Promise, html, DOM, WidgetSet) {
        'use strict';
        
        function widget(config) {
            var mount, container, runtime = config.runtime,
                widgetSet = WidgetSet.make({runtime: runtime});

            function render() {
                // Render panel
                var div = html.tag('div'),
                    panel = html.panel;
                var panel = div({class: 'kbase-view kbase-typebrowser-view container-fluid', 'data-kbase-view': 'typebrowser'}, [
                    div({class: 'row'}, [
                        div({class: 'col-sm-12'}, [
                            panel('Type Browser',
                                div({id: widgetSet.addWidget('typebrowser')})
                            )
                        ])
                    ])
                ]);
                return {
                    title: 'Type Browser for ' + runtime.service('session').getUsername(),
                    content: panel
                };
            }

            var rendered = render();

            // Widget API
            function init() {
                return Promise.try(function () {
                    return widgetSet.init(config);
                });
            }
            function attach(node) {
                return Promise.try(function () {
                    mount = node;
                    container = DOM.createElement('div');
                    mount.appendChild(container);
                    container.innerHTML = html.flatten(rendered.content);
                    runtime.send('ui', 'setTitle', rendered.title);
                    return widgetSet.attach(node);
                });
            }
            function start(params) {
                return widgetSet.start(params);
            }
            function run(params) {
                return widgetSet.run(params);
            }
            function stop() {
                return widgetSet.stop();
            }
            function detach() {
                return Promise.try(function () {
                    mount.removeChild(container);
                    container = null;
                    return widgetSet.detach();
                })
            }
            function destroy() {
                return widgetSet.destroy();
            }

            return {
                init: init,
                attach: attach,
                detach: detach,
                start: start,
                run: run,
                stop: stop,
                destroy: destroy
            };
        }

        return {
            make: function (config) {
                return widget(config);
            }
        };
    });