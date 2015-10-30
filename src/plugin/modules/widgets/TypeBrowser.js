/*global
 define, require
 */
/*jslint
 browser: true,
 white: true
 */
define([
    'jquery',
    'bluebird',
    'kb_common_html',
    'kb_service_workspace',
    'datatables_bootstrap'
], function ($, Promise, html, Workspace) {
    'use strict';

    function widget(config) {
        var mount, container, runtime = config.runtime,
            tableId;

        function renderer() {
            return new Promise(function (resolve, reject) {
                var workspace = new Workspace(runtime.getConfig('services.workspace.url'), {
                    token: runtime.service('session').getAuthToken()
                }),
                    a = html.tag('a');
                Promise.resolve(workspace.list_all_types({
                    with_empty_modules: 1
                }))
                    .then(function (data) {
                        // Flatt out the types.
                        // var rows = [];
                        var typeRecords = {},
                            getinfo = [];
                        Object.keys(data).forEach(function (moduleName) {
                            // list_all_types above returns a map of module.typeName to the latest version.
                            var types = data[moduleName];
                            Object.keys(types).forEach(function (typeName) {
                                var type = runtime.service('types').makeType({
                                    module: moduleName,
                                    name: typeName,
                                    version: types[typeName]
                                }),
                                    typeId = runtime.service('types').makeTypeId(type);
                                //rows.push([
                                //    moduleName, typeName, a({href: '#spec/type/' + typeId}, types[typeName])
                                //]);
                                // Each type is put into a map simply to create a set.
                                typeRecords[typeId] = {
                                    type: type
                                };
                                getinfo.push(Promise.resolve(workspace.get_type_info(typeId)));
                            });
                        });

                        return [typeRecords, Promise.all(getinfo)];
                    })
                    .spread(function (typeRecords, results) {
                        results.forEach(function (result) {
                            var typeId = result.type_def;
                            typeRecords[typeId].info = result;
                        });
                        tableId = html.genId();
                        var rows = Object.keys(typeRecords).map(function (typeId) {
                            var typeRecord = typeRecords[typeId];
                            return [
                                typeRecord.type.module, typeRecord.type.name,
                                runtime.service('types').getIcon({
                                    type: typeRecord.type,
                                    size: 'medium'
                                }).html,
                                a({href: '#spec/type/' + typeId}, runtime.service('types').makeVersion(typeRecord.type)),
                                typeRecord.info.using_type_defs.map(function (typeId) {
                                    return a({href: '#spec/type/' + typeId}, typeId);
                                }).join('<br>'),
                                typeRecord.info.used_type_defs.map(function (typeId) {
                                    return a({href: '#spec/type/' + typeId}, typeId);
                                }).join('<br>'),
                                typeRecord.info.using_func_defs.map(function (functionId) {
                                    return a({href: '#spec/functions/' + functionId}, functionId);
                                }).join('<br>'),
                                a({href: '#databrowser?type=' + typeId}, 'browse')

                            ];
                        }),
                            cols = ['Module', 'Type', 'Icon', 'Version', 'Using types', 'Used by types', 'Used by functions', 'Objects'],
                            result = html.makeTable({columns: cols, rows: rows, id: tableId, class: 'table table-striped'});
                        resolve({
                            title: 'Type Browser',
                            content: result,
                            children: []
                        });
                    })
                    .catch(function (err) {
                        console.log('ERROR getting type info');
                        console.log(err);
                        reject({
                            title: 'Error',
                            content: 'Error getting type info'
                        });
                    });
            });
        }

        function attachDatatable() {
            $('#' + tableId).dataTable({
                initComplete: function (settings) {
                    var api = this.api(),
                        rowCount = api.data().length,
                        pageSize = api.page.len(),
                        wrapper = api.settings()[0].nTableWrapper;
                    if (rowCount <= pageSize) {
                        $(wrapper).find('.dataTables_paginate').closest('.row').hide();
                        $(wrapper).find('.dataTables_filter').closest('.row').hide();
                    }
                    $(settings.nTable).removeClass('hide');
                }
            });
        }

        // API
        function attach(node) {
            return new Promise(function (resolve, reject) {
                mount = node;
                container = document.createElement('div');
                mount.appendChild(container);

                container.innerHTML = 'Loading KBase Types from the Workspace Service ...' + html.loading();

                renderer()
                    .then(function (rendered) {
                        container.innerHTML = rendered.content;
                        runtime.send('ui', 'setTitle', rendered.title);

                        attachDatatable();
                        // create widgets.
                        // no children for now (see kbaseSimplePanel for how to do this)
                        resolve();
                    })
                    .catch(function (err) {
                        if (err.title) {
                            container.innerHTML = err.content;
                            runtime.send('ui', 'setTitle', err.title);
                        }
                        console.log('ERROR rendering widget');
                        console.log(err);
                        reject(err);
                    })
                    .done();
            });
        }

        function start() {
        }
        function stop() {
        }
        function detach() {
            mount.removeChild(container);
            container.innerHTML = '';
            container = null;
        }
        return {
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };
    }

    return {
        make: function (config) {
            return widget(config);
        }
    };

});